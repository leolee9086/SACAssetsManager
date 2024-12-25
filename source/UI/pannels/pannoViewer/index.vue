<template>
  <div class="fn__flex-column cc-viewer-container">
    <div class="fn__flex fn__flex-1">
      <!-- 左侧工具栏 -->
      <div class="tools-bar">
        <div class="tool-group">
          <div class="tool-item" :class="{ active: currentTool === 'view' }" @click="handleToolClick('view')">
            <i class="icon">👁️</i>
            <span>查看</span>
          </div>
          <div class="tool-item" :class="{ active: currentTool === 'settings' }" @click="handleToolClick('settings')">
            <i class="icon">⚙️</i>
            <span>设置</span>
          </div>
          <div class="tool-item" :class="{ active: currentTool === 'hotspots' }" @click="handleToolClick('hotspots')">
            <i class="icon">📍</i>
            <span>热点</span>
          </div>
          <div class="tool-item" :class="{ active: currentTool === 'scenes' }" @click="handleToolClick('scenes')">
            <i class="icon">🖼️</i>
            <span>场景</span>
          </div>
        </div>
      </div>

      <!-- 左侧面板 -->
      <div class="left-panel">
        <div class="section-title">{{ getPanelTitle }}</div>
        <div class="panel-content">
          <!-- 查看面板 -->
          <template v-if="currentTool === 'view'">
            <div class="system-info">
              <div>FOV: {{ cameraFov.toFixed(2) }}°</div>
              <div>经度: {{ lon.toFixed(2) }}°</div>
              <div>纬度: {{ lat.toFixed(2) }}°</div>
            </div>
            
        

            <!-- 添加控制选项 -->
            <div class="control-options">
              <h3>查看选项</h3>
              <div class="option-item">
                <label>自动旋转</label>
                <input type="checkbox" v-model="autoRotate">
              </div>
              <div class="option-item">
                <label>旋转速度</label>
                <input type="range" min="0" max="100" v-model="rotateSpeed">
              </div>
              <div class="option-item">
                <label>投影模式</label>
                <select v-model="projectionMode">
                  <option value="sphere">球形</option>
                  <option value="cylinder">圆柱形</option>
                </select>
              </div>
            </div>
          </template>

          <!-- 热点面板 -->
          <template v-if="currentTool === 'hotspots'">
            <div class="hotspots-panel">
              <div class="panel-header">
                <button class="add-btn" @click="startAddHotspot">添加热点</button>
              </div>
              <div class="hotspots-list">
                <template v-if="currentSceneHotspots.length">
                  <div v-for="(hotspot, index) in currentSceneHotspots" 
                       :key="index" 
                       class="hotspot-item">
                    <div class="hotspot-info">
                      <span class="hotspot-name">{{ hotspot.name }}</span>
                      <span class="hotspot-coords">
                        经度: {{ hotspot.lon.toFixed(1) }}° 
                        纬度: {{ hotspot.lat.toFixed(1) }}°
                      </span>
                    </div>
                    <div class="hotspot-actions">
                      <button @click="editHotspot(index)" class="action-btn">编辑</button>
                      <button @click="deleteHotspot(index)" class="delete-btn">×</button>
                    </div>
                  </div>
                </template>
                <div v-else class="empty-tip">暂无热点，点击添加按钮创建</div>
              </div>
            </div>
          </template>

          <!-- 场景面板 -->
          <template v-if="currentTool === 'scenes'">
            <div class="scenes-panel">
              <div class="panel-header">
                <div class="upload-btn">
                  <input type="file" accept="image/*" @change="handleFileUpload" ref="fileInput" class="file-input" />
                  <button @click="triggerFileInput">添加场景</button>
                </div>
              </div>
              <div class="scenes-list">
                <template v-if="scenes.length > 0">
                  <div v-for="(scene, index) in scenes" 
                       :key="index" 
                       class="scene-item"
                       @click="switchScene(scene)">
                    <div class="scene-thumbnail">
                      <img :src="scene.thumbnail" :alt="scene.name">
                    </div>
                    <div class="scene-info">
                      <span class="scene-name">{{ scene.name || `场景 ${index + 1}` }}</span>
                      <button @click.stop="deleteScene(index)" class="delete-btn">×</button>
                    </div>
                  </div>
                </template>
                <div v-else class="empty-tip">暂无场景，点击添加按钮创建</div>
              </div>
            </div>
          </template>

          <!-- 设置面板 -->
          <template v-if="currentTool === 'settings'">
            <div class="settings-panel">
              <!-- 其他设置选项 -->
            </div>
          </template>
        </div>
      </div>

      <!-- 主画布区域 -->
      <div class="fn__flex fn__flex-1 fn__flex-column canvas-wrapper">
        <!-- 添加顶部控制栏 -->
        <div class="canvas-toolbar">
          <div class="toolbar-group">
            <button class="toolbar-btn" title="重置视角">
              <i class="icon">🔄</i>
            </button>
            <button class="toolbar-btn" title="VR模式">
              <i class="icon">🥽</i>
            </button>
            <button class="toolbar-btn" title="全屏" @click="toggleFullscreen">
              <i class="icon">{{ isFullscreen ? '⛶' : '⛶' }}</i>
            </button>
          </div>
        </div>

        <div class="canvas-container" ref="container">
          <canvas ref="canvas"></canvas>
          
          <!-- 热点容器 -->
          <div class="hotspots-container">
            <div v-for="(hotspot, index) in currentSceneHotspots" 
                 :key="index"
                 class="hotspot-marker"
                 :data-hotspot-id="hotspot.id"
                 @click="handleHotspotClick(hotspot)">
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
      </div>
    </div>

    <CCDialog
      v-model:visible="showAddDialog"
      title="添加视点"
      width="320px"
      height="180px"
    >
      <template #default="{ close }">
        <div class="b3-dialog__content">
          <input 
            v-model="newViewpointName"
            class="b3-text-field fn__block" 
            placeholder="请输入视点名称"
          >
          <div class="fn__hr"></div>
          <div class="fn__flex">
            <div class="fn__flex-1"></div>
            <button 
              class="b3-button b3-button--cancel" 
              @click="close"
            >取消</button>
            <div class="fn__space"></div>
            <button 
              class="b3-button b3-button--text"
              @click="handleConfirmAdd"
            >确定</button>
          </div>
        </div>
      </template>
    </CCDialog>

    <CCDialog
      v-model:visible="showHotspotDialog"
      :title="editingHotspot ? '编辑热点' : '添加热点'"
      width="400px"
      height="auto"
    >
      <template #default="{ close }">
        <div class="b3-dialog__content">
          <div class="form-item">
            <label>热点名称</label>
            <input 
              v-model="hotspotForm.name"
              class="b3-text-field fn__block" 
              placeholder="请输入热点名称"
            >
          </div>
          
          <div class="form-item">
            <label>目标场景</label>
            <select v-model="hotspotForm.targetSceneId" class="b3-select fn__block">
              <option value="">不跳转</option>
              <option v-for="scene in scenes" 
                      :key="scene.id" 
                      :value="scene.id">
                {{ scene.name }}{{ scene.id === currentSceneId ? ' (当前场景)' : '' }}
              </option>
            </select>
          </div>
          
          <template v-if="hotspotForm.targetSceneId">
            <div class="form-item">
              <label>目标视角</label>
              <div class="target-view">
                <div class="view-coords">
                  <span>经度: {{ hotspotForm.targetLon.toFixed(1) }}°</span>
                  <span>纬度: {{ hotspotForm.targetLat.toFixed(1) }}°</span>
                </div>
                <button class="b3-button" @click="captureCurrentView">使用当前视角</button>
              </div>
            </div>
          </template>

          <div class="fn__hr"></div>
          <div class="fn__flex">
            <div class="fn__flex-1"></div>
            <button class="b3-button b3-button--cancel" @click="close">取消</button>
            <div class="fn__space"></div>
            <button class="b3-button b3-button--text" @click="handleSaveHotspot(close)">确定</button>
          </div>
        </div>
      </template>
    </CCDialog>
  </div>
