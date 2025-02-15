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
     preload="file://D:\思源主库\data\plugins\SACAssetsManager\source\UI\pannels\webviewer\inject.js"
      allowpopups="yes"
      webpreferences="
        nativeWindowOpen=yes,
        contextIsolation=no,
        sandbox=no
      "
      @did-attach="handleWebviewAttach"
      @did-navigate="handleNavigation"
      @did-navigate-in-page="handleInPageNavigation"
      @will-navigate="handleWillNavigate"
      @new-window="handleNewWindow"
      @page-title-updated="updateTitle"
    ></webview>
  </div>
</template>

<script setup>
import { ref, computed, onMounted,inject } from 'vue';
import UrlInput from '../../components/UrlInput.vue';
import { createContextMenu } from './menu.js';  // 新增导入
const appData = inject('appData')
console.log(appData)
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
const handleWillNavigate = (e) => {
  e.preventDefault();
  const validUrl = normalizeUrl(e.url);
  
  // 特殊处理知乎的跳转中间页
  if (validUrl.includes('zhihu.com/launch')) {
    const realUrl = new URL(validUrl).searchParams.get('target');
    if (realUrl) {
      return loadUrl(decodeURIComponent(realUrl));
    }
  }
  
  if (validUrl !== currentUrl.value) {
    webviewRef.value.loadURL(validUrl);
    currentUrl.value = validUrl;
  }
};

// 新增webview附加事件处理
const handleWebviewAttach = () => {
  const webview = webviewRef.value;
  
  // 添加右键菜单监听
  webview.addEventListener('context-menu', (event) => {
    try {
      if (!window.require) {
        console.log('window.require 不存在');
        return;
      }
      
      const remote = window.require('@electron/remote');
      console.log('右键菜单事件参数:', event.params);
      
      const menu = createContextMenu({
        remote,
        webviewRef: webview,
        selectionText: event.params?.selectionText || '',
        linkURL: event.params?.linkURL || '',
        srcURL: event.params?.srcURL || '',
        onShowMask: 显示遮罩
      });
      
      if (!menu) {
        console.log('菜单创建失败');
        return;
      }
      
      menu.popup({
        window: remote.getCurrentWindow()
      });
    } catch (error) {
      console.error('右键菜单创建失败:', error);
    }
  });

  // 新增IPC通信监听
  webview.addEventListener('ipc-message', (event) => {
    if (event.channel === 'navigate') {
      const url = event.args[0]
      loadUrl(normalizeUrl(url))
    }
  })

  // 彻底接管窗口创建流程
  webview.addEventListener('did-create-window', (newWindow) => {
    // 递归设置所有子窗口的打开处理器
    newWindow.webContents.setWindowOpenHandler(({ url }) => {
      loadUrl(url);
      return { action: 'deny' };
    });
    
    // 拦截子窗口的导航请求
    newWindow.webContents.on('will-navigate', (e, url) => {
      e.preventDefault();
      loadUrl(url);
    });
  });

  // 强化事件拦截（必须使用addEventListener）
  webview.addEventListener('will-navigate', (e) => {
    e.preventDefault();
    handleWillNavigate(e);
  });

  webview.addEventListener('new-window', (e) => {
    e.preventDefault();
    // 立即处理而不是等待异步
    const validUrl = normalizeUrl(e.url);
    webview.loadURL(validUrl);
  });

  // 拦截所有表单提交
  webview.addEventListener('did-navigate-in-page', (e) => {
    currentUrl.value = e.url;
  });

  webview.addEventListener('did-start-navigation', (e) => {
    // 添加知乎需要的请求头
    if (e.url.includes('zhihu.com')) {
      webview.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      webview.setAttribute('webpreferences', 'nativeWindowOpen=yes, disablewebsecurity=yes');
    }
  });
};

// 修改后的新窗口处理
const handleNewWindow = (event) => {
  const { url, disposition } = event;
  const validUrl = normalizeUrl(url);
  
  // 处理所有可能的打开方式
  switch(disposition) {
    case 'foreground-tab':
    case 'background-tab':
    case 'new-window':
    case 'default':
      loadUrl(validUrl);
      break;
    case 'download':
      // 处理下载逻辑
      break;
    default:
      loadUrl(validUrl);
  }
};

const handleInPageNavigation = (event) => {
  // 处理锚点跳转
  currentUrl.value = event.url;
};

// 新增URL标准化方法
const normalizeUrl = (url) => {
  try {
    const urlObj = new URL(url);
    // 保留原始查询参数
    if (urlObj.hostname.includes('zhihu.com')) {
      return url; // 保持知乎URL完整
    }
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
  const webview = webviewRef.value;
  webview.removeAttribute('src');
  webview.setAttribute('nodeintegration', 'on');
  webview.setAttribute('webpreferences', 'nativeWindowOpen=yes');
  
  // 从 appData 中获取 URL
  const initialUrl = appData?.url || 'https://www.example.com';

  // 直接加载URL
  setTimeout(() => {
    console.log("开始加载")
    console.log(initialUrl)

    loadURL(initialUrl);
    currentUrl.value = initialUrl;
    console.log('加载完成')
  }, 3000);

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