<template>
    <div class="image-comparison " ref="container">
      <img 
        :src="props.originalImage" 
        alt="Original Image" 
        class="image original"
        @load="handleImageLoad" 
      />
      <img 
        :src="props.processedImage" 
        alt="Processed Image" 
        class="image processed"
        @load="handleImageLoad" 
      />
      <div 
        class="slider" 
        @mousedown="startDragging" 
        :style="{ left: `${sliderPosition}%` }"
      >
        <div class="slider-line"></div>
        <div class="slider-button"></div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, onUnmounted, inject } from 'vue';

  // 定义组件接口配置
  const nodeInterface = {
    inputs: {
      original: {
        type: 'input',
        side: 'left',
        position: 0.3,
        label: '原始图片',
        dataType: 'image'
      },
      processed: {
        type: 'input',
        side: 'left',
        position: 0.7,
        label: '处理图片', 
        dataType: 'image'
      }
    }
  }

  const props = defineProps({
    componentId: {
      type: String,
      required: true
    },
    originalImage: {
      type: String,
      required: true
    },
    processedImage: {
      type: String,
      required: true
    }
  });

  const emit = defineEmits(['load']);

  // 组件状态
  const container = ref(null);
  const sliderPosition = ref(50);
  const isDragging = ref(false);
  const imagesLoaded = ref(0);

  // 注入接口注册方法并处理锚点注册
  const { register = () => [], unregister = () => {} } = inject('nodeInterface', {}) || {};
  const registeredAnchors = ref([]);

  onMounted(() => {
    if (register) {
      registeredAnchors.value = register(props.componentId, nodeInterface)
    }
    updateProcessedImageClip();
  })

  onUnmounted(() => {
    if (unregister && registeredAnchors.value.length) {
      unregister(registeredAnchors.value)
    }
    document.removeEventListener('mousemove', handleDragging);
    document.removeEventListener('mouseup', stopDragging);
  });

  // 处理图片加载
  const handleImageLoad = () => {
    imagesLoaded.value += 1;
    if (imagesLoaded.value === 2) {
      emit('load');
      imagesLoaded.value = 0;
    }
  };

  // 拖动相关方法
  const startDragging = (e) => {
    e.preventDefault();
    isDragging.value = true;
    document.addEventListener('mousemove', handleDragging);
    document.addEventListener('mouseup', stopDragging);
  };

  const handleDragging = (e) => {
    if (!isDragging.value || !container.value) return;
  
    const rect = container.value.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const containerWidth = rect.width;
  
    // 计算百分比位置（限制在0-100之间）
    sliderPosition.value = Math.min(Math.max((x / containerWidth) * 100, 0), 100);
  
    // 更新压缩图片的显示区域
    updateProcessedImageClip();
  };
  
  const stopDragging = () => {
    isDragging.value = false;
    document.removeEventListener('mousemove', handleDragging);
    document.removeEventListener('mouseup', stopDragging);
  };
  
  // 更新处理后图片的裁剪区域
  const updateProcessedImageClip = () => {
    const processedImg = container.value?.querySelector('.processed');
    if (processedImg) {
      processedImg.style.clipPath = `inset(0 0 0 ${sliderPosition.value}%)`;
    }
  };
  
  // 组件卸载时清理事件监听
  onUnmounted(() => {
    document.removeEventListener('mousemove', handleDragging);
    document.removeEventListener('mouseup', stopDragging);
  });
  
  // 组件挂载后初始化裁剪区域
  onMounted(() => {
  
    updateProcessedImageClip();
  });
  </script>
  
  <style scoped>
  .image-comparison {
    position: relative;
    width: 100%;
    overflow: hidden;
  }
  
  .image {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  
  .processed {
    /* 初始裁剪设置会在 JS 中动态更新 */
    clip-path: inset(0 0 0 50%);
  }
  
  .slider {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 40px;
    transform: translateX(-50%);
    cursor: ew-resize;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
  }
  
  .slider-line {
    position: absolute;
    width: 2px;
    height: 100%;
    background-color: #fff;
    box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
  }
  
  .slider-button {
    position: absolute;
    width: 40px;
    height: 40px;
    background-color: #fff;
    border-radius: 50%;
    box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
    pointer-events: none;
    top: 50%;
    transform: translateY(-50%);
  }
  
  /* 添加一些悬停效果 */
  .slider:hover .slider-button {
    transform: translateY(-50%) scale(1.1);
    transition: transform 0.2s ease;
  }
  
  .slider:active .slider-button {
    transform: translateY(-50%) scale(0.95);
  }
  </style>