</template>

<script setup>
import * as THREE from '../../../../static/three/three.mjs';
import { ref, onMounted, onBeforeUnmount, shallowRef, computed, watch, nextTick } from 'vue';
import CCDialog from '../../components/CCDialog.vue';
import { worldToScreen, createSmoothAnimation, fullscreenUtils } from './utils.js';



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
const lon = ref(0);
const lat = ref(0);
const onPointerDownLon = ref(0);
const onPointerDownLat = ref(0);

// 添加文件输入引用
const fileInput = ref(null);

// 添加 resizeObserver 引用
const resizeObserver = shallowRef(null);

// 添加系统信息状态
const showSystemInfo = ref(true);
const cameraFov = ref(75); // 初始FOV值

// 添加工具相关的状态
const currentTool = ref('scenes') // 改为默认显示场景工具

// 添加工具点击处理函数
const handleToolClick = (tool) => {
  currentTool.value = tool
}

// 热点相关状态
const isAddingHotspot = ref(false);
const editingHotspot = ref(null);
const showHotspotDialog = ref(false);
const hotspotForm = ref({
  name: '',
  targetSceneId: '',
  targetLon: 0,
  targetLat: 0,
  lon: 0,
  lat: 0
});


// 添加面板标题计算属性
const getPanelTitle = computed(() => {
  const titles = {
    view: '全景信息',
    settings: '全景设置'
  }
  return titles[currentTool.value] || ''
})

