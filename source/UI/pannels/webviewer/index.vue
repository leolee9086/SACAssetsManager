<template>
  <div class="web-viewer" ref="webViewerRef">
    <!-- 控制栏 -->
    <div class="control-bar">
      <button @click="goBack" :disabled="!canGoBack">
        <svg><use xlink:href="#iconLeft"></use></svg>
      </button>
      <button @click="goForward" :disabled="!canGoForward">
        <svg><use xlink:href="#iconRight"></use></svg>
      </button>
      <UrlInput
        v-model="currentUrl"
        @enter="loadUrl"
      />
      <button @click="reload">
        <svg><use xlink:href="#iconRefresh"></use></svg>
      </button>
    </div>

    <!-- 网页容器 -->
    <webview
      ref="webviewRef"
      class="webview"
      :src="currentUrl"
      @did-navigate="handleNavigation"
      @did-navigate-in-page="handleInPageNavigation"
      @will-navigate="handleWillNavigate"
      @new-window="handleNewWindow"
      @page-title-updated="updateTitle"
      @contextmenu="handleContextMenu"
    ></webview>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import UrlInput from '../../components/UrlInput.vue';
import { createContextMenu } from './menu.js';  // 新增导入

// 状态管理
const currentUrl = ref('');
const history = ref([]);
const currentIndex = ref(-1);

// 引用
const webviewRef = ref(null);
const webViewerRef = ref(null);

// 计算属性
const canGoBack = computed(() => currentIndex.value > 0);
const canGoForward = computed(() => currentIndex.value < history.value.length - 1);

// 方法
const loadUrl = (url) => {
  const validUrl = normalizeUrl(url);
  
  // 仅当URL实际变化时才更新
  if (validUrl !== currentUrl.value) {
    history.value = history.value.slice(0, currentIndex.value + 1);
    history.value.push(validUrl);
    currentIndex.value = history.value.length - 1;
    currentUrl.value = validUrl;
  }
};

const goBack = () => {
  if (canGoBack.value) {
    currentIndex.value--;
    currentUrl.value = history.value[currentIndex.value];
  }
};

const goForward = () => {
  if (canGoForward.value) {
    currentIndex.value++;
    currentUrl.value = history.value[currentIndex.value];
  }
};

const reload = () => {
  webviewRef.value.reload();
};

const handleNavigation = (event) => {
  currentUrl.value = event.url;
};

const updateTitle = (event) => {
  document.title = event.title;
};

const handleContextMenu = (event) => {
  if (!window.require) return;
  
  const remote = window.require('@electron/remote');
  // 调用独立的菜单创建函数
  const menu = createContextMenu({
    remote,
    webviewRef: webviewRef.value,
    selectionText: event.params.selectionText,
    onShowMask: 显示遮罩
  });

  menu.popup(remote.getCurrentWindow());
};

const 显示遮罩 = () => {
  if (!webViewerRef.value.querySelector(".ovelayer")) {
    let div = document.createElement("div");
    div.setAttribute(
      "style",
      `position:absolute;top:40px;left:0;right:0;bottom:0;background:rgba(0,0,0,0.1);z-index:1`
    );
    div.setAttribute("class", "ovelayer");
    div.addEventListener("mousedown", () => {
      隐藏遮罩();
    });
    webViewerRef.value.appendChild(div);
  }
};

const 隐藏遮罩 = () => {
  const ovelayer = webViewerRef.value.querySelector(".ovelayer");
  if (ovelayer) {
    ovelayer.remove();
  }
};

// 新增导航处理方法
const handleWillNavigate = (event) => {
  console.log(event)
  // 阻止webview自动跳转
  event.preventDefault();
  // 通过我们的路由系统处理跳转
  loadUrl(event.url);
};

const handleNewWindow = (event) => {
  // 处理target="_blank"的链接
  event.preventDefault();
  loadUrl(event.url);
};

const handleInPageNavigation = (event) => {
  // 处理锚点跳转
  currentUrl.value = event.url;
};

// 新增URL标准化方法
const normalizeUrl = (url) => {
  try {
    const urlObj = new URL(url);
    if (!urlObj.protocol.startsWith('http')) {
      return 'about:blank';
    }
    return urlObj.href;
  } catch {
    return url.startsWith('http') ? url : `https://${url}`;
  }
};

// 初始化
onMounted(() => {
  loadUrl('https://www.example.com');
  webviewRef.value.addEventListener('context-menu', handleContextMenu);
  webviewRef.value.addEventListener('will-navigate', handleWillNavigate);
  webviewRef.value.addEventListener('new-window', handleNewWindow);

  // 添加遮罩相关的事件监听
  document.addEventListener('mousedown', () => {
    显示遮罩();
  }, true);

  document.addEventListener('mouseup', () => {
    隐藏遮罩();
  }, true);

  // 窗口大小变化时调整遮罩大小
  window.addEventListener('resize', () => {
    const ovelayer = webViewerRef.value.querySelector(".ovelayer");
    if (ovelayer) {
      ovelayer.style.width = `${webViewerRef.value.clientWidth}px`;
      ovelayer.style.height = `${webViewerRef.value.clientHeight - 40}px`;
    }
  });
});
</script>

<style scoped>
.web-viewer {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.control-bar {
  display: flex;
  gap: 8px;
  padding: 4px 8px;
  background-color: var(--b3-theme-background);
  border-bottom: 1px solid var(--b3-border-color);
  position: relative;
}

.url-input {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid var(--b3-border-color);
  border-radius: 4px;
  background-color: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
}

button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: none;
  background-color: transparent;
  color: var(--b3-theme-on-background);
  cursor: pointer;
  border-radius: 4px;
}

button:hover {
  background-color: var(--b3-theme-hover);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.webview {
  flex: 1;
  border: none;
  background-color: var(--b3-theme-background);
  max-height: calc(100% - 40px);
}

.ovelayer {
  position: absolute;
  top: 40px;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.1);
  z-index: 1;
}
</style> 