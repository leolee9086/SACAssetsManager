<template>
  <div class="pano-viewer" ref="container">
    <canvas ref="canvas"></canvas>
    
    <!-- 热点容器 -->
    <div class="hotspots-container">
      <div v-for="(hotspot, index) in hotspots" 
           :key="index"
           class="hotspot-marker"
           :data-hotspot-id="hotspot.id"
           @click="$emit('hotspotClick', hotspot)">
        <div class="hotspot-content">
          <i class="hotspot-icon">📍</i>
          <span class="hotspot-label">{{ hotspot.name }}</span>
        </div>
      </div>
    </div>
    
    <!-- 添加热点指示器 -->
    <div v-if="isAddingHotspot" 
         class="hotspot-indicator"
         :style="{ cursor: 'crosshair' }">
      点击场景添加热点
    </div>
  </div>
</template>

<script setup>
import * as THREE from '../../../../static/three/three.mjs';
import { ref, onMounted, onBeforeUnmount, shallowRef, watch } from 'vue';
import { worldToScreen } from './utils.js';

// Props
const props = defineProps({
  hotspots: {
    type: Array,
    default: () => []
  },
  isAddingHotspot: {
    type: Boolean,
    default: false
  },
  autoRotate: {
    type: Boolean,
    default: false
  },
  rotateSpeed: {
    type: Number,
    default: 50
  },
  initialView: {
    type: Object,
    default: () => ({
      lon: 180,
      lat: 0,
      fov: 75
    })
  }
});

// Emits
const emit = defineEmits([
  'update:camera', 
  'hotspotClick',
  'sceneClick'
]);

// Refs
const container = ref(null);
const canvas = ref(null);

// 状态变量
const scene = shallowRef(null);
const camera = shallowRef(null);
const renderer = shallowRef(null);
const texture = shallowRef(null);
const isUserInteracting = ref(false);
const onPointerDownMouseX = ref(0);
const onPointerDownMouseY = ref(0);
const lon = ref(180);
const lat = ref(0);
const onPointerDownLon = ref(0);
const onPointerDownLat = ref(0);

// 核心方法
const init = () => {
  scene.value = new THREE.Scene();
  
  // 使用初始视角设置
  camera.value = new THREE.PerspectiveCamera(
    props.initialView.fov,
    1,
    1,
    1000
  );
  
  lon.value = props.initialView.lon;
  lat.value = props.initialView.lat;
  
  // ... rest of init code ...
};

const update = () => {
  if (props.autoRotate && !isUserInteracting.value) {
    const speed = (props.rotateSpeed / 50) * 0.1;
    lon.value += speed;
  }
  
  lat.value = Math.max(-85, Math.min(85, lat.value));
  const phi = THREE.MathUtils.degToRad(90 - lat.value);
  const theta = THREE.MathUtils.degToRad(lon.value);
  
  const x = 500 * Math.sin(phi) * Math.cos(theta);
  const y = 500 * Math.cos(phi);
  const z = 500 * Math.sin(phi) * Math.sin(theta);
  
  camera.value.lookAt(x, y, z);
  renderer.value.render(scene.value, camera.value);
  
  // 发送相机状态更新
  emit('update:camera', {
    lon: lon.value,
    lat: lat.value,
    fov: camera.value.fov
  });
};

// 添加鼠标事件处理方法
const onMouseDown = (event) => {
  isUserInteracting.value = true;
  
  const { clientX, clientY } = event.touches?.[0] || event;
  onPointerDownMouseX.value = clientX;
  onPointerDownMouseY.value = clientY;
  onPointerDownLon.value = lon.value;
  onPointerDownLat.value = lat.value;
  
  // 设置鼠标样式
  container.value.style.cursor = 'grabbing';
};

const onMouseMove = (event) => {
  if (!isUserInteracting.value) return;
  
  const { clientX, clientY } = event.touches?.[0] || event;
  
  // 计算移动距离并更新视角
  lon.value = (onPointerDownMouseX.value - clientX) * 0.2 + onPointerDownLon.value;
  lat.value = (clientY - onPointerDownMouseY.value) * 0.2 + onPointerDownLat.value;
  
  // 限制纬度范围
  lat.value = Math.max(-85, Math.min(85, lat.value));
};

const onMouseUp = () => {
  isUserInteracting.value = false;
  
  // 恢复鼠标样式
  container.value.style.cursor = 'grab';
};

const onMouseWheel = (event) => {
  // 阻止默认滚动行为
  event.preventDefault();
  
  // 计算新的 FOV 值
  const fov = camera.value.fov + event.deltaY * 0.05;
  camera.value.fov = THREE.MathUtils.clamp(fov, 30, 90);
  camera.value.updateProjectionMatrix();
  
  // 发送相机状态更新
  emit('update:camera', {
    lon: lon.value,
    lat: lat.value,
    fov: camera.value.fov
  });
};