// 添加触发文件选择的方法
const triggerFileInput = () => {
  fileInput.value.click();
};

// 添加文件上传处理方法
const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (file) {
    const imageUrl = URL.createObjectURL(file);
    const sceneId = Date.now().toString(); // 简单的ID生成
    
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 160;
      canvas.height = 90;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // 添加新场景，包含热点数组
      scenes.value.push({
        id: sceneId,
        name: file.name.split('.')[0],
        url: imageUrl,
        thumbnail: canvas.toDataURL('image/jpeg', 0.7),
        hotspots: []
      });
      
      // 如果是第一个场景，设置为当前场景
      if (scenes.value.length === 1) {
        currentSceneId.value = sceneId;
        loadPanorama(imageUrl);
      }
    };
    
    event.target.value = '';
  }
};

// 添加加载全景图的方法
const loadPanorama = (imageUrl) => {
  const textureLoader = new THREE.TextureLoader();
  textureLoader.load(
    imageUrl,
    (newTexture) => {
      if (texture.value) {
        texture.value.dispose();
      }
      
      newTexture.colorSpace = THREE.SRGBColorSpace;
      texture.value = newTexture;
      
      // 重置相机朝向到中心位置
      lon.value = 180;
      lat.value = 0;
      
      if (scene.value) {
        const mesh = scene.value.children[0];
        if (mesh && mesh.material) {
          const newMaterial = new THREE.MeshBasicMaterial({
            map: texture.value,
            side: THREE.DoubleSide,
            toneMapped: false
          });
          
          mesh.material.dispose();
          mesh.material = newMaterial;
        }
      }
      
      // 确保在材质更新后立即更新热点位置
      nextTick(() => {
        updateHotspotsPositions();
      });
    },
    undefined,
    (error) => {
      console.error('加载全景图出错:', error);
    }
  );
};

// 添加调整大小的方法
const onResize = () => {
  if (container.value && renderer.value && camera.value) {
    const width = container.value.clientWidth;
    const height = container.value.clientHeight;
    
    // 更新相机宽高比
    camera.value.aspect = width / height;
    camera.value.updateProjectionMatrix();
    
    // 更新渲染器尺寸
    renderer.value.setSize(width, height);
  }
};

// 方法
const init = () => {
  // 创建场景
  scene.value = new THREE.Scene();
  
  // 创建��机
  camera.value = new THREE.PerspectiveCamera(75, 1, 1, 1000); // 初始宽高比设为1，稍后会更新
  
  // 创建渲染器
  renderer.value = new THREE.WebGLRenderer({
    canvas: canvas.value,
    antialias: true
  });
  
  // 设置渲染器的输出编码
  renderer.value.outputColorSpace = THREE.SRGBColorSpace;
  
  // 初始化时调用一次 onResize
  onResize();
  
  // 创建球体几何体
  const geometry = new THREE.SphereGeometry(500, 60, 40);
  geometry.scale(-1, 1, 1); // 将纹理翻转到球体内部
  
  // 修改材质设置
  const material = new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide,
    toneMapped: false,
    transparent: true,  // 添加透明支持
    opacity: 1,        // 确保完全不透明
    depthWrite: true,  // 确保正确的深度写入
    depthTest: true    // 确保正确的深度测试
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  scene.value.add(mesh);
  
  // 添加调试信息
  console.log('场景初始化:', {
    sceneChildren: scene.value.children.length,
    materialType: material.type
  });
  
  // 添加事件监听
  container.value.addEventListener('mousedown', onMouseDown);
  container.value.addEventListener('mousemove', onMouseMove);
  container.value.addEventListener('mouseup', onMouseUp);
  container.value.addEventListener('wheel', onMouseWheel);
  
  // 设置初始视角
  lon.value = 180;
  lat.value = 0;
};

