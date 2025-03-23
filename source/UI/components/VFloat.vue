<template>
  <!-- 
    浮动策略: 当isFloating为true时使用Teleport将内容传送到对话框 
    当目标准备好时(teleportReady)才渲染Teleport组件，避免早期渲染导致的错误
  -->
  <template v-if="isFloating">
    <!-- 
      始终提供一个有效的目标，即使teleportTarget为空也会使用备用的#vfloat-dummy
      这是为了避免"选择器为空"的错误
    -->
    <Teleport :to="teleportTarget || '#vfloat-dummy'" v-if="teleportReady">
      <div class="v-float-container">
        <slot></slot>
      </div>
    </Teleport>
  </template>
  <template v-else>
    <!-- 非浮动状态下，直接渲染内容 -->
    <slot></slot>
  </template>
  
  <!-- 当内容浮动显示时，在原位置显示一个占位符，点击可以关闭浮动面板 -->
  <div v-if="isFloating && !floatElement" class="v-float-placeholder">
    <button class="v-float-anchor" @click="close">
      <span>{{ anchorText }}</span>
      <span class="v-float-close-icon">×</span>
    </button>
  </div>
  
  <!-- 备用的Teleport目标，确保即使目标选择器处理出错，Teleport也有一个有效目标 -->
  <div id="vfloat-dummy" style="display: none;"></div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { clientApi } from "../../asyncModules.js";

/**
 * VFloat组件是一个用于创建可浮动面板的通用组件
 * 它使用Teleport将内容动态传送到对话框中，实现浮动效果
 * 支持透明/非透明模式，自定义标题，占位符文本等
 */

// 组件属性定义
const props = defineProps({
  // 是否处于浮动状态
  isFloating: Boolean,
  // 浮动窗口的标题
  title: {
    type: String,
    default: '浮动面板'
  },
  // 当内容浮动时，占位符显示的文本
  anchorText: {
    type: String,
    default: '内容已浮动显示'
  },
  // 是否浮动整个元素（如果为true，则不显示占位符）
  floatElement: {
    type: Boolean,
    default: false
  },
  // 浮动窗口的宽度
  width: {
    type: String,
    default: '380px'
  },
  // 浮动窗口的高度
  height: {
    type: String,
    default: '520px'
  },
  // 是否使用透明背景（影响鼠标事件处理和关闭按钮样式）
  transparent: {
    type: Boolean,
    default: true
  }
});

// 定义组件事件
const emit = defineEmits(['close', 'update:isFloating']);

// ===== 状态变量 =====

// 浮动容器的唯一ID
const floatContainerId = ref(`vfloat-container-${Date.now()}`);
// Teleport的目标选择器，初始指向备用元素
const teleportTarget = ref('#vfloat-dummy'); 
// 标记Teleport目标是否准备就绪
const teleportReady = ref(false);
// 对话框实例引用
const dialog = ref(null);

/**
 * 安全地设置Teleport目标
 * 确保选择器非空且在正确的Vue更新周期中设置
 * @param {string} selector - CSS选择器
 */
const setTeleportTarget = (selector) => {
  // 安全检查：如果选择器为空，使用备用目标
  if (!selector || selector.trim() === '') {
    teleportTarget.value = '#vfloat-dummy';
    return;
  }
  
  // 在下一个Vue更新周期中设置目标，确保DOM操作同步
  nextTick(() => {
    teleportTarget.value = selector;
  });
};

/**
 * 创建浮动对话框
 * 这是组件的核心函数，负责创建对话框并设置Teleport目标
 */
