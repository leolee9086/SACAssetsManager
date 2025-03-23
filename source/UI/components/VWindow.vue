<template>
  <!-- 内部内容显示（当不在浮动状态时） -->
  <template v-if="!isFloating">
    <slot></slot>
  </template>
  
  <!-- 占位符（当内容在新窗口中显示时） -->
  <div v-else-if="!floatElement" class="v-window-placeholder">
    <button class="v-window-anchor" @click="closeWindow">
      <span>{{ anchorText }}</span>
      <span class="v-window-close-icon">×</span>
    </button>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
const { BrowserWindow, getCurrentWindow } = window.require('@electron/remote');
const { ipcRenderer } = window.require('electron');

const props = defineProps({
  // 是否处于浮动状态
  isFloating: Boolean,
  // 窗口标题
  title: {
    type: String,
    default: '分离窗口'
  },
  // 当内容浮动时的占位符文本
  anchorText: {
    type: String,
    default: '内容已在新窗口显示'
  },
  // 是否浮动整个元素（为true时不显示占位符）
  floatElement: {
    type: Boolean,
    default: false
  },
  // 窗口宽度
  width: {
    type: Number,
    default: 800
  },
  // 窗口高度
  height: {
    type: Number,
    default: 600
  },
  // 窗口是否可调整大小
  resizable: {
    type: Boolean,
    default: true
  },
  // 要传递到新窗口的数据
  windowData: {
    type: Object,
    default: () => ({})
  },
  // 组件文件路径（关键修改点：使用文件路径而非组件对象）
  componentPath: {
    type: String,
    required: true
  },
  // 传递给组件的属性
  componentProps: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['close', 'update:isFloating', 'data-updated', 'event']);

// 窗口实例引用
const windowInstance = ref(null);
// 当前窗口ID - 用于通信
const currentWindowId = ref('');
// 新开窗口ID - 用于通信
const newWindowId = ref('');

// 窗口唯一标识符
const generateWindowId = () => `window-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

/**
 * 创建新窗口并加载内容
 */
const createWindow = async () => {
  try {
    // 获取当前窗口，用于设置新窗口的相对位置
    const currentWin = getCurrentWindow();
    const [x, y] = currentWin.getPosition();
    
    // 为了通信，给每个窗口分配一个唯一ID
    currentWindowId.value = generateWindowId();
    newWindowId.value = generateWindowId();
    
    // 创建新的浏览器窗口
    const newWindow = new BrowserWindow({
      width: props.width,
      height: props.height,
      x: x + 50,
      y: y + 50,
      parent: currentWin,
      resizable: props.resizable,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true,
        preload: window.electron?.preload,
        // 允许文件系统访问，用于动态加载组件
        webSecurity: false
      },
      title: props.title,
    });
    
    windowInstance.value = newWindow;
    
    // 移除默认菜单
    newWindow.setMenu(null);
    
    // 准备组件信息和初始化数据
    const initData = {
      sourceWindowId: currentWindowId.value,
      windowId: newWindowId.value,
      title: props.title,
      // 使用组件路径而不是组件对象
      componentPath: props.componentPath,
      componentProps: props.componentProps,
      componentData: props.windowData,
      // 传递应用根路径，用于解析相对路径
      appRoot: window.location.origin
    };
    
    // 设置窗口加载完成后要执行的操作
    newWindow.webContents.on('did-finish-load', () => {
      // 发送初始化数据到新窗口
      newWindow.webContents.send('window-init', initData);
    });
    
    // 监听窗口关闭事件
    newWindow.on('closed', () => {
      closeWindow();
    });
    const url = window.location.origin + '/plugins/SACAssetsManager/source/UI/components/vWindow/window.html';
    // 加载通用窗口HTML
    await newWindow.loadURL(url);
    newWindow.webContents.openDevTools();
  } catch (error) {
    console.error('创建窗口失败:', error);
    closeWindow();
  }
};

/**
 * 关闭窗口并清理资源
 */
const closeWindow = () => {
  if (windowInstance.value) {
    try {
      // 清理前向新窗口发送关闭信号
      windowInstance.value.webContents.send('window-close');
      windowInstance.value.close();
    } catch (error) {
      console.error('关闭窗口失败:', error);
    }
    windowInstance.value = null;
  }
  
  // 清理通信ID
  currentWindowId.value = '';
  newWindowId.value = '';
  
  // 通知父组件状态变化
  emit('close');
  emit('update:isFloating', false);
};

/**
 * 设置数据同步的IPC通信监听器
 */
const setupIpcListeners = () => {
  // 处理从新窗口发回的数据更新
  ipcRenderer.on('window-data-update', (event, data) => {
    if (data.targetWindowId === currentWindowId.value) {
      // 将数据变更传递给父组件
      emit('data-updated', data.updatedData);
    }
  });
  
  // 处理从新窗口发回的通用事件
  ipcRenderer.on('window-event', (event, data) => {
    if (data.targetWindowId === currentWindowId.value) {
      // 触发事件
      emit('event', {
        name: data.eventName,
        data: data.eventData
      });
    }
  });
  
  // 处理窗口关闭事件
  ipcRenderer.on('window-closed', (event, data) => {
    if (data.sourceWindowId === newWindowId.value) {
      closeWindow();
    }
  });
};

/**
 * 移除IPC监听器
 */
const removeIpcListeners = () => {
  ipcRenderer.removeAllListeners('window-data-update');
  ipcRenderer.removeAllListeners('window-event');
  ipcRenderer.removeAllListeners('window-closed');
};

/**
 * 向新窗口发送数据更新
 */
const sendDataToWindow = (data) => {
  if (windowInstance.value && newWindowId.value) {
    windowInstance.value.webContents.send('parent-data-update', {
      targetWindowId: newWindowId.value,
      updatedData: data
    });
  }
};

/**
 * 向新窗口发送组件属性更新
 */
const updateComponentProps = (newProps) => {
  if (windowInstance.value && newWindowId.value) {
    windowInstance.value.webContents.send('component-props-update', {
      targetWindowId: newWindowId.value,
      componentProps: newProps
    });
  }
};

/**
 * 向新窗口发送事件
 */
const sendEventToWindow = (eventName, eventData) => {
  if (windowInstance.value && newWindowId.value) {
    windowInstance.value.webContents.send('parent-event', {
      targetWindowId: newWindowId.value,
      eventName,
      eventData
    });
  }
};

// 暴露给父组件的方法
defineExpose({
  closeWindow,
  sendDataToWindow,
  updateComponentProps,
  sendEventToWindow
});

// 监听浮动状态变化
watch(() => props.isFloating, async (newValue) => {
  if (newValue) {
    // 进入浮动状态：创建新窗口
    createWindow();
  } else {
    // 退出浮动状态：关闭窗口
    closeWindow();
  }
}, { immediate: true });

// 监听windowData变化，同步到新窗口
watch(() => props.windowData, (newData) => {
  if (windowInstance.value && newWindowId.value) {
    sendDataToWindow(newData);
  }
}, { deep: true });

// 监听componentProps变化，同步到新窗口
watch(() => props.componentProps, (newProps) => {
  if (windowInstance.value && newWindowId.value) {
    updateComponentProps(newProps);
  }
}, { deep: true });

// 组件挂载时设置通信
onMounted(() => {
  setupIpcListeners();
});

// 组件卸载时清理资源
onUnmounted(() => {
  closeWindow();
  removeIpcListeners();
});
</script>

<style scoped>
/* 样式部分保持不变 */
.v-window-placeholder {
  background-color: #f5f5f5;
  border-radius: 6px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  padding: 15px;
  margin: 20px 0;
  text-align: center;
}

.v-window-anchor {
  padding: 10px 15px;
  background-color: #e8f4fc;
  color: #0078d7;
  border: 1px dashed #0078d7;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  justify-content: center;
  transition: all 0.2s ease;
}

.v-window-anchor:hover {
  background-color: #d0e8f8;
}

.v-window-close-icon {
  font-size: 18px;
  font-weight: bold;
}
</style> 