// 添加控制选项相关的状态
const autoRotate = ref(false);
const rotateSpeed = ref(50);
const projectionMode = ref('sphere');

// 修改 update 方法以支持自动旋转
const update = () => {
  if (autoRotate.value && !isUserInteracting.value) {
    // 根据 rotateSpeed 调整旋转速度
    const speed = (rotateSpeed.value / 50) * 0.1; // 将 0-100 的值映射到合适的旋转速度
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
};

// 修改 animate 函数来确保每帧更新热点位置
const animate = () => {
  requestAnimationFrame(animate);
  update();
  
  // 更新所有热点的位置
  updateHotspotsPositions();
};

// 添加热点位置更新函数
const updateHotspotsPositions = () => {
  if (!camera.value || !container.value) return;
  
  currentSceneHotspots.value.forEach((hotspot) => {
    const { x, y, visible } = worldToScreen(hotspot.lon, hotspot.lat, camera.value, container.value);
    
    const element = container.value.querySelector(`[data-hotspot-id="${hotspot.id}"]`);
    if (element) {
      element.style.transform = `translate(${x}px, ${y}px)`;
      element.style.display = visible ? 'block' : 'none';
    }
  });
};

const onMouseDown = (event) => {
  isUserInteracting.value = true;
  onPointerDownMouseX.value = event.clientX;
  onPointerDownMouseY.value = event.clientY;
  onPointerDownLon.value = lon.value;
  onPointerDownLat.value = lat.value;
};

const onMouseMove = (event) => {
  if (isUserInteracting.value) {
    lon.value = (onPointerDownMouseX.value - event.clientX) * 0.1 + onPointerDownLon.value;
    lat.value = (event.clientY - onPointerDownMouseY.value) * 0.1 + onPointerDownLat.value;
  }
};

const onMouseUp = () => {
  isUserInteracting.value = false;
};

const onMouseWheel = (event) => {
  const fov = camera.value.fov + event.deltaY * 0.05;
  camera.value.fov = THREE.MathUtils.clamp(fov, 30, 90);
  camera.value.updateProjectionMatrix();
  // 更新FOV状态
  cameraFov.value = camera.value.fov;
};

// 视点相关的状态
const viewpoints = ref([]);
const showAddDialog = ref(false);
const newViewpointName = ref('');


const handleConfirmAdd = () => {
  if (newViewpointName.value) {
    viewpoints.value.push({
      name: newViewpointName.value,
      lon: lon.value,
      lat: lat.value,
      fov: cameraFov.value
    });
    newViewpointName.value = ''; // 清空输入
    showAddDialog.value = false;
  }
};



// 添加全屏相关的状态
const isFullscreen = ref(false);

// 添加全屏切换方法
const toggleFullscreen = async () => {
  try {
    if (!isFullscreen.value) {
      await fullscreenUtils.enter(container.value);
    } else {
      await fullscreenUtils.exit();
    }
  } catch (error) {
    console.error('全屏切换失败:', error);
  }
};

// 监听全屏变化
const handleFullscreenChange = () => {
  isFullscreen.value = !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.msFullscreenElement
  );
};

// 监听投影模式变化
watch(projectionMode, (newMode) => {
  // 这里可以添加切换投影模式的逻辑
  console.log('投影模式改变:', newMode);
});

// 添加场景相关状态
const scenes = ref([]);
// 添加当前场景ID
const currentSceneId = ref(null);

// 获取当前场景的热点列表
const currentSceneHotspots = computed(() => {
  const currentScene = scenes.value.find(s => s.id === currentSceneId.value);
  return currentScene?.hotspots || [];
});

