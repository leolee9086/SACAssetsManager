<template>
  <Teleport :to="teleportTarget" :disabled="!isFloating">
    <div v-if="isFloating" class="v-float-container">
      <slot></slot>
    </div>
    <div v-else>
      <slot></slot>
    </div>
  </Teleport>
  <div v-if="isFloating && !floatElement" class="v-float-placeholder">
    <button class="v-float-anchor" @click="close">
      <span>{{ anchorText }}</span>
      <span class="v-float-close-icon">×</span>
    </button>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { clientApi } from "../../asyncModules.js";

const props = defineProps({
  isFloating: Boolean,
  title: {
    type: String,
    default: '浮动面板'
  },
  anchorText: {
    type: String,
    default: '内容已浮动显示'
  },
  floatElement: {
    type: Boolean,
    default: false
  },
  width: {
    type: String,
    default: '380px'
  },
  height: {
    type: String,
    default: '520px'
  },
  transparent: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['close', 'update:isFloating']);

// 创建唯一的浮动容器ID
const floatContainerId = ref(`float-container-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
const teleportTarget = ref(null);
const dialog = ref(null);

// 创建浮动对话框
const createFloatDialog = () => {
  // 确保先清理任何现有的对话框
  destroyDialog();
  
  // 生成新的容器ID以确保唯一性
  floatContainerId.value = `float-container-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  // 创建新的对话框
  const newDialog = new clientApi.Dialog({
    title: props.title,
    content: `<div id="${floatContainerId.value}" class="float-teleport-target" style="height: 100%;"></div>`,
    width: props.width,
    height: props.height,
    transparent: props.transparent,
    disableClose: props.transparent, // 当透明时禁用默认关闭行为
    disableAnimation: false,
  });
  
  dialog.value = newDialog;
  
  // 处理鼠标事件和样式
  if (props.transparent) {
    // 让对话框背景不响应鼠标事件，但内容区域响应
    dialog.value.element.style.pointerEvents = 'none';
    dialog.value.element.querySelector(".b3-dialog__container").style.pointerEvents = 'auto';
    
    // 隐藏默认关闭按钮
    const defaultCloseBtn = dialog.value.element.querySelector(".b3-dialog__close");
    if (defaultCloseBtn) {
      defaultCloseBtn.style.display = 'none';
    }
    
    // 添加自定义关闭按钮
    dialog.value.element.querySelector(".b3-dialog__header").style.padding = '0px 24px';
    dialog.value.element.querySelector(".b3-dialog__header").insertAdjacentHTML(
      'afterBegin', 
      `<svg class="v-float-custom-close" style="position:absolute;top:6px;right:6px;width:16px;height:16px;cursor:pointer;color:var(--b3-theme-on-surface)">
        <use xlink:href="#iconCloseRound"></use>
      </svg>`
    );
    
    // 添加关闭事件
    dialog.value.element.querySelector(".v-float-custom-close").addEventListener('click', close);
  } else {
    // 非透明模式，使用默认的关闭按钮行为
    dialog.value.element.querySelector(".b3-dialog__close").addEventListener('click', close);
  }
  
  teleportTarget.value = `#${floatContainerId.value}`;
  
  // 确保对话框显示在前面
  setTimeout(() => {
    if (dialog.value && dialog.value.element) {
      dialog.value.element.style.zIndex = "999";
      
      // 为标题栏添加样式
      const header = dialog.value.element.querySelector(".b3-dialog__header");
      if (header) {
        header.style.borderBottom = "1px solid var(--b3-border-color)";
        header.style.background = "var(--b3-theme-surface)";
      }
      
      // 为内容区添加样式
      const container = dialog.value.element.querySelector(".b3-dialog__container");
      if (container) {
        container.style.background = "var(--b3-theme-surface)";
        container.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
        container.style.borderRadius = "6px";
      }
    }
  }, 10);
};

// 销毁对话框的辅助函数
const destroyDialog = () => {
  if (dialog.value) {
    dialog.value.destroy();
    dialog.value = null;
  }
};

// 关闭浮动面板
const close = () => {
  destroyDialog();
  emit('close');
  emit('update:isFloating', false);
};

// 监视浮动状态变化
watch(() => props.isFloating, (newValue) => {
  if (newValue) {
    // 确保完全异步创建对话框，避免可能的Vue渲染冲突
    setTimeout(() => {
      createFloatDialog();
    }, 0);
  } else {
    destroyDialog();
  }
}, { immediate: true });

// 组件卸载时清理
onUnmounted(() => {
  destroyDialog();
});
</script>

<style scoped>
.v-float-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.v-float-placeholder {
  background-color: var(--b3-theme-background);
  border-radius: 6px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  padding: 15px;
  margin: 20px 0;
  text-align: center;
}

.v-float-anchor {
  padding: 10px 15px;
  background-color: var(--b3-card-info-background);
  color: var(--b3-card-info-color);
  border: 1px dashed var(--b3-card-info-color);
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

.v-float-anchor:hover {
  background-color: var(--b3-card-info-background);
  opacity: 0.8;
}

.v-float-close-icon {
  font-size: 18px;
  font-weight: bold;
}

.float-teleport-target {
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: var(--b3-theme-background);
  padding: 1px;
}

:deep(.v-float-custom-close:hover) {
  color: var(--b3-theme-primary);
}
</style> 