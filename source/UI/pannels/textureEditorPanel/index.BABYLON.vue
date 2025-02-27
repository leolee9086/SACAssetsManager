<template>
  <div class="babylon-2d-container">
    <canvas ref="canvasRef" class="babylon-canvas"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import "https://cdn.babylonjs.com/babylon.js";

// 组件参数
const props = defineProps({
  // 元素数据数组
  elements: {
    type: Array,
    default: () => []
  },
  // 画布宽度
  width: {
    type: Number,
    default: 800
  },
  // 画布高度
  height: {
    type: Number,
    default: 600
  },
  // 背景颜色
  backgroundColor: {
    type: String,
    default: "black"
  }
});

// 组件事件
const emit = defineEmits([
  'element-click', 
  'canvas-click',
  'render-complete',
  'view-changed'
]);

// 引用和状态
const canvasRef = ref(null);
let engine = null;
let scene = null;
let camera = null;
let meshCache = new Map(); // 缓存创建的网格对象
let isZooming = false;
let isPanning = false;

// 视图状态
const viewState = ref({
  zoom: 1,
  offsetX: 0,
  offsetY: 0
});

// 初始化Babylon.js引擎和场景
const initBabylon = () => {
  
  // 创建引擎
  engine = new BABYLON.Engine(canvasRef.value, true, { preserveDrawingBuffer: true, stencil: true });
  
  // 创建场景
  scene = new BABYLON.Scene(engine);
  scene.clearColor = BABYLON.Color4.FromHexString(props.backgroundColor + "FF");
  
  // 创建正交相机
  camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 0, -5), scene);
  camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
  camera.minZ = -10; // 允许渲染更远的物体
  camera.maxZ = 10;  // 允许渲染更近的物体
  updateCameraOrtho();
  
  // 添加光源 (对于2D场景很简单)
  new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
  
  // 创建坐标网格
  createSimpleGrid();
  
  // 创建2D坐标轴
  create2DCoordinateAxes();
  
  // 设置交互功能
  setupInteraction();
  
  // 先创建点，后开始渲染循环
  createManyPoints(1000); // 先尝试1000个点
  
  engine.runRenderLoop(() => {
    scene.render();
  });
  
  // 响应窗口大小变化
  window.addEventListener("resize", onResize);
};

// 更新相机的正交参数
const updateCameraOrtho = () => {
  if (!camera || !engine) return;
  
  const aspectRatio = engine.getRenderWidth() / engine.getRenderHeight();
  const zoom = viewState.value.zoom;
  
  // 调整正交视图尺寸
  const orthoSize = 10 / zoom;
  camera.orthoTop = orthoSize;
  camera.orthoBottom = -orthoSize;
  camera.orthoLeft = -orthoSize * aspectRatio;
  camera.orthoRight = orthoSize * aspectRatio;
  
  // 应用平移偏移
  camera.position.x = viewState.value.offsetX;
  camera.position.y = viewState.value.offsetY;
  camera.position.z = -5; // 调整相机z轴位置
};

// 设置交互事件
const setupInteraction = () => {
  if (!scene || !canvasRef.value) return;
  
  // 点击事件处理
  scene.onPointerDown = (evt, pickResult) => {
    if (evt.button === 0) { // 左键
      if (pickResult.hit && pickResult.pickedMesh) {
        // 如果点击到元素
        const elementId = pickResult.pickedMesh.id;
        const element = props.elements.find(el => el.id === elementId);
        if (element) {
          emit('element-click', { element, event: evt });
        }
      } else {
        // 点击了空白区域
        emit('canvas-click', {
          x: evt.offsetX,
          y: evt.offsetY,
          event: evt
        });
      }
    } else if (evt.button === 1) { // 中键
      isPanning = true;
      lastMouseX = evt.clientX;
      lastMouseY = evt.clientY;
    } else if (evt.button === 2) { // 右键
      // 可以添加上下文菜单逻辑
    }
  };
  
  // 鼠标移动处理
  let lastMouseX = 0, lastMouseY = 0;
  scene.onPointerMove = (evt) => {
    if (isPanning) {
      // 计算鼠标移动的距离，转换为场景坐标
      const dx = (evt.clientX - lastMouseX) / (viewState.value.zoom * 50);
      const dy = (evt.clientY - lastMouseY) / (viewState.value.zoom * 50);
      
      // 更新平移偏移
      viewState.value.offsetX -= dx;
      viewState.value.offsetY += dy; // 注意这里是+，因为y轴在屏幕和3D坐标中是相反的
      
      // 更新相机
      updateCameraOrtho();
      
      // 记录新的鼠标位置
      lastMouseX = evt.clientX;
      lastMouseY = evt.clientY;
      
      emit('view-changed', { ...viewState.value });
    }
  };
  
  scene.onPointerUp = () => {
    isPanning = false;
  };
  
  // 添加鼠标滚轮缩放
  canvasRef.value.addEventListener('wheel', (evt) => {
    evt.preventDefault();
    
    // 计算缩放因子
    const delta = evt.deltaY;
    const zoomFactor = delta > 0 ? 0.9 : 1.1;
    
    // 更新缩放
    viewState.value.zoom *= zoomFactor;
    
    // 限制缩放范围
    viewState.value.zoom = Math.max(0.1, Math.min(viewState.value.zoom, 10));
    
    // 更新相机
    updateCameraOrtho();
    
    emit('view-changed', { ...viewState.value });
  }, { passive: false });
};