// 修改场景切换方法
const switchScene = async (targetScene) => {
  // 创建新的纹理加载器
  const textureLoader = new THREE.TextureLoader();
  
  // 创建一个 Promise 来处理纹理加载
  const loadTexture = () => {
    return new Promise((resolve) => {
      textureLoader.load(targetScene.url, (newTexture) => {
        newTexture.colorSpace = THREE.SRGBColorSpace;
        resolve(newTexture);
      });
    });
  };

  // 定义加载新场景的函数
  const loadNewScene = async () => {
    const newTexture = await loadTexture();
    
    currentSceneId.value = targetScene.id;
    
    if (texture.value) {
      texture.value.dispose();
    }
    texture.value = newTexture;

    // 创建新材质，设置背景色为白色
    const newMaterial = new THREE.MeshBasicMaterial({
      map: texture.value,
      side: THREE.DoubleSide,
      toneMapped: false,
      transparent: true,
      opacity: 0,
      color: 0xffffff  // 改为白色
    });

    // 更新网格材质
    if (scene.value?.children[0]) {
      const mesh = scene.value.children[0];
      if (mesh.material) {
        mesh.material.dispose();
      }
      mesh.material = newMaterial;

      // 淡入新场景
      const duration = 500;
      const startTime = performance.now();

      const fadeIn = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        newMaterial.opacity = progress;
        
        if (progress < 1) {
          requestAnimationFrame(fadeIn);
        }
      };
      
      requestAnimationFrame(fadeIn);
    }
  };

  // 淡出当前场景，设置背景色为白色
  if (scene.value?.children[0]?.material) {
    const material = scene.value.children[0].material;
    material.color = new THREE.Color(0xffffff);  // 改为白色
    const startOpacity = 1;
    const duration = 500;
    const startTime = performance.now();

    const fadeOut = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      material.opacity = startOpacity * (1 - progress);
      
      if (progress < 1) {
        requestAnimationFrame(fadeOut);
      } else {
        // 淡出完成后加载新场景
        loadNewScene();
      }
    };
    
    requestAnimationFrame(fadeOut);
  } else {
    loadNewScene();
  }
};

// 添加删除场景方法
const deleteScene = (index) => {
  const scene = scenes.value[index];
  URL.revokeObjectURL(scene.url); // 释放URL
  scenes.value.splice(index, 1);
};

// 热点相关方法
const startAddHotspot = () => {
  isAddingHotspot.value = true;
};

// 处理场景点击添加热点
const handleCanvasClick = (event) => {
  if (!isAddingHotspot.value) return;
  
  const rect = container.value.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  const vector = new THREE.Vector3(x, y, 0.5);
  vector.unproject(camera.value);
  
  const phi = Math.atan2(Math.sqrt(vector.x * vector.x + vector.z * vector.z), vector.y);
  const theta = Math.atan2(vector.z, vector.x);
  
  const lat = 90 - THREE.MathUtils.radToDeg(phi);
  const lon = THREE.MathUtils.radToDeg(theta);
  
  // 重置表单
  hotspotForm.value = {
    name: `热点 ${currentSceneHotspots.value.length + 1}`,
    targetSceneId: '',
    targetLon: 0,
    targetLat: 0,
    lon,
    lat
  };
  
  isAddingHotspot.value = false;
  showHotspotDialog.value = true;
};

// 删除热点
const deleteHotspot = (index) => {
  const currentScene = scenes.value.find(s => s.id === currentSceneId.value);
  if (currentScene) {
    currentScene.hotspots.splice(index, 1);
  }
};

// 编辑热点
const editHotspot = (index) => {
  const hotspot = currentSceneHotspots.value[index];
  editingHotspot.value = hotspot;
  
  hotspotForm.value = {
    name: hotspot.name,
    targetSceneId: hotspot.targetSceneId || '',
    targetLon: hotspot.targetLon || 0,
    targetLat: hotspot.targetLat || 0,
    lon: hotspot.lon,
    lat: hotspot.lat
  };
  
  showHotspotDialog.value = true;
};

// 捕获当前视角
const captureCurrentView = () => {
  hotspotForm.value.targetLon = lon.value;
  hotspotForm.value.targetLat = lat.value;
};

// 保存热点
const handleSaveHotspot = (close) => {
  const hotspotData = {
    id: editingHotspot.value?.id || Date.now().toString(),
    name: hotspotForm.value.name,
    lon: hotspotForm.value.lon,
    lat: hotspotForm.value.lat,
    targetSceneId: hotspotForm.value.targetSceneId,
    targetLon: hotspotForm.value.targetLon,
    targetLat: hotspotForm.value.targetLat
  };

  const currentScene = scenes.value.find(s => s.id === currentSceneId.value);
  if (currentScene) {
    if (editingHotspot.value) {
      // 更新现有热点
      const index = currentScene.hotspots.findIndex(h => h.id === editingHotspot.value.id);
      if (index !== -1) {
        currentScene.hotspots[index] = hotspotData;
      }
    } else {
      // 添加新热点
      currentScene.hotspots.push(hotspotData);
    }
  }

  editingHotspot.value = null;
  close();
};

