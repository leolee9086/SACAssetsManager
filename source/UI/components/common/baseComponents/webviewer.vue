<template>
  <div class="web-viewer cc-column cc-flex-1">
    <!-- 导航栏 -->
    <div class="web-viewer__navbar cc-row cc-items-center cc-gap-sm cc-p-sm">
      <button 
        class="cc-btn cc-btn--icon" 
        @click="goBack" 
        :disabled="!canGoBack"
      >
        ◀
      </button>
      <button 
        class="cc-btn cc-btn--icon" 
        @click="goForward" 
        :disabled="!canGoForward"
      >
        ▶
      </button>
      <button 
        class="cc-btn cc-btn--icon" 
        @click="reload" 
        :class="{ 'loading': isLoading }"
      >
        ↻
      </button>
      
      <div class="url-bar cc-row cc-flex-1 cc-items-center">
        <input 
          type="text" 
          v-model="currentUrl"
          @keyup.enter="loadUrl"
          class="cc-input cc-flex-1"
          placeholder="输入URL..."
        >
        <div class="security-info" :title="securityInfo">
          {{ isSecure ? '🔒' : '🔓' }}
        </div>
      </div>
    </div>

    <!-- webview 容器 -->
    <div class="web-viewer__content cc-flex-1">
      <webview
        ref="webview"
        :src="initialUrl"
        :preload="preloadScript"
        :webpreferences="webPreferences"
        class="web-viewer__webview"
        @dom-ready="handleDomReady"
        @did-start-loading="handleStartLoading"
        @did-stop-loading="handleStopLoading"
        @did-fail-load="handleLoadError"
        @new-window="handleNewWindow"
        @page-title-updated="handleTitleUpdate"
        @page-favicon-updated="handleFaviconUpdate"
      />
    </div>

    <!-- 加载进度条 -->
    <div 
      v-show="isLoading" 
      class="web-viewer__progress"
      :style="{ width: `${loadingProgress}%` }"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import path from 'path';

const props = defineProps({
  initialUrl: {
    type: String,
    default: 'about:blank'
  }
});

const emit = defineEmits([
  'update:url',
  'title-change',
  'favicon-change',
  'load-error',
  'new-window',
  'context-menu'
]);

// 状态管理
const webview = ref(null);
const currentUrl = ref(props.initialUrl);
const isLoading = ref(false);
const loadingProgress = ref(0);
const canGoBack = ref(false);
const canGoForward = ref(false);
const isSecure = ref(false);
const securityInfo = ref('');

// webview 配置
const preloadScript = path.join(__dirname, 'preload.js');
const webPreferences = {
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  webSecurity: true,
  allowRunningInsecureContent: false
};

// 导航方法
const goBack = () => webview.value?.goBack();
const goForward = () => webview.value?.goForward();
const reload = () => webview.value?.reload();

const loadUrl = () => {
  let url = currentUrl.value;
  
  // URL 格式化
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  
  try {
    new URL(url);
    webview.value?.loadURL(url);
  } catch (e) {
    // 如果不是有效URL，尝试搜索
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(currentUrl.value)}`;
    webview.value?.loadURL(searchUrl);
  }
};

// 事件处理
const handleDomReady = () => {
  // 注入自定义CSS
  webview.value?.insertCSS(`
    /* 自定义样式，比如滚动条等 */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 4px;
    }
  `);

  // 更新导航状态
  canGoBack.value = webview.value?.canGoBack();
  canGoForward.value = webview.value?.canGoForward();
  
  // 获取安全信息
  const certificate = webview.value?.getWebContents()?.getCertificate();
  isSecure.value = certificate && webview.value?.getURL().startsWith('https://');
  securityInfo.value = certificate ? 
    `安全连接\n颁发者: ${certificate.issuerName}\n有效期至: ${certificate.validExpiry}` : 
    '不安全的连接';
};

const handleStartLoading = () => {
  isLoading.value = true;
  loadingProgress.value = 0;
  startProgressSimulation();
};

const handleStopLoading = () => {
  isLoading.value = false;
  loadingProgress.value = 100;
  setTimeout(() => {
    loadingProgress.value = 0;
  }, 200);
  
  // 更新当前URL
  currentUrl.value = webview.value?.getURL();
  emit('update:url', currentUrl.value);
};

const handleLoadError = (event) => {
  emit('load-error', {
    errorCode: event.errorCode,
    errorDescription: event.errorDescription,
    url: event.validatedURL
  });
};

const handleNewWindow = (event) => {
  emit('new-window', event.url);
};

const handleTitleUpdate = (event) => {
  emit('title-change', event.title);
};

const handleFaviconUpdate = (event) => {
  emit('favicon-change', event.favicons[0]);
};

// 进度条模拟
let progressInterval;
const startProgressSimulation = () => {
  clearInterval(progressInterval);
  progressInterval = setInterval(() => {
    if (loadingProgress.value < 90) {
      loadingProgress.value += (90 - loadingProgress.value) * 0.1;
    }
  }, 100);
};

// 生命周期
onMounted(() => {
  // 修改上下文菜单处理
  webview.value?.addEventListener('context-menu', (e) => {
    emit('context-menu', {
      x: e.x,
      y: e.y,
      isEditable: e.params.isEditable,
      editFlags: e.params.editFlags,
      mediaType: e.params.mediaType,
      linkURL: e.params.linkURL,
      srcURL: e.params.srcURL
    });
  });
});

onBeforeUnmount(() => {
  clearInterval(progressInterval);
});
</script>

<style scoped>
.web-viewer {
  position: relative;
  background: var(--cc-bg-color);
  border: 1px solid var(--cc-border-color);
  border-radius: var(--cc-radius);
  overflow: hidden;
}

.web-viewer__navbar {
  background: var(--cc-bg-color-light);
  border-bottom: 1px solid var(--cc-border-color);
}

.url-bar {
  background: var(--cc-bg-color);
  border: 1px solid var(--cc-border-color);
  border-radius: var(--cc-radius);
  padding: 0 var(--cc-space-sm);
}

.web-viewer__webview {
  width: 100%;
  height: 100%;
  border: none;
}

.web-viewer__progress {
  position: absolute;
  top: 0;
  left: 0;
  height: 2px;
  background: var(--cc-primary-color);
  transition: width 0.2s ease-out;
}

.security-info {
  padding: 0 var(--cc-space-sm);
  cursor: help;
}

.loading {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