// 绘制所有元素
const renderElements = () => {
  if (!scene) return;
  
  // 清除旧元素（仅清除非系统元素）
  const meshesToRemove = [];
  scene.meshes.forEach(mesh => {
    if (!mesh.name.startsWith('system_')) {
      meshesToRemove.push(mesh);
    }
  });
  
  meshesToRemove.forEach(mesh => {
    mesh.dispose();
  });
  
  // 记录当前新创建的网格
  meshCache.clear();
  
  // 批量创建新元素
  props.elements.forEach(element => {
    createElementMesh(element);
  });
  
  emit('render-complete', { elementsCount: props.elements.length });
};

// 创建单个元素网格
const createElementMesh = (element) => {
  if (!element || !element.type || !scene) return null;
  
  let mesh = null;
  
  switch (element.type) {
    case 'rectangle':
      mesh = createRectangle(element);
      break;
    case 'circle':
      mesh = createCircle(element);
      break;
    case 'line':
      mesh = createLine(element);
      break;
    case 'text':
      mesh = createText(element);
      break;
    // 可以添加更多类型...
  }
  
  // 缓存创建的网格
  if (mesh && element.id) {
    meshCache.set(element.id, mesh);
  }
  
  return mesh;
};

// 创建矩形
const createRectangle = (config) => {
  const width = config.width || 1;
  const height = config.height || 1;
  const x = config.x || 0;
  const y = config.y || 0;
  const color = config.color || "#FF0000";
  const id = config.id || `rect_${Date.now()}`;
  
  // 创建平面
  const rectangle = BABYLON.MeshBuilder.CreatePlane(
    id,
    { width, height, sideOrientation: BABYLON.Mesh.DOUBLESIDE },
    scene
  );
  
  // 设置位置
  rectangle.position.x = x;
  rectangle.position.y = y;
  rectangle.position.z = 0;
  
  // 设置材质
  const material = new BABYLON.StandardMaterial(`${id}_material`, scene);
  material.diffuseColor = BABYLON.Color3.FromHexString(color);
  material.specularColor = new BABYLON.Color3(0, 0, 0); // 无镜面反射
  material.backFaceCulling = false;
  rectangle.material = material;
  
  // 设置可拾取
  rectangle.isPickable = config.isPickable !== false;
  
  // 其他属性
  if (config.opacity !== undefined) {
    material.alpha = config.opacity;
  }
  
  if (config.rotation) {
    rectangle.rotation.z = config.rotation * (Math.PI / 180); // 转换为弧度
  }
  
  return rectangle;
};

// 创建圆形
const createCircle = (config) => {
  const radius = config.radius || 1;
  const x = config.x || 0;
  const y = config.y || 0;
  const color = config.color || "#00FF00";
  const id = config.id || `circle_${Date.now()}`;
  
  // 创建圆盘
  const circle = BABYLON.MeshBuilder.CreateDisc(
    id,
    { radius, tessellation: 64, sideOrientation: BABYLON.Mesh.DOUBLESIDE },
    scene
  );
  
  // 设置位置
  circle.position.x = x;
  circle.position.y = y;
  circle.position.z = 0;
  
  // 设置材质
  const material = new BABYLON.StandardMaterial(`${id}_material`, scene);
  material.diffuseColor = BABYLON.Color3.FromHexString(color);
  material.specularColor = new BABYLON.Color3(0, 0, 0); // 无镜面反射
  material.backFaceCulling = false;
  circle.material = material;
  
  // 设置可拾取
  circle.isPickable = config.isPickable !== false;
  
  // 其他属性
  if (config.opacity !== undefined) {
    material.alpha = config.opacity;
  }
  
  return circle;
};