// 修改热点点击处理
const handleHotspotClick = async (hotspot) => {
  if (hotspot.targetSceneId) {
    const targetScene = scenes.value.find(s => s.id === hotspot.targetSceneId);
    if (targetScene) {
      // 切换到目标场景
      await switchScene(targetScene);
      
      // 场景加载完成后,平滑过渡到目标视角
      const startLon = lon.value;
      const startLat = lat.value;
      const duration = 1000;
      const startTime = performance.now();

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // 使用缓动函数
        const easeProgress = 1 - Math.pow(1 - progress, 3);

        lon.value = startLon + (hotspot.targetLon - startLon) * easeProgress;
        lat.value = startLat + (hotspot.targetLat - startLat) * easeProgress;

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }
  }
};

// 生命周期钩子
onMounted(() => {
  init();
  animate();
  
  // 创建并动 ResizeObserver
  resizeObserver.value = new ResizeObserver(onResize);
  resizeObserver.value.observe(container.value);
  
  // 添加全屏变化事件监听
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.addEventListener('msfullscreenchange', handleFullscreenChange);
  
  container.value.addEventListener('click', handleCanvasClick);
});

onBeforeUnmount(() => {
  // 清理资源
  if (resizeObserver.value) {
    resizeObserver.value.disconnect();
  }
  scene.value.dispose();
  renderer.value.dispose();
  if (texture.value) {
    texture.value.dispose();
  }
  
  // 移除事件监听
  container.value.removeEventListener('mousedown', onMouseDown);
  container.value.removeEventListener('mousemove', onMouseMove);
  container.value.removeEventListener('mouseup', onMouseUp);
  container.value.removeEventListener('wheel', onMouseWheel);
  
  // 移除全屏变化事件监听
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.removeEventListener('msfullscreenchange', handleFullscreenChange);
  
  container.value.removeEventListener('click', handleCanvasClick);
});
</script>

<style scoped>

.cc-viewer-container {
  height: 100%;
  width: 100%;
}

/* 工具栏样式 */
.tools-bar {
  width: 80px;
  min-width: 80px;
  background: var(--cc-theme-surface);
  border-right: 1px solid var(--cc-border-color);
  display: flex;
  flex-direction: column;
  padding: 12px 0;
}

.tool-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.tool-item .icon {
  font-size: 20px;
  line-height: 1;
  margin-bottom: 4px;
}

.tool-item span {
  font-size: 12px;
  color: var(--cc-theme-on-background);
}

.tool-item:hover {
  background-color: var(--cc-theme-surface-hover);
}

.tool-item.active {
  background-color: var(--cc-theme-surface-hover);
  position: relative;
}

.tool-item.active::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background-color: var(--cc-theme-primary);
}

/* 左侧面板样式 */
.left-panel {
  width: 280px;
  min-width: 280px;
  background: var(--cc-theme-surface);
  border-right: 1px solid var(--cc-border-color);
  display: flex;
  flex-direction: column;
}

.section-title {
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 500;
  border-bottom: 1px solid var(--cc-border-color);
}

.panel-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

/* 画布区域样式 */
.canvas-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #f0f0f0;
}

.canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  background-image: linear-gradient(45deg, #80808010 25%, transparent 25%),
    linear-gradient(-45deg, #80808010 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #80808010 75%),
    linear-gradient(-45deg, transparent 75%, #80808010 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
}

canvas {
  width: 100%;
  height: 100%;
  display: block;
}

/* 系统信息样式 */
.system-info {
  background-color: var(--cc-theme-surface-light);
  padding: 12px;
  border-radius: var(--cc-border-radius);
  font-family: monospace;
}

.system-info div {
  margin: 4px 0;
}

/* 设置面板样式 */
.settings-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.upload-btn button {
  width: 100%;
  padding: 8px 16px;
  background-color: var(--cc-theme-surface-light);
  border: 1px solid var(--cc-border-color);
  border-radius: var(--cc-border-radius);
  cursor: pointer;
  font-size: 14px;
}

.upload-btn button:hover {
  background-color: var(--cc-theme-surface-hover);
}

.file-input {
  display: none;
}

.viewpoints-section {
  margin-top: 16px;
}

.viewpoints-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.viewpoints-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
}

.add-viewpoint-btn {
  padding: 4px 8px;
  font-size: 12px;
  background-color: var(--cc-theme-primary);
  color: white;
  border: none;
  border-radius: var(--cc-border-radius);
  cursor: pointer;
}

.viewpoints-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.viewpoint-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: var(--cc-theme-surface-light);
  border-radius: var(--cc-border-radius);
  cursor: pointer;
}

