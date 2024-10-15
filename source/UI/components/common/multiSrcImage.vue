<template>
  <div class="multi-src-image">
    <template v-if="props.multiple">
      <div class="stacked-images">
        <img v-for="(src, index) in loadedSrcs" 
             :key="index" 
             :src="src" 
             :style="getImageStyle(index)"

             v-bind="$attrs" />
      </div>
    </template>
    <template v-else>
      <img :src="currentSrc" v-bind="$attrs" />
    </template>
  </div>
</template>


  
  <script setup>
  import { ref, watch, onMounted } from 'vue';
  
  const props = defineProps({
    src: {
      type: Array,
      required: true
    },
    mode: {
      type: String,
      default: 'sequential', // 'sequential' or 'parallel'
      validator: value => ['sequential', 'parallel'].includes(value)
    },
    multiple: {
    type: Boolean,
    default: false
  }
  });
  const getImageStyle = (index) => {
  const totalImages = loadedSrcs.value.length;
  const maxRotation = 15; // 最大旋转角度
  const rotationStep = maxRotation / (totalImages - 1);
  const rotation = (index - (totalImages - 1) / 2) * rotationStep;
  
  return {
    zIndex: totalImages - index,
    transform: ` translate(-50%, -50%) rotate(${rotation}deg)`,
  };
};

  const currentSrc = ref('');
const loadedSrcs = ref([]);
  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(src);
      img.onerror = () => reject(src);
      img.src = src;
    });
  };
  
  const loadSequentially = async (srcArray) => {
  loadedSrcs.value = [];
  for (const src of srcArray) {
    try {
      const loadedSrc = await loadImage(src);
      if (props.multiple) {
        loadedSrcs.value.push(loadedSrc);
      } else {
        currentSrc.value = loadedSrc;
        break;
      }
    } catch (error) {
      console.warn(`加载图片失败: ${src}`);
    }
  }
};

  
const loadInParallel = (srcArray) => {
  loadedSrcs.value = [];
  Promise.all(srcArray.map(loadImage))
    .then(loadedImages => {
      if (props.multiple) {
        loadedSrcs.value = loadedImages;
      } else {
        currentSrc.value = loadedImages[0];
      }
    })
    .catch(errors => {
      console.warn('所有图片加载失败', errors);
    });
};

const loadImages = () => {
  if (props.mode === 'sequential') {
    loadSequentially(props.src);
  } else {
    loadInParallel(props.src);
  }
};
  
  onMounted(loadImages);
  watch(() => props.src, loadImages);
  </script>
  <style scoped>
 .multi-src-image {
  position: relative;
  width: 90%;
  height: 90%;
  border-radius: 10px;
}

.stacked-images {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.stacked-images img {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  max-width: 90%;
  max-height: 90%;
  object-fit: cover;
}

.stacked-images {
  border-radius: 10px;
}
  </style>