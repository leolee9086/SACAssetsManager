import { ref, computed, watch, onMounted, onUnmounted } from '../../../static/vue.esm-browser.js';
import { clientApi } from "../../asyncModules.js";

export function useFloatablePanel() {
  // 浮动状态
  const isFloating = ref(false);
  // 浮动窗口实例
  const floatDialog = ref(null);
  // 浮动的内容类型
  const floatingContent = ref(null); // 'customizer' | 'preview' | null
  // 可用宽度阈值
  const widthThreshold = ref(768);
  // 浮动面板内容的Vue实例
  const floatApp = ref(null);
  
  // 当前容器宽度
  const containerWidth = ref(0);
  
  // 自动决定是否应该浮动
  const shouldFloat = computed(() => {
    return containerWidth.value > 0 && containerWidth.value < widthThreshold.value;
  });
  
  // 创建浮动面板
  const createFloatPanel = (content, title, componentURL, props = {}) => {
    if (isFloating.value && floatDialog.value) {
      closeFloatPanel();
    }
    
    floatingContent.value = content;
    
    const dialog = new clientApi.Dialog({
      title: title || "SVG生成器",
      content: `
        <div id="floatablePanelContent" 
          class="floatable-content fn__flex-column" 
          style="pointer-events:auto;z-index:5;height:100%">
        </div>
      `,
      width: '380px',
      height: '520px',
      transparent: false,
      disableClose: false,
      disableAnimation: false,
    });
    
    // 对话框关闭时处理
    dialog.element.querySelector(".b3-dialog__close").addEventListener('click', () => {
      isFloating.value = false;
      floatingContent.value = null;
      floatDialog.value = null;
      floatApp.value = null;
    });
    
    // 设置样式
    dialog.element.querySelector(".b3-dialog__header").style.padding = '8px 16px';
    
    // 加载组件到浮动面板
    import(componentURL).then(module => {
      const app = Vue.createApp(module.default, {
        ...props,
        isFloating: true,
        onClose: () => {
          closeFloatPanel();
        }
      });
      app.mount(dialog.element.querySelector(".floatable-content"));
      floatApp.value = app;
    });
    
    floatDialog.value = dialog;
    isFloating.value = true;
    
    return { dialog, content };
  };
  
  // 关闭浮动面板
  const closeFloatPanel = () => {
    if (floatDialog.value) {
      floatDialog.value.destroy();
      floatDialog.value = null;
    }
    
    if (floatApp.value) {
      floatApp.value.unmount();
      floatApp.value = null;
    }
    
    isFloating.value = false;
    floatingContent.value = null;
  };
  
  // 监听窗口大小变化
  const updateContainerWidth = (el) => {
    if (!el) return;
    containerWidth.value = el.offsetWidth;
  };
  
  // 初始化观察器
  const initResizeObserver = (el) => {
    if (!el) return null;
    
    const observer = new ResizeObserver(() => {
      updateContainerWidth(el);
    });
    
    observer.observe(el);
    return observer;
  };
  
  // 组件生命周期挂载和卸载
  let resizeObserver = null;
  
  const setupFloatableContainer = (el) => {
    updateContainerWidth(el);
    resizeObserver = initResizeObserver(el);
  };
  
  onUnmounted(() => {
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
    closeFloatPanel();
  });
  
  return {
    isFloating,
    floatingContent,
    shouldFloat,
    createFloatPanel,
    closeFloatPanel,
    setupFloatableContainer,
    containerWidth
  };
} 