// 创建线段
const createLine = (config) => {
  const points = config.points || [new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(1, 1, 0)];
  const color = config.color || "#0000FF";
  const width = config.width || 1;
  const id = config.id || `line_${Date.now()}`;
  
  // 将点数组转换为Vector3数组
  const pathPoints = [];
  if (Array.isArray(points)) {
    // 处理不同点格式
    if (points.length >= 2) {
      if (typeof points[0] === 'number') {
        // 如果是平面数组 [x1, y1, x2, y2, ...]
        for (let i = 0; i < points.length; i += 2) {
          pathPoints.push(new BABYLON.Vector3(points[i], points[i+1], 0));
        }
      } else if (points[0].x !== undefined && points[0].y !== undefined) {
        // 如果是对象数组 [{x, y}, {x, y}, ...]
        for (let pt of points) {
          pathPoints.push(new BABYLON.Vector3(pt.x, pt.y, 0));
        }
      } else if (points[0] instanceof BABYLON.Vector3) {
        // 已经是Vector3数组
        pathPoints.push(...points);
      }
    }
  }
  
  if (pathPoints.length < 2) {
    return null; // 需要至少两个点才能创建线段
  }
  
  // 创建管状线条
  const line = BABYLON.MeshBuilder.CreateTube(
    id,
    {
      path: pathPoints,
      radius: width / 200, // 转换为合适的3D尺寸
      tessellation: 8,     // 管的多边形边数
      updatable: true
    },
    scene
  );
  
  // 设置材质
  const material = new BABYLON.StandardMaterial(`${id}_material`, scene);
  material.diffuseColor = BABYLON.Color3.FromHexString(color);
  material.specularColor = new BABYLON.Color3(0, 0, 0); // 无镜面反射
  material.backFaceCulling = false;
  line.material = material;
  
  // 设置可拾取
  line.isPickable = config.isPickable !== false;
  
  // 其他属性
  if (config.opacity !== undefined) {
    material.alpha = config.opacity;
  }
  
  return line;
};

// 创建文本
const createText = (config) => {
  const text = config.text || "";
  const x = config.x || 0;
  const y = config.y || 0;
  const color = config.color || "#000000";
  const fontSize = config.fontSize || 24;
  const id = config.id || `text_${Date.now()}`;
  
  // 创建动态纹理来渲染文本
  const textWidth = 1024;
  const textHeight = 256;
  const dynamicTexture = new BABYLON.DynamicTexture(`${id}_texture`, { width: textWidth, height: textHeight }, scene, true);
  dynamicTexture.hasAlpha = true;
  
  // 设置文本内容
  const font = `${fontSize}px Arial`;
  dynamicTexture.drawText(text, null, null, font, color, "transparent", true);
  
  // 创建平面来显示文本
  const plane = BABYLON.MeshBuilder.CreatePlane(
    id,
    { width: textWidth / 500, height: textHeight / 500, sideOrientation: BABYLON.Mesh.DOUBLESIDE },
    scene
  );
  
  // 设置位置
  plane.position.x = x;
  plane.position.y = y;
  plane.position.z = 0;
  
  // 设置材质
  const material = new BABYLON.StandardMaterial(`${id}_material`, scene);
  material.diffuseTexture = dynamicTexture;
  material.specularColor = new BABYLON.Color3(0, 0, 0); // 无镜面反射
  material.emissiveColor = new BABYLON.Color3(1, 1, 1); // 确保文本不受光照影响
  material.backFaceCulling = false;
  material.useAlphaFromDiffuseTexture = true; // 使用纹理的alpha通道
  plane.material = material;
  
  // 设置可拾取
  plane.isPickable = config.isPickable !== false;
  
  // 其他属性
  if (config.opacity !== undefined) {
    material.alpha = config.opacity;
  }
  
  if (config.rotation) {
    plane.rotation.z = config.rotation * (Math.PI / 180); // 转换为弧度
  }
  
  return plane;
};

