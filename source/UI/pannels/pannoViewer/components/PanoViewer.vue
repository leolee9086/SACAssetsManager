<template>
  <div class="pano-viewer" ref="container">
    <!-- 添加顶部工具栏 -->
    <div class="canvas-toolbar">
      <div class="toolbar-group">
        <button class="toolbar-btn" title="重置视角" @click="resetView">
          <i class="icon">🔄</i>
        </button>
        <button class="toolbar-btn" title="VR模式" @click="toggleVRMode">
          <i class="icon">🥽</i>
        </button>
        <button class="toolbar-btn" title="全屏" @click="toggleFullscreen">
          <i class="icon">{{ isFullscreen ? '⛶' : '⛶' }}</i>
        </button>
      </div>
    </div>

    <canvas ref="canvas"></canvas>
    
    <!-- 热点容器 -->
    <div class="hotspots-container">
      <div v-for="(hotspot, index) in hotspots" 
           :key="index"
           class="hotspot-marker"
           :data-hotspot-id="hotspot.id"
           :style="getHotspotStyle(hotspot)"
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

    <!-- 添加虚拟控制器 (移动端) -->
    <div class="virtual-controls" v-if="isMobile">
      <div class="direction-controls">
        <button class="control-btn" @click="moveCamera('up')">⬆️</button>
        <button class="control-btn" @click="moveCamera('down')">⬇️</button>
        <button class="control-btn" @click="moveCamera('left')">⬅️</button>
        <button class="control-btn" @click="moveCamera('right')">➡️</button>
      </div>
      <div class="zoom-controls">
        <button class="control-btn" @click="zoom('in')">+</button>
        <button class="control-btn" @click="zoom('out')">-</button>
      </div>
    </div>

    <!-- 添加小地图 -->
    <div class="minimap" v-if="showMinimap">
      <canvas ref="minimapCanvas" width="150" height="150"></canvas>
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
  },
  showMinimap: {
    type: Boolean,
    default: false
  },
  enableVR: {
    type: Boolean,
    default: false
  }
});

// Emits
const emit = defineEmits([
  'update:camera', 
  'hotspotClick',
  'sceneClick',
  'vrModeChange',
  'error'
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
const minimapCanvas = ref(null);
const isFullscreen = ref(false);
const isMobile = ref(false);
const isVRMode = ref(false);

// 核心方法
const init = () => {
  // 创建场景
  scene.value = new THREE.Scene();
  
  // 创建相机并使用初始视角设置
  camera.value = new THREE.PerspectiveCamera(
    props.initialView.fov,
    container.value.clientWidth / container.value.clientHeight, // 使用容器宽高比
    1,
    1000
  );
  
  // 设置初始视角
  lon.value = props.initialView.lon;
  lat.value = props.initialView.lat;
  
  // 创建WebGL渲染器
  renderer.value = new THREE.WebGLRenderer({
    canvas: canvas.value,
    antialias: true,
    alpha: true
  });
  
  // 设置渲染器尺寸和像素比
  renderer.value.setSize(container.value.clientWidth, container.value.clientHeight);
  renderer.value.setPixelRatio(window.devicePixelRatio);
  
  // 设置渲染器的输出编码
  renderer.value.outputColorSpace = THREE.SRGBColorSpace;
  
  // 创建球形几何体
  const geometry = new THREE.SphereGeometry(500, 60, 40);
  // 将几何体内外翻转,使纹理贴在内部
  geometry.scale(-1, 1, 1);
  
  // 创建基础材质
  const material = new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide,
    toneMapped: false,
    transparent: true,
    opacity: 1,
    depthWrite: true,
    depthTest: true
  });
  
  // 创建网格并添加到场景
  const mesh = new THREE.Mesh(geometry, material);
  scene.value.add(mesh);
  
  // 设置相机初始位置
  camera.value.position.set(0, 0, 0);
  
  // 设置初始鼠标样式
  container.value.style.cursor = 'grab';
  
  // 添加事件监听
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
  
  // 检测移动设备
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  
  // 创建 ResizeObserver 监听容器尺寸变化
  resizeObserver.value = new ResizeObserver(() => {
    if (container.value && renderer.value && camera.value) {
      const width = container.value.clientWidth;
      const height = container.value.clientHeight;
      
      camera.value.aspect = width / height;
      camera.value.updateProjectionMatrix();
      
      renderer.value.setSize(width, height);
    }
  });
  
  // 开始监听容器尺寸
  resizeObserver.value.observe(container.value);
  
  // 添加全屏变化监听
  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement;
  });
  
  // 如果提供了初始纹理,加载它
  if (props.initialTexture) {
    loadTexture(props.initialTexture);
  }
};

// 添加加载纹理的方法
const loadTexture = (imageUrl) => {
  const textureLoader = new THREE.TextureLoader();
  textureLoader.load(
    imageUrl,
    (newTexture) => {
      if (texture.value) {
        texture.value.dispose();
      }
      
      newTexture.colorSpace = THREE.SRGBColorSpace;
      texture.value = newTexture;
      
      // 更新材质
      if (scene.value?.children[0]?.material) {
        const material = scene.value.children[0].material;
        material.map = texture.value;
        material.needsUpdate = true;
      }
    },
    undefined,
    (error) => {
      emit('error', { type: 'texture', error });
    }
  );
};

