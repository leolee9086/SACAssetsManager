<template>
  <div :class="['image-comparison', { 'images-equal': imagesAreEqual }]" ref="container">
    <img :src="originalImage" alt="Original Image" class="image original" @load="handleImageLoad" />
    <img :src="processedImage" alt="Processed Image" class="image processed" @load="handleImageLoad" />
    <div class="slider" @mousedown="startDragging" :style="{ left: `${sliderPosition}%` }">
      <div class="slider-line"></div>
      <div class="slider-button"></div>
    </div>
  </div>
</template>
<script nodeDefine>
import { 计算图像感知哈希,计算图像相似度 } from '../../../utils/image/pHash.js';
import {ref} from 'vue'
// 声明运行时状态存储
const runtime = {
  originalImage: ref("/plugins/SACAssetsManager/assets/wechatDonate.jpg"),
  processedImage: ref("/plugins/SACAssetsManager/assets/wechatDonate.jpg"),
  thumbnailSize: ref(32),
  imagesAreSimilar: ref(false),
  similarityScore: ref(0)
};

export let nodeDefine = {
  inputs: [
    { name: 'originalImage', type: 'string|Buffer|Uint8Array', default: "/plugins/SACAssetsManager/assets/wechatDonate.jpg", label:'左侧图像' },
    { name: 'processedImage', type: 'string|Buffer|Uint8Array', default: "/plugins/SACAssetsManager/assets/wechatDonate.jpg", label:'右侧图像' },
    { name: 'thumbnailSize', type: 'number', default: 32, label:'相似度校验精度' }
  ],
  outputs: [
    { name: 'imagesAreSimilar', type: 'boolean', value: false, label:'处理是否相似' },
    { name: 'similarityScore', type: 'number', value: 0, label:'相似度' }
  ],
  async process(inputs) {
    // 更新运行时状态

    runtime.originalImage.value = inputs.originalImage.value||inputs.originalImage;
    runtime.processedImage.value = inputs.processedImage.value||inputs.processedImage;
    runtime.thumbnailSize.value = inputs.thumbnailSize.value||inputs.thumbnailSize || 32;

    if (!runtime.originalImage.value || !runtime.processedImage.value) {
      console.error("Image data is missing.");
      runtime.imagesAreSimilar.value = false;
      runtime.similarityScore.value = 0;
      return {
        imagesAreSimilar: false,
        similarityScore: 0
      }

    }

    const getImageData = async (image) => {
      console.log('image',image)
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = runtime.thumbnailSize.value;
          canvas.height = runtime.thumbnailSize.value;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, runtime.thumbnailSize.value, runtime.thumbnailSize.value);
          const imageData = ctx.getImageData(0, 0, runtime.thumbnailSize.value, runtime.thumbnailSize.value);
          resolve(imageData.data);
        };
        img.onerror = reject;

        // 处理不同类型的输入
        if (typeof image === 'string') {
          img.src = image;
        } else if (image instanceof Uint8Array || image instanceof Buffer) {
          const blob = new Blob([image], { type: 'image/jpeg' }); // 可以根据实际情况调整 MIME 类型
          img.src = URL.createObjectURL(blob);
        } else {
          reject(new Error('不支持的图像格式'));
        }
      });
    };

    try {
      const originalImageData = await getImageData(runtime.originalImage.value);
      const processedImageData = await getImageData(runtime.processedImage.value);
      console.log(runtime)

      const originalHash = 计算图像感知哈希(originalImageData, runtime.thumbnailSize.value);
      const processedHash = 计算图像感知哈希(processedImageData, runtime.thumbnailSize.value);

      const hammingDistance = originalHash.split('').reduce((acc, bit, index) => {
        return acc + (bit !== processedHash[index] ? 1 : 0);
      }, 0);

      const similarityThreshold = 5;
      const imagesAreSimilar = hammingDistance <= similarityThreshold;

      // 计算相似度
      const similarityScore = 计算图像相似度(originalHash, processedHash);

      // 更新运行时状态
      runtime.imagesAreSimilar.value = imagesAreSimilar;
      runtime.similarityScore.value = similarityScore;
      console.log(runtime)
      return {
        imagesAreSimilar,
        similarityScore
      }
    } catch (error) {
      console.error(error)
      runtime.imagesAreSimilar.value = false;
      runtime.similarityScore.value = 0;
      return {
        imagesAreSimilar: false,
        similarityScore: 0
      }
    }
  },
};

</script>

<script setup>
import {  onMounted, onUnmounted, watch, computed } from 'vue';

defineExpose({ nodeDefine });

// 使用运行时状态
const container = ref(null);
const sliderPosition = ref(50);
const isDragging = ref(false);
const imagesLoaded = ref(0);

// 处理图片源的显示
const getImageSource = (image) => {
  if (!image) return '';
  
  if (typeof image === 'string') {
    return image;
  } else if (image instanceof Uint8Array || image instanceof Buffer) {
    const blob = new Blob([image], { type: 'image/jpeg' });
    return URL.createObjectURL(blob);
  } else if (image instanceof Blob) {
    return URL.createObjectURL(image);
  }
  return '';
};

// 修改计算属性
const originalImage = computed(() => {
  const source = getImageSource(runtime.originalImage.value);
  return source;
});

const processedImage = computed(() => {
  const source = getImageSource(runtime.processedImage.value);
  return source;
});

const imagesAreEqual = computed(() => runtime.imagesAreSimilar.value);
const similarityScore = computed(() => runtime.similarityScore.value);

// 监听图片变化
watch([originalImage, processedImage], () => {
  console.log(originalImage,processedImage)
  // 重置图片加载状态
  imagesLoaded.value = 0;
  // 更新处理后图片的裁剪区域
  updateProcessedImageClip();
});

onMounted(() => {
  updateProcessedImageClip();
});

onUnmounted(() => {
  document.removeEventListener('mousemove', handleDragging);
  document.removeEventListener('mouseup', stopDragging);
  const urls = [originalImage.value, processedImage.value];
  urls.forEach(url => {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  });
});

// 处理图片加载
const handleImageLoad = () => {
  imagesLoaded.value += 1;
  if (imagesLoaded.value === 2) {
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
</script>


<style scoped>
.image-comparison {
  position: relative;
  overflow: hidden;
  height:100%;
  border: 2px solid transparent;
  transition: border-color 0.3s ease;
}

.image-comparison.images-equal {
  border-color: green; /* 当图像相同时，边框变为绿色 */
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