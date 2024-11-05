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
export const nodeDefine = {
  inputs: [
    { name: 'originalImage', type: 'string|Buffer', default: "/plugins/SACAssetsManager/assets/wechatDonate.jpg",label:'左侧图像' },
    { name: 'processedImage', type: 'string|Buffer', default: "/plugins/SACAssetsManager/assets/wechatDonate.jpg",label:'右侧图像' },
    { name: 'thumbnailSize', type: 'number', value: 32 ,label:'相似度校验精度'} // 假设缩略图大小为32
  ],
  outputs: [
    { name: 'imagesAreSimilar', type: 'boolean', value: false,label:'处理是否相似' },
    { name: 'similarityScore', type: 'number', value: 0 ,label:'相似度'} // 新增相似度输出
  ],
  async process(inputs) {
    let {originalImage, processedImage, thumbnailSize} = inputs;
    thumbnailSize = thumbnailSize || 32;
    if (!originalImage || !processedImage) {
      console.error("Image data is missing.");
      return  {
        imagesAreSimilar:false,
        similarityScore:0
      }

    }

    const getImageData = async (image) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = thumbnailSize;
          canvas.height = thumbnailSize;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, thumbnailSize, thumbnailSize);
          const imageData = ctx.getImageData(0, 0, thumbnailSize, thumbnailSize);
          resolve(imageData.data);
        };
        img.onerror = reject;
        img.src = typeof image === 'string' ? image : URL.createObjectURL(new Blob([image]));
      });
    };

    try {
      const originalImageData = await getImageData(originalImage);
      const processedImageData = await getImageData(processedImage);

      const originalHash = 计算图像感知哈希(originalImageData, thumbnailSize);
      const processedHash = 计算图像感知哈希(processedImageData, thumbnailSize);

      const hammingDistance = originalHash.split('').reduce((acc, bit, index) => {
        return acc + (bit !== processedHash[index] ? 1 : 0);
      }, 0);

      const similarityThreshold = 5;
      const imagesAreSimilar = hammingDistance <= similarityThreshold;

      // 计算相似度
      const similarityScore = 计算图像相似度(originalHash, processedHash);
      console.log(hammingDistance,similarityScore)
      return {
        imagesAreSimilar,
        similarityScore
      } 
    } catch (error) {
      return {
        imagesAreSimilar:false,
        similarityScore:0
      }
    }
  },

};
</script>

<script setup>
import { ref, onMounted, onUnmounted, defineProps, defineEmits, watch } from 'vue';
defineExpose(
  {nodeDefine}
)
const props = defineProps({
  originalImage: {
    type: String,
    required: true
  },
  processedImage: {
    type: String,
    required: true
  },
  thumbnailSize: {
    type: Number,
    default: 32,
    validator: (value) => value > 0 && value <= 256
  }
});

const emit = defineEmits(['load']);

// 组件状态
const container = ref(null);
const sliderPosition = ref(50);
const isDragging = ref(false);
const imagesLoaded = ref(0);
const imagesAreEqual = ref(false);

onMounted(() => {
  updateProcessedImageClip();
  compareImages();
});

onUnmounted(() => {
  document.removeEventListener('mousemove', handleDragging);
  document.removeEventListener('mouseup', stopDragging);
});

// 处理图片加载
const handleImageLoad = () => {
  imagesLoaded.value += 1;
  if (imagesLoaded.value === 2) {
    emit('load');
    imagesLoaded.value = 0;
    compareImages(); // 在图片加载完成后进行比较
  }
};

// 比较图像
const compareImages = async() => {
  const inputs = [
    { name: 'originalImage', type: 'string', value: props.originalImage },
    { name: 'processedImage', type: 'string', value: props.processedImage },
    { name: 'thumbnailSize', type: 'number', value: props.thumbnailSize }
  ];
  const outputs = await nodeDefine.process(props);

  imagesAreEqual.value = outputs[0].value;
};

// 监听图像变化
watch(
  [
    () => props.originalImage, 
    () => props.processedImage,
    () => props.thumbnailSize
  ], 
  compareImages
);

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