// 创建简单网格
const createSimpleGrid = () => {
  if (!scene) return;
  
  // 网格参数
  const size = 20;
  const divisions = 20;
  const lineColor = new BABYLON.Color3(0.5, 0.5, 0.7);
  
  // 创建网格线
  const lines = [];
  const step = size / divisions;
  
  // 创建顶点
  for (let i = -size/2; i <= size/2; i += step) {
    // X线
    lines.push([
      new BABYLON.Vector3(i, -size/2, 0),
      new BABYLON.Vector3(i, size/2, 0)
    ]);
    
    // Y线
    lines.push([
      new BABYLON.Vector3(-size/2, i, 0),
      new BABYLON.Vector3(size/2, i, 0)
    ]);
  }
  
  // 为每条线创建线段
  const lineSystem = BABYLON.MeshBuilder.CreateLineSystem(
    "system_grid",
    { lines: lines },
    scene
  );
  
  // 设置颜色
  const material = new BABYLON.StandardMaterial("system_gridMaterial", scene);
  material.emissiveColor = lineColor;
  material.disableLighting = true;
  lineSystem.color = lineColor;
  
  // 禁用拾取
  lineSystem.isPickable = false;
  
  return lineSystem;
};

// 创建适合2D编辑器的坐标轴
const create2DCoordinateAxes = () => {
  if (!scene) return;
  
  const axisLength = 10;
  const axisParent = new BABYLON.TransformNode("system_2d_axes", scene);
  
  // 创建XY平面上的坐标轴（不显示Z轴）
  // X轴（红色）
  const xAxis = BABYLON.MeshBuilder.CreateLines(
    "system_axis_x", 
    { 
      points: [
        new BABYLON.Vector3(0, 0, 0),
        new BABYLON.Vector3(axisLength, 0, 0)
      ] 
    }, 
    scene
  );
  xAxis.color = new BABYLON.Color3(1, 0, 0); // 红色
  
  // Y轴（绿色）
  const yAxis = BABYLON.MeshBuilder.CreateLines(
    "system_axis_y", 
    { 
      points: [
        new BABYLON.Vector3(0, 0, 0),
        new BABYLON.Vector3(0, axisLength, 0)
      ] 
    }, 
    scene
  );
  yAxis.color = new BABYLON.Color3(0, 1, 0); // 绿色
  
  // 创建刻度线
  const tickSize = 0.2;
  const tickCount = 10;
  const tickStep = axisLength / tickCount;
  
  // X轴刻度
  for (let i = 1; i <= tickCount; i++) {
    const position = i * tickStep;
    const xTick = BABYLON.MeshBuilder.CreateLines(
      `system_axis_x_tick_${i}`,
      {
        points: [
          new BABYLON.Vector3(position, -tickSize/2, 0),
          new BABYLON.Vector3(position, tickSize/2, 0)
        ]
      },
      scene
    );
    xTick.color = new BABYLON.Color3(1, 0, 0); // 红色
    xTick.parent = axisParent;
    
    // 添加刻度值标签
    if (i % 2 === 0) { // 每隔一个刻度显示数值
      createAxisTickLabel(
        i.toString(), 
        new BABYLON.Vector3(position, -tickSize*1.5, 0), 
        new BABYLON.Color3(1, 0, 0)
      );
    }
  }
  
  // Y轴刻度
  for (let i = 1; i <= tickCount; i++) {
    const position = i * tickStep;
    const yTick = BABYLON.MeshBuilder.CreateLines(
      `system_axis_y_tick_${i}`,
      {
        points: [
          new BABYLON.Vector3(-tickSize/2, position, 0),
          new BABYLON.Vector3(tickSize/2, position, 0)
        ]
      },
      scene
    );
    yTick.color = new BABYLON.Color3(0, 1, 0); // 绿色
    yTick.parent = axisParent;
    
    // 添加刻度值标签
    if (i % 2 === 0) { // 每隔一个刻度显示数值
      createAxisTickLabel(
        i.toString(), 
        new BABYLON.Vector3(-tickSize*2, position, 0), 
        new BABYLON.Color3(0, 1, 0)
      );
    }
  }
  
  // 添加轴标签
  createAxisTickLabel("X", new BABYLON.Vector3(axisLength + 0.5, 0, 0), new BABYLON.Color3(1, 0, 0), 0.7);
  createAxisTickLabel("Y", new BABYLON.Vector3(0, axisLength + 0.5, 0), new BABYLON.Color3(0, 1, 0), 0.7);
  
  // 将坐标轴固定在左下角
  axisParent.position = new BABYLON.Vector3(-axisLength/2, -axisLength/2, 0.01);
  
  // 设置所有轴不可拾取
  xAxis.isPickable = false;
  yAxis.isPickable = false;
  xAxis.parent = axisParent;
  yAxis.parent = axisParent;
  
  return axisParent;
};

