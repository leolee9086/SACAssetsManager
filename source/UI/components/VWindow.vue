<template>
  <!-- 内部内容显示（当不在浮动状态时） -->
  <template v-if="!isFloating">
    <component 
      :is="renderedComponent" 
      v-bind="attrs"
      v-if="renderedComponent"
    />
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
import { ref, watch, onMounted, onUnmounted, h, computed, useAttrs } from 'vue';
import { ComponentSerializer } from '../../../src/toolBox/feature/useVue/useSFC/forComponentSerialize.js';
const { BrowserWindow, getCurrentWindow } = window.require('@electron/remote');

// 不继承属性，我们会手动处理
defineOptions({ inheritAttrs: false });

// 获取所有未在 props 中声明的属性
const attrs = useAttrs();

// 生成组件唯一标识符
const generateId = () => `component-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
// 窗口唯一标识符
const generateWindowId = () => `window-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

// 组件唯一标识符 - 避免多实例冲突
const componentInstanceId = ref(generateId());
// 窗口实例引用
const windowInstance = ref(null);
// 当前窗口ID - 用于通信
const currentWindowId = ref(generateWindowId());
// 新开窗口ID
const newWindowId = ref('');
// 通信频道
const channel = ref(null);

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
  // 组件定义(路径、源码、对象或函数)
  componentDef: {
    type: [String, Object, Function],
    required: true
  },
  // 序列化配置选项
  serializeOptions: {
    type: Object,
    default: () => ({
      includeStyles: true,
      serializeFunctions: true
    })
  },
  // 保留componentPath用于向后兼容
  componentPath: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['close', 'update:isFloating', 'data-updated', 'event']);

// 添加计算属性处理组件定义
const renderedComponent = computed(() => {
  try {
    const def = props.componentDef || props.componentPath;
    if (!def) return null;
    
    // 如果是字符串路径，尝试加载组件
    if (typeof def === 'string') {
      return () => import(def);
    }
    
    // 如果是函数或对象，直接返回
    return def;
  } catch (error) {
    console.error('组件渲染失败:', error);
    return null;
  }
});

/**
 * 创建通信频道
 */
const createChannel = () => {
  const channelName = `vWindow-${componentInstanceId.value}`;
  channel.value = new BroadcastChannel(channelName);
  
  // 设置消息监听
  channel.value.onmessage = (event) => {
    const { type, payload } = event.data;
    
    switch (type) {
      case 'REQUEST_COMPONENT':
        sendComponentData();
        break;
      case 'WINDOW_CLOSED':
        closeWindow();
        break;
      case 'COMPONENT_EVENT':
        handleChildEvent(payload);
        break;
      case 'DATA_UPDATED':
        emit('data-updated', payload.data);
        break;
    }
  };
};

/**
 * 发送组件数据到新窗口
 */
const sendComponentData = () => {
  try {
    // 序列化组件定义
    const def = props.componentDef || props.componentPath;
    
    // 处理 attrs 中的事件处理函数
    const processedAttrs = {};
    const events = {};
    
    // 分离普通属性和事件处理函数
    for (const key in attrs) {
      // Vue事件属性通常以'on'开头并且第三个字符是大写字母 (例如 onClick, onUpdate)
      if (key.startsWith('on') && key.length > 2 && key[2] === key[2].toUpperCase()) {
        // 记录事件名称，供后续触发
        const eventName = key[2].toLowerCase() + key.slice(3); // 转换 onClick -> click
        events[eventName] = true;
      } else {
        // 普通属性直接复制
        processedAttrs[key] = attrs[key];
      }
    }
    
    // 标准化组件定义选项
    const serializationOptions = {
      ...props.serializeOptions,
      baseUrl: window.location.origin,
      // 确保序列化函数
      serializeFunctions: true
    };
    
    const serializedComponent = ComponentSerializer.serialize(def, serializationOptions);
    
    channel.value.postMessage({
      type: 'COMPONENT_DATA',
      payload: {
        sourceWindowId: currentWindowId.value,
        title: props.title,
        serializedComponent,
        componentProps: processedAttrs,
        eventNames: Object.keys(events) // 只传递事件名称清单
      }
    });
  } catch (error) {
    console.error('组件序列化失败:', error);
    channel.value.postMessage({
      type: 'COMPONENT_ERROR',
      payload: { error: error.message }
    });
  }
};

/**
 * 处理从新窗口触发的事件
 */
const handleChildEvent = (eventData) => {
  const { name, data } = eventData;
  
  // 查找对应的事件处理函数
  const handlerPropName = 'on' + name.charAt(0).toUpperCase() + name.slice(1);
  
  if (attrs[handlerPropName] && typeof attrs[handlerPropName] === 'function') {
    // 调用原始处理函数
    attrs[handlerPropName](data);
  }
  
  // 同时触发通用事件
  emit('event', { name, data });
};

/**
 * 创建新窗口并加载内容
 */
const createWindow = async () => {
  try {
    // 创建通信频道
    createChannel();
    
    // 获取当前窗口，用于设置新窗口的相对位置
    const currentWin = getCurrentWindow();
    const [x, y] = currentWin.getPosition();
    
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
        webSecurity: false
      },
      title: props.title,
    });
    
    windowInstance.value = newWindow;
    
    // 移除默认菜单
    newWindow.setMenu(null);
    
    // 传递组件实例ID作为查询参数
    const url = `${window.location.origin}/plugins/SACAssetsManager/source/UI/components/vWindow/window.html?channelId=${componentInstanceId.value}`;
    
    // 加载通用窗口HTML
    await newWindow.loadURL(url);
    
    // 监听窗口关闭事件
    newWindow.on('closed', () => {
      closeWindow();
    });
    
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
      // 检查窗口是否已经被销毁
      if (!windowInstance.value.isDestroyed() && !windowInstance.value.isClosing()) {
        windowInstance.value.close();
      }
    } catch (error) {
      console.error('关闭窗口失败:', error);
    } finally {
      windowInstance.value = null;
    }
  }
  
  // 关闭通信频道
  if (channel.value) {
    channel.value.close();
    channel.value = null;
  }
  
  // 通知父组件状态变化
  emit('close');
  emit('update:isFloating', false);
};

/**
 * 向新窗口发送数据更新
 */
const sendDataToWindow = (data) => {
  if (channel.value) {
    channel.value.postMessage({
      type: 'PARENT_DATA_UPDATE',
      payload: { data }
    });
  }
};

/**
 * 向新窗口发送组件属性更新
 */
const updateComponentProps = (newProps) => {
  if (channel.value) {
    channel.value.postMessage({
      type: 'COMPONENT_PROPS_UPDATE',
      payload: { props: newProps }
    });
  }
};

/**
 * 向新窗口发送事件
 */
const sendEventToWindow = (eventName, eventData) => {
  if (channel.value) {
    channel.value.postMessage({
      type: 'PARENT_EVENT',
      payload: { name: eventName, data: eventData }
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

// 监听attrs变化，同步到新窗口
watch(attrs, (newAttrs) => {
  updateComponentProps({ ...newAttrs });
}, { deep: true });

// 组件卸载时清理资源
onUnmounted(() => {
  closeWindow();
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