.viewpoint-item:hover {
  background-color: var(--cc-theme-surface-hover);
}

.delete-btn {
  padding: 2px 6px;
  background: none;
  border: none;
  color: var(--cc-theme-on-background);
  cursor: pointer;
  font-size: 16px;
}

.delete-btn:hover {
  color: var(--cc-theme-error);
}

/* 新增样式 */
.canvas-toolbar {
  padding: 8px;
  background: rgba(0, 0, 0, 0.5);
  position: absolute;
  top: 0;
  right: 0;
  z-index: 100;
  border-radius: 0 0 0 8px;
}

.toolbar-group {
  display: flex;
  gap: 8px;
}

.toolbar-btn {
  background: none;
  border: none;
  color: white;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
}

.toolbar-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

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
}

.zoom-controls {
  display: flex;
  gap: 4px;
  margin-top: 8px;
  justify-content: center;
}

.minimap {
  position: absolute;
  bottom: 20px;
  left: 20px;
  width: 150px;
  height: 150px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  z-index: 100;
}

.control-options {
  margin-top: 16px;
  padding: 16px;
  background: var(--cc-theme-surface-light);
  border-radius: var(--cc-border-radius);
}

.option-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 8px 0;
}

.panel-header {
  margin-bottom: 16px;
}

.add-btn {
  padding: 8px 16px;
  background: var(--cc-theme-primary);
  color: white;
  border: none;
  border-radius: var(--cc-border-radius);
  cursor: pointer;
}

.empty-tip {
  text-align: center;
  color: var(--cc-theme-on-surface-variant);
  padding: 32px 16px;
}

/* 全屏时的样式调整 */
.canvas-container:fullscreen {
  background-color: #000;
}

.canvas-container:-webkit-full-screen {
  background-color: #000;
}

.canvas-container:-ms-fullscreen {
  background-color: #000;
}

/* 添加场景列表样式 */
.scenes-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.scene-item {
  cursor: pointer;
  border-radius: var(--cc-border-radius);
  overflow: hidden;
  background: var(--cc-theme-surface-light);
  transition: transform 0.2s;
}

.scene-item:hover {
  transform: translateY(-2px);
}

.scene-thumbnail {
  aspect-ratio: 16/9;
  overflow: hidden;
}

.scene-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scene-info {
  padding: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.scene-name {
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 热点相关样式 */
.hotspots-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.hotspot-marker {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
  will-change: transform;
  pointer-events: auto;
  cursor: pointer;
}

.hotspot-content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translate(-50%, -50%);
}

.hotspot-icon {
  font-size: 24px;
  line-height: 1;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.hotspot-label {
  background: rgba(0,0,0,0.7);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  margin-top: 4px;
  white-space: nowrap;
}

.hotspot-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0,0,0,0.7);
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  pointer-events: none;
}

.hotspot-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--cc-theme-surface-light);
  border-radius: var(--cc-border-radius);
  margin-bottom: 8px;
}

.hotspot-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hotspot-name {
  font-weight: 500;
}

.hotspot-coords {
  font-size: 12px;
  color: var(--cc-theme-on-surface-variant);
}

.hotspot-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 4px 8px;
  font-size: 12px;
  background: var(--cc-theme-surface);
  border: 1px solid var(--cc-border-color);
  border-radius: var(--cc-border-radius);
  cursor: pointer;
}

.action-btn:hover {
  background: var(--cc-theme-surface-hover);
}

/* 添加表单样式 */
.form-item {
  margin-bottom: 16px;
}

.form-item label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.target-view {
  display: flex;
  align-items: center;
}

/* 添加禁用选择的样式 */
.b3-select option:disabled {
  color: var(--cc-theme-on-surface-variant);
  font-style: italic;
  background-color: var(--cc-theme-surface-light);
}
</style>