const createFloatDialog = async () => {
  // 首先禁用Teleport，防止在准备过程中出现错误
  teleportReady.value = false;
  
  // 确保清理任何现有的对话框
  await destroyDialog();
  
  try {
    // 创建唯一ID以避免多个实例冲突
    const uniqueId = `vfloat-container-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    floatContainerId.value = uniqueId;
    
    // 使用思源API创建对话框
    const newDialog = new clientApi.Dialog({
      title: props.title,
      // 创建一个具有唯一ID的容器，作为Teleport的目标
      content: `<div id="${uniqueId}" class="float-teleport-target" style="height: 100%; width: 100%;"></div>`,
      width: props.width,
      height: props.height,
      transparent: props.transparent,
      // 当使用透明模式时，禁用默认关闭行为，使用自定义关闭按钮
      disableClose: props.transparent,
      disableAnimation: false,
    });
    
    dialog.value = newDialog;
    
    // 安全检查：确保对话框创建成功
    if (!dialog.value || !dialog.value.element) {
      console.error('对话框创建失败');
      return;
    }
    
    // ===== 处理透明模式的特殊交互 =====
    if (props.transparent) {
      // 让对话框背景不响应鼠标事件，内容区域响应
      // 这样可以"点击穿透"对话框背景
      dialog.value.element.style.pointerEvents = 'none';
      dialog.value.element.querySelector(".b3-dialog__container").style.pointerEvents = 'auto';
      
      // 隐藏默认关闭按钮，使用自定义按钮
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
      
      // 为自定义关闭按钮添加事件监听
      dialog.value.element.querySelector(".v-float-custom-close").addEventListener('click', close);
    } else {
      // 非透明模式：使用思源默认的关闭按钮行为
      dialog.value.element.querySelector(".b3-dialog__close").addEventListener('click', close);
    }
    
    // ===== 等待DOM渲染完成 =====
    // 这是关键步骤：确保Teleport目标在DOM中可用
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      // 验证目标元素是否存在
      const targetElement = document.getElementById(uniqueId);
      if (targetElement) {
        // 构建目标选择器
        const selector = `#${uniqueId}`;
        
        // 再次验证选择器有效性（双重检查）
        if (document.querySelector(selector)) {
          // 首先设置目标选择器
          setTeleportTarget(selector);
          
          // 等待选择器设置完成
          await nextTick();
          
          // 标记Teleport为就绪状态，此时会触发Teleport内容渲染
          teleportReady.value = true;
          
          // ===== 美化对话框样式 =====
          if (dialog.value && dialog.value.element) {
            // 设置标题栏样式
            const header = dialog.value.element.querySelector(".b3-dialog__header");
            if (header) {
              header.style.borderBottom = "1px solid var(--b3-border-color)";
              header.style.background = "var(--b3-theme-surface)";
            }
            
            // 设置内容区样式
            const container = dialog.value.element.querySelector(".b3-dialog__container");
            if (container) {
              container.style.background = "var(--b3-theme-surface)";
              container.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
              container.style.borderRadius = "6px";
            }
          }
        } else {
          // 选择器无效（可能是DOM结构有问题）
          console.error('选择器无效:', selector);
          close();
        }
      } else {
        // 目标元素不存在（可能是对话框创建异常）
        console.error('无法找到目标元素:', uniqueId);
        close();
      }
    } catch (error) {
      // 捕获设置目标过程中的错误
      console.error('设置目标时出错:', error);
      close();
    }
  } catch (error) {
    // 捕获创建对话框过程中的错误
    console.error('创建对话框失败:', error);
    close();
  }
};

/**
 * 销毁对话框并清理资源
 * 确保按正确顺序清理以避免状态不一致
 */
const destroyDialog = async () => {
  // 步骤1: 先停止Teleport操作
  teleportReady.value = false;
  
  // 步骤2: 等待Vue更新完成，确保Teleport已经停止
  await nextTick();
  
  // 步骤3: 将目标设为安全的默认值
  setTeleportTarget('#vfloat-dummy');
  
  // 步骤4: 再次等待Vue更新
  await nextTick();
  
  // 步骤5: 最后销毁对话框
  if (dialog.value) {
    try {
      dialog.value.destroy();
    } catch (error) {
      console.error('销毁对话框失败:', error);
    }
    dialog.value = null;
  }
};

/**
 * 关闭浮动面板
 * 清理资源并通知父组件
 */
const close = async () => {
  await destroyDialog();
  // 触发close事件
  emit('close');
  // 更新v-model绑定的状态
  emit('update:isFloating', false);
};

/**
 * 监听浮动状态变化
 * 当isFloating变为true时创建对话框，变为false时销毁对话框
 */
watch(() => props.isFloating, async (newValue) => {
  if (newValue) {
    // 进入浮动状态：等待一个更新周期然后创建对话框
    await nextTick();
    createFloatDialog();
  } else {
    // 退出浮动状态：销毁对话框
    destroyDialog();
  }
}, { immediate: true }); // 立即执行，处理初始化时的状态

/**
 * 组件卸载时清理资源
 */
onUnmounted(() => {
  destroyDialog();
});

/**
 * 组件挂载时确保备用目标存在
 */
onMounted(() => {
  // 创建一个备用的Teleport目标元素，确保即使出错时Teleport也有目标
  if (!document.getElementById('vfloat-dummy')) {
    const dummy = document.createElement('div');
    dummy.id = 'vfloat-dummy';
    dummy.style.display = 'none';
    document.body.appendChild(dummy);
  }
});
</script>

<style scoped>
/* 浮动容器：填充对话框内容区域的主容器 */
.v-float-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 占位符：当内容浮动显示时，在原位置显示此占位符 */
.v-float-placeholder {
  background-color: var(--b3-theme-background);
  border-radius: 6px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  padding: 15px;
  margin: 20px 0;
  text-align: center;
}

/* 锚点按钮：点击可关闭浮动面板 */
.v-float-anchor {
  padding: 10px 15px;
  /* 使用思源的信息卡片样式 */
  background-color: var(--b3-card-info-background);
  color: var(--b3-card-info-color);
  border: 1px dashed var(--b3-card-info-color);
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  /* 弹性布局使内容居中 */
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  justify-content: center;
  /* 平滑过渡效果 */
  transition: all 0.2s ease;
}

/* 锚点按钮悬停效果 */
.v-float-anchor:hover {
  background-color: var(--b3-card-info-background);
  opacity: 0.8;
}

/* 关闭图标样式 */
.v-float-close-icon {
  font-size: 18px;
  font-weight: bold;
}

/* Teleport目标容器样式 */
.float-teleport-target {
  width: 100%;
  height: 100%;
  overflow: auto; /* 允许内容滚动 */
  background-color: var(--b3-theme-background);
  padding: 1px;
}

/* 自定义关闭按钮悬停效果 */
:deep(.v-float-custom-close:hover) {
  color: var(--b3-theme-primary);
}
</style> 