// 修改 update 方法
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
  
  updateMinimap();
  
  // 更新所有热点的位置
  if (props.hotspots) {
    props.hotspots.forEach(hotspot => {
      const element = container.value.querySelector(`[data-hotspot-id="${hotspot.id}"]`);
      if (element) {
        const { x, y, visible } = worldToScreen(
          hotspot.lon,
          hotspot.lat,
          camera.value,
          container.value
        );
        element.style.transform = `translate(${x}px, ${y}px)`;
        element.style.display = visible ? 'block' : 'none';
      }
    });
  }
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

// 添加热点位置计算方法
const getHotspotStyle = (hotspot) => {
  if (!camera.value || !container.value) return {};
  
  const { x, y, visible } = worldToScreen(
    hotspot.lon, 
    hotspot.lat, 
    camera.value, 
    container.value
  );
  
  return {
    transform: `translate(${x}px, ${y}px)`,
    display: visible ? 'block' : 'none'
  };
};

// 添加相机移动控制
const moveCamera = (direction) => {
  const step = 5;
  switch (direction) {
    case 'up':
      lat.value = Math.min(85, lat.value + step);
      break;
    case 'down':
      lat.value = Math.max(-85, lat.value - step);
      break;
    case 'left':
      lon.value = (lon.value - step) % 360;
      break;
    case 'right':
      lon.value = (lon.value + step) % 360;
      break;
  }
};

// 添加缩放控制
const zoom = (direction) => {
  const step = 5;
  const newFov = direction === 'in' 
    ? camera.value.fov - step 
    : camera.value.fov + step;
    
  camera.value.fov = THREE.MathUtils.clamp(newFov, 30, 90);
  camera.value.updateProjectionMatrix();
};

// 添加视角重置方法
const resetView = () => {
  const animation = createSmoothAnimation({
    duration: 1000,
    from: {
      lon: lon.value,
      lat: lat.value,
      fov: camera.value.fov
    },
    to: {
      lon: 180,
      lat: 0,
      fov: 75
    },
    onUpdate: (current) => {
      lon.value = current.lon;
      lat.value = current.lat;
      camera.value.fov = current.fov;
      camera.value.updateProjectionMatrix();
    }
  });
};

// 添加全屏控制
const toggleFullscreen = async () => {
  try {
    if (!isFullscreen.value) {
      await container.value.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch (error) {
    emit('error', { type: 'fullscreen', error });
  }
};

// 添加 VR 模式控制
const toggleVRMode = async () => {
  if (!props.enableVR) return;
  
  try {
    if (!isVRMode.value) {
      // 初始化 VR
      const vrDisplay = await navigator.getVRDisplays();
      if (vrDisplay.length) {
        isVRMode.value = true;
        emit('vrModeChange', true);
        // 实现 VR 渲染逻辑
      }
    } else {
      isVRMode.value = false;
      emit('vrModeChange', false);
    }
  } catch (error) {
    emit('error', { type: 'vr', error });
  }
};

// 添加小地图更新
const updateMinimap = () => {
  if (!minimapCanvas.value || !props.showMinimap) return;
  
  const ctx = minimapCanvas.value.getContext('2d');
  ctx.clearRect(0, 0, 150, 150);
  
  // 绘制背景
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, 150, 150);
  
  // 绘制当前视角
  const x = (lon.value / 360) * 150;
  const y = ((lat.value + 90) / 180) * 150;
  
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();
};

// 添加动画循环
const animate = () => {
  requestAnimationFrame(animate);
  update();
};

// 生命周期钩子
onMounted(() => {
  init();
  animate(); // 启动动画循环
  
  // 设置初始鼠标样式
  container.value.style.cursor = 'grab';
  
  // 添加鼠标事件监听
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
  
  // 检测移动设备
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  
  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement;
  });
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
  
  // 移除全局鼠标释放监听
  document.removeEventListener('mouseup', onMouseUp);
  
  document.removeEventListener('fullscreenchange', () => {});
});

// 暴露方法给父组件
defineExpose({
  loadTexture: (imageUrl) => {
    // ... 加载纹理的代码 ...
  },
  setView: (lon, lat, fov) => {
    // ... 设置视角的代码 ...
  },
  resetView,
  toggleFullscreen,
  toggleVRMode
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

/* 改进热���容器样式 */
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

/* 添加新的样式 */
.virtual-controls {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 100;
}

.direction-controls {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.control-btn {
  width: 40px;
  height: 40px;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  backdrop-filter: blur(4px);
}

.control-btn:hover {
  background: rgba(0, 0, 0, 0.7);
}

.minimap {
  position: absolute;
  bottom: 20px;
  left: 20px;
  width: 150px;
  height: 150px;
  border-radius: 8px;
  overflow: hidden;
  z-index: 100;
}

.minimap canvas {
  width: 100%;
  height: 100%;
}
</style> 