// 创建刻度标签
const createAxisTickLabel = (text, position, color, size = 0.4) => {
  if (!scene) return;
  
  // 创建动态纹理
  const textSize = 64;
  const dynamicTexture = new BABYLON.DynamicTexture(
    "system_tick_label_" + text, 
    { width: textSize, height: textSize }, 
    scene, 
    true
  );
  dynamicTexture.hasAlpha = true;
  
  // 设置文本内容
  dynamicTexture.drawText(text, null, null, "bold 48px Arial", 
    color.toHexString(), "transparent", true);
  
  // 创建平面显示文本
  const labelPlane = BABYLON.MeshBuilder.CreatePlane(
    "system_tick_label_plane_" + text, 
    { width: size, height: size }, 
    scene
  );
  labelPlane.position = position;
  
  // 设置材质
  const material = new BABYLON.StandardMaterial("system_tick_label_material_" + text, scene);
  material.diffuseTexture = dynamicTexture;
  material.specularColor = new BABYLON.Color3(0, 0, 0);
  material.emissiveColor = new BABYLON.Color3(1, 1, 1); // 使文本更亮
  material.backFaceCulling = false;
  material.useAlphaFromDiffuseTexture = true;
  labelPlane.material = material;
  
  // 禁用拾取
  labelPlane.isPickable = false;
  
  return labelPlane;
};

// 处理窗口大小调整
const onResize = () => {
  if (engine) {
    engine.resize();
    updateCameraOrtho();
  }
};

// 生命周期钩子
onMounted(() => {
  console.log("BABYLON对象可用:", typeof BABYLON !== 'undefined');
  console.log("Canvas元素:", canvasRef.value);
  initBabylon();
  renderElements();
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", onResize);
  
  // 清理Babylon资源
  if (scene) {
    scene.dispose();
  }
  
  if (engine) {
    engine.dispose();
  }
});

// 监听元素变化
watch(() => props.elements, () => {
  renderElements();
}, { deep: true });

// 暴露公共方法
defineExpose({
  zoomTo: (zoom) => {
    viewState.value.zoom = zoom;
    updateCameraOrtho();
  },
  panTo: (x, y) => {
    viewState.value.offsetX = x;
    viewState.value.offsetY = y;
    updateCameraOrtho();
  },
  getViewState: () => {
    return { ...viewState.value };
  },
  exportImage: () => {
    if (engine) {
      return engine.getRenderingCanvas().toDataURL();
    }
    return null;
  }
});

// 创建大量圆点的方法
const createManyPoints = (count) => {
  if (!scene) return;
  
  // 创建一个点材质
  const material = new BABYLON.StandardMaterial("pointMaterial", scene);
  material.emissiveColor = new BABYLON.Color3(1, 0, 0); // 明亮的红色
  material.disableLighting = true;
  
  // 创建一个简单的圆盘作为模板
  const points = [];
  
  for (let i = 0; i < count; i++) {
    // 创建一个圆盘
    const point = BABYLON.MeshBuilder.CreateDisc(`point${i}`, {
      radius: 0.1,
      tessellation: 4, // 使用较低的细节以提高性能
    }, scene);
    
    // 设置位置
    point.position.x = (Math.random() * 16) - 8;
    point.position.y = (Math.random() * 16) - 8;
    point.position.z = 2; // 确保在其他所有内容前面
    
    // 应用材质
    point.material = material;
    
    points.push(point);
    
    // 每创建100个点输出一次日志
    if (i % 100 === 0) {
      console.log(`Created ${i} points`);
    }
  }
  
  console.log("Finished creating all points");
  return points;
};
</script>

<style scoped>
.babylon-2d-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.babylon-canvas {
  width: 100%;
  height: 100%;
  touch-action: none;
}
</style>