// 添加触摸事件处理
const onTouchStart = (event) => {
  if (event.touches.length === 1) {
    onMouseDown(event);
  }
};

const onTouchMove = (event) => {
  if (event.touches.length === 1) {
    onMouseMove(event);
  }
};

const onTouchEnd = () => {
  onMouseUp();
};

// 添加场景点击处理
const onCanvasClick = (event) => {
  if (!isUserInteracting.value) {
    emit('sceneClick', {
      lon: lon.value,
      lat: lat.value,
      event
    });
  }
};

// 暴露方法给父组件
defineExpose({
  loadTexture: (imageUrl) => {
    // ... 加载纹理的代码 ...
  },
  setView: (lon, lat, fov) => {
    // ... 设置视角的代码 ...
  }
});

// 生命周期钩子
onMounted(() => {
  init();
  animate();
  
  // 设置初始鼠标样式
  container.value.style.cursor = 'grab';
  
  // 添加鼠���事件监听
  container.value.addEventListener('mousedown', onMouseDown);
  container.value.addEventListener('mousemove', onMouseMove);
  container.value.addEventListener('mouseup', onMouseUp);
  container.value.addEventListener('wheel', onMouseWheel, { passive: false });
  
  // 添加触摸事件监听
  container.value.addEventListener('touchstart', onTouchStart);
  container.value.addEventListener('touchmove', onTouchMove);
  container.value.addEventListener('touchend', onTouchEnd);
  
  // 添加点击事件监听
  container.value.addEventListener('click', onCanvasClick);
  
  // 添加全局鼠标释放监听
  document.addEventListener('mouseup', onMouseUp);
});

onBeforeUnmount(() => {
  // 移除鼠标事件监听
  container.value.removeEventListener('mousedown', onMouseDown);
  container.value.removeEventListener('mousemove', onMouseMove);
  container.value.removeEventListener('mouseup', onMouseUp);
  container.value.removeEventListener('wheel', onMouseWheel);
  
  // 移除触摸事件监听
  container.value.removeEventListener('touchstart', onTouchStart);
  container.value.removeEventListener('touchmove', onTouchMove);
  container.value.removeEventListener('touchend', onTouchEnd);
  
  // 移除点击事件监听
  container.value.removeEventListener('click', onCanvasClick);
  
  // 移除全局鼠标释��监听
  document.removeEventListener('mouseup', onMouseUp);
});
</script>

<style scoped>
.pano-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  touch-action: none;
  /* 添加平滑过渡效果 */
  transition: cursor 0.2s;
}

/* 改进热点容器样式 */
.hotspots-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* 允许点击穿透到画布 */
}

.hotspot-marker {
  position: absolute;
  transform-origin: center;
  pointer-events: auto; /* 恢复热点的可点击性 */
  /* 添加动画效果 */
  transition: transform 0.2s ease-out;
}

.hotspot-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  /* 添加悬浮效果 */
  transform: scale(1);
  transition: transform 0.2s;
}

.hotspot-content:hover {
  transform: scale(1.1);
}

.hotspot-icon {
  font-size: 24px;
  /* 添加发光效果 */
  filter: drop-shadow(0 0 4px rgba(255,255,255,0.5));
}

.hotspot-label {
  margin-top: 4px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.75);
  color: white;
  border-radius: 4px;
  font-size: 12px;
  /* 添加文字阴影 */
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  /* 确保文字不换行 */
  white-space: nowrap;
  /* 添加模糊背景效果 */
  backdrop-filter: blur(4px);
}

/* 改进热点指示器样式 */
.hotspot-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.75);
  color: white;
  border-radius: 4px;
  font-size: 14px;
  /* 添加动画效果 */
  animation: pulse 2s infinite;
  /* 添加模糊背景 */
  backdrop-filter: blur(4px);
}

/* 添加脉冲动画 */
@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(255,255,255,0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(255,255,255,0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255,255,255,0);
  }
}

/* 添加画布样式 */
canvas {
  width: 100%;
  height: 100%;
  display: block;
  /* 添加平滑过渡 */
  transition: opacity 0.3s;
}

/* 添加加载状态样式 */
.loading {
  opacity: 0.5;
}

/* 优化鼠标样式 */
.pano-viewer {
  cursor: grab;
}

.pano-viewer:active {
  cursor: grabbing;
}

/* 添加媒体查询以适应移动设备 */
@media (max-width: 768px) {
  .hotspot-icon {
    font-size: 20px;
  }
  
  .hotspot-label {
    font-size: 10px;
    padding: 2px 6px;
  }
}
</style> 