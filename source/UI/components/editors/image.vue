<template>
  <div class="image-editor">
    <canvas ref="connectionCanvas" class="connection-canvas"></canvas>
    
    <!-- 动态渲染卡片 -->
    <template v-for="card in config.cards" :key="card.id">
      <cardContainer 
        :title="card.title" 
        :position="card.position"
        :data-card-id="card.id">
             <component 
          :is="componentMap[card.type]"
          v-bind="getComponentProps(card)"
          v-on="getComponentEvents(card)"
        />

      </cardContainer>
    </template>

    <InfoPanel :stats="systemStats" />
  </div>
</template>

<script setup>
import { ref, onMounted, provide, computed ,toRef,inject,onUnmounted,watch  } from 'vue';
import './nodeInterfaceTest.js'
//import editorConfig from './imageEditor.json';
const editorConfig ={
  "name": "图片编辑器",
  "cards": [
    {
      "id": "imageInput",
      "type": "localImageInput",
      "title": "图片输入",
      "position": {
        "x": 20,
        "y": 20,
        "width": 300,
        "height": 200
      }
    },
    {
      "id": "imageCompressor",
      "type": "ImageCompressor",
      "title": "图片压缩",
      "position": {
        "x": 20,
        "y": 220,
        "width": 300,
        "height": 200
      }
    },
    {
      "id": "imageComparison",
      "type": "ImageComparison",
      "title": "压缩结果",
      "position": {
        "x": 340,
        "y": 20,
        "width": 800,
        "height": 600
      }
    },
   
  ],
  "connections": [
    {
      "from": {
        "cardId": "imageInput",
        "anchorId": "output"
      },
      "to": {
        "cardId": "imageCompressor",
        "anchorId": "input"
      }
    },
    {
      "from": {
        "cardId": "imageCompressor",
        "anchorId": "output"
      },
      "to": {
        "cardId": "imageComparison",
        "anchorId": "input"
      }
    }
  ]
}
import { requirePluginDeps } from '../../../utils/module/requireDeps.js';
import CardContainer  from './containers/cardContainer.vue';
import ImageComparison from './ImageComparison.vue';
import LocalImageInput from './localImageInput.vue';
import ImageCompressor from './ImageCompressor.vue';
// 组件映射表
const componentMap = {
  localImageInput: LocalImageInput,
  ImageCompressor: ImageCompressor,
  ImageComparison: ImageComparison,
};

// 注册所有组件
const components = {
  CardContainer,
  ImageComparison,
  LocalImageInput,
  ImageCompressor,
  InfoPanel,
};

import InfoPanel from './InfoPanel.vue';
//用于流程构建和控制
import { 创建流程图, 添加节点, 添加动作, 添加连接, 触发动作,动作可触发} from '../../../utils/graph/PetriNet.js';
const sharp = requirePluginDeps('sharp')


const originalImage = ref('');
const compressedImage = ref('');
const container = ref(null);
const sliderPosition = ref(50);
const isDragging = ref(false);
const scalePercentage = ref(100);
const quality = ref(80);
const appData = toRef(inject('appData'))
const filePath = ref('');

// 定义流程图实例
const processNet = ref(null);

// 添加一个控制变量
const autoProcessEnabled = ref(false);

// 修改连线相关的状态管理
const connectionCanvas = ref(null);
const ctx = ref(null);
const anchors = ref(new Map()); // 存储所有锚点信息
const connections = ref([]); // 存储连线信息

// 配置相关
const config = ref(editorConfig);

// 组件属性映射
const componentPropsMap = {
  localImageInput: {
    props: ['filePath'],
    events: ['fileSelected', 'update:filePath']
  },
  ImageCompressor: {
    props: ['source'],
    events: ['update:compressed']
  },
  ImageComparison: {
    props: ['originalImage', 'processedImage'],
    events: ['load']
  },
  ProcessControl: {
    props: ['enabled'],
    events: ['toggle']
  }
};

// 获取组件属性
const getComponentProps = (card) => {
  const baseProps = componentPropsMap[card.type]?.props || [];
  const props = {};
  
  // 根据组件类型设置特定属性
  switch (card.type) {
    case 'localImageInput':
      props.filePath = filePath.value;
      break;
    case 'ImageCompressor':
      props.source = originalImage.value;
      break;
    case 'ImageComparison':
      props.originalImage = originalImage.value;
      props.processedImage = compressedImage.value;
      break;
    case 'ProcessControl':
      props.enabled = autoProcessEnabled.value;
      break;
  }
  
  return props;
};

// 获取组件事件处理器
const getComponentEvents = (card) => {
  const events = {};
  
  switch (card.type) {
    case 'localImageInput':
      events['fileSelected'] = handleFileUpload;
      events['update:filePath'] = (val) => filePath.value = val;
      break;
    case 'ImageCompressor':
      events['update:compressed'] = handleCompressed;
      break;
    case 'ImageComparison':
      events['load'] = handleComparisonLoad;
      break;
    case 'ProcessControl':
      events['toggle'] = toggleAutoProcess;
      break;
  }
  
  return events;
};

// 注册锚点的方法
const registerGlobalAnchor = (cardId, anchorConfig) => {
  const key = `${cardId}-${anchorConfig.id}`;
  anchors.value.set(key, {
    ...anchorConfig,
    cardId,
    position: null // 将在更新位置时设置
  });
};

// 提供给子组件的方法
provide('registerGlobalAnchor', registerGlobalAnchor);


// 绘制连线
const drawConnections = () => {
  if (!ctx.value) return;
  
  const canvas = connectionCanvas.value;
  ctx.value.clearRect(0, 0, canvas.width, canvas.height);
  
  // 设置连线样式
  ctx.value.strokeStyle = '#409EFF';
  ctx.value.lineWidth = 2;
  
  connections.value.forEach(conn => {
    const startAnchor = anchors.value.get(conn.start);
    const endAnchor = anchors.value.get(conn.end);
    
    if (startAnchor?.position && endAnchor?.position) {
      drawBezierConnection(
        startAnchor.position,
        endAnchor.position,
        startAnchor.side,
        endAnchor.side
      );
    }
  });
};

// 改进的贝塞尔曲线连线绘制
const drawBezierConnection = (start, end, startSide, endSide) => {
  ctx.value.beginPath();
  ctx.value.moveTo(start.x, start.y);

  // 计算控制点的偏移量
  const offset = 50; // 控制曲线的弯曲程度
  let cp1x, cp1y, cp2x, cp2y;

  // 根据锚点的方向调整控制点
  switch (startSide) {
    case 'right':
      cp1x = start.x + offset;
      cp1y = start.y;
      break;
    case 'left':
      cp1x = start.x - offset;
      cp1y = start.y;
      break;
    case 'top':
      cp1x = start.x;
      cp1y = start.y - offset;
      break;
    case 'bottom':
      cp1x = start.x;
      cp1y = start.y + offset;
      break;
    default:
      cp1x = start.x;
      cp1y = start.y;
  }

  switch (endSide) {
    case 'right':
      cp2x = end.x + offset;
      cp2y = end.y;
      break;
    case 'left':
      cp2x = end.x - offset;
      cp2y = end.y;
      break;
    case 'top':
      cp2x = end.x;
      cp2y = end.y - offset;
      break;
    case 'bottom':
      cp2x = end.x;
      cp2y = end.y + offset;
      break;
    default:
      cp2x = end.x;
      cp2y = end.y;
  }

  // 绘制贝塞尔曲线
  ctx.value.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, end.x, end.y);
  
  // 添加渐变效果
  const gradient = ctx.value.createLinearGradient(start.x, start.y, end.x, end.y);
  gradient.addColorStop(0, '#409EFF');
  gradient.addColorStop(1, '#67C23A');
  ctx.value.strokeStyle = gradient;
  
  // 绘制主线
  ctx.value.stroke();

  // 绘制箭头
  drawArrow(end, endSide);
};

// 添加箭头绘制函数
const drawArrow = (point, side) => {
  const arrowSize = 8;
  ctx.value.beginPath();
  
  // 根据锚点方向调整箭头方向
  switch (side) {
    case 'left':
      ctx.value.moveTo(point.x, point.y);
      ctx.value.lineTo(point.x + arrowSize, point.y - arrowSize);
      ctx.value.lineTo(point.x + arrowSize, point.y + arrowSize);
      break;
    case 'right':
      ctx.value.moveTo(point.x, point.y);
      ctx.value.lineTo(point.x - arrowSize, point.y - arrowSize);
      ctx.value.lineTo(point.x - arrowSize, point.y + arrowSize);
      break;
    case 'top':
      ctx.value.moveTo(point.x, point.y);
      ctx.value.lineTo(point.x - arrowSize, point.y + arrowSize);
      ctx.value.lineTo(point.x + arrowSize, point.y + arrowSize);
      break;
    case 'bottom':
      ctx.value.moveTo(point.x, point.y);
      ctx.value.lineTo(point.x - arrowSize, point.y - arrowSize);
      ctx.value.lineTo(point.x + arrowSize, point.y - arrowSize);
      break;
  }
  
  ctx.value.closePath();
  ctx.value.fillStyle = '#67C23A';
  ctx.value.fill();
};

// 设置 canvas 尺寸
const resizeCanvas = () => {
  const canvas = connectionCanvas.value;
  const editorElement = canvas.parentElement;
  const rect = editorElement.getBoundingClientRect();

  // 设置画布尺寸为编辑器容器的尺寸
  canvas.width = rect.width;
  canvas.height = rect.height;
  
  // 重新绘制连线
  drawConnections();
};

// 初始化 canvas 和连接
onMounted(() => {
  const canvas = connectionCanvas.value;
  ctx.value = canvas.getContext('2d');
  
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // 将配置文件中的连接转换为内部连接格式
  connections.value = config.value.connections.map(conn => ({
    start: `${conn.from.cardId}-${conn.from.anchorId}`,
    end: `${conn.to.cardId}-${conn.to.anchorId}`
  }));
});

// 清理事件监听
onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas);
});

// 初始化Petri网流程
const initProcessNet = () => {
  processNet.value = 创建流程图('图片压缩流程');
  
  // 添加节点
  添加节点(processNet.value, '开始', { type: 'start', tokens: 1 });
  添加节点(processNet.value, '已加载', { type: 'process', tokens: 0 });
  添加节点(processNet.value, '已处理', { type: 'process', tokens: 0 });
  添加节点(processNet.value, '完成', { type: 'end', tokens: 0 });
  
  // 添加动作
  添加动作(processNet.value, '加载图片动作', async (buffer) => {
    originalImage.value = await bufferToBase64Image(buffer);
    return buffer;
  });
  
  添加动作(processNet.value, '处理图片动作', async (buffer) => {
    compressedImage.value = await bufferToBase64Image(buffer, {
      scale: Number(scalePercentage.value),
      quality: Number(quality.value)
    });
    return true;
  });
  
  // 添加连接
  添加连接(processNet.value, '开始', '加载图片动作');
  添加连接(processNet.value, '加载图片动作', '已加载');
  添加连接(processNet.value, '已加载', '处理图片动作');
  添加连接(processNet.value, '处理图片动作', '已处理');
  添加连接(processNet.value, '已处理', '完成');
};

// 将文件转换为 buffer
const fileToBuffer = async (file) => {
  return await file.arrayBuffer();
};

// 将 buffer 转换为 base64 图片
const bufferToBase64Image = async (buffer, options = {}) => {
  try {
    const sharpInstance = sharp(buffer);
    const metadata = await sharpInstance.metadata();
    
    // 应用转换
    if (options.scale && options.scale !== 100) {
      const targetWidth = Math.round(metadata.width * (options.scale / 100));
      sharpInstance.resize({ width: targetWidth, withoutEnlargement: true });
    }

    if (options.quality) {
      // 确保 quality 是数字类型
      const qualityValue = parseInt(options.quality);
      // 根据原始格式选择压缩方式
      switch(metadata.format) {
        case 'jpeg':
          sharpInstance.jpeg({ quality: qualityValue });
          break;
        case 'png':
          sharpInstance.png({ quality: qualityValue });
          break;
        case 'webp':
          sharpInstance.webp({ quality: qualityValue });
          break;
        default:
          sharpInstance.jpeg({ quality: qualityValue });
      }
    }

    const data = await sharpInstance.toBuffer();
    return `data:image/${metadata.format};base64,${data.toString('base64')}`;
  } catch (error) {
    console.error('图片处理失败:', error);
    throw error;
  }
};

// 修改文件上传处理函数
const handleFileUpload = async (file) => {
  if (!file) return;

  try {
    // 重置所有节点的令牌状态
    for (const [_, node] of processNet.value.节点) {
      node.数值 = 0;  // 首先清零所有节点
    }
    
    // 设置开始节点的令牌
    const 开始节点 = processNet.value.节点.get('开始');
    if (开始节点) {
      开始节点.数值 = 1;
    }

    const buffer = await fileToBuffer(file);
    await 触发动作(processNet.value, '加载图片动作', buffer);
    await 触发动作(processNet.value, '处理图片动作', buffer);
  } catch (error) {
    console.error('图片处理失败:', error);
  }
};

// 修改从路径加载图片的函数
const loadImageFromPath = async (path) => {
  try {
    const fs = window.require('fs').promises;
    const buffer = await fs.readFile(path);
    await 触发动作(processNet.value, '加载图片动作', buffer);
    await 触发动作(processNet.value, '处理图片动作', buffer);
  } catch (error) {
    console.error('加载本地图片失败:', error);
  }
};

// 修改重新生成压缩图片的函数
const regenerateCompressedImage = async () => {
    if (!originalImage.value) return;

    try {
        // 完全重置所有节点的令牌状态
        for (const [_, node] of processNet.value.节点) {
          node.数值 = 0;  // 首先清零所有节点
        }
        
        // 只在必要的节点设置令牌
        const 已加载节点 = processNet.value.节点.get('已加载');
        if (已加载节点) {
            已加载节点.数值 = 1;  
        }
        
        const buffer = await fetch(originalImage.value)
            .then(res => res.arrayBuffer());
        
        // 检查变迁是否可触发
        const 可触发 = 动作可触发(processNet.value, '处理图片动作');
        if (!可触发.可触发) {
            console.warn('变迁无法触发：处理图片动作', 可触发.原因);
            return;
        }
        
        await 触发动作(processNet.value, '处理图片动作', buffer);
    } catch (error) {
        console.error('压缩图片生成失败:', error);
    }
};

// 在组件挂载时初始化Petri网
onMounted(() => {
  initProcessNet();
  
  // 处理初始加载
  const { type, subtype, meta } = appData?.value || {};
  if (type === 'local' && subtype === 'file') {
    const { path } = meta;
    if (path) {
      loadImageFromPath(path);
    }
  }
});

// 修改自动处理开关函数
const toggleAutoProcess = async () => {
  autoProcessEnabled.value = !autoProcessEnabled.value;
  
  if (autoProcessEnabled.value && originalImage.value) {
    // 启动时立即执行一次处理
    await regenerateCompressedImage();
  }
};

// 修改参数监听器
watch([scalePercentage, quality], async () => {
  if (autoProcessEnabled.value && originalImage.value) {
    await regenerateCompressedImage();
  }
}, { 
  flush: 'post'
});


const handleDragging = (e) => {
  if (!isDragging.value || !container.value) return;

  const rect = container.value.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const containerWidth = rect.width;

  // 计算百分比位置（限制在0-100之间）
  sliderPosition.value = Math.min(Math.max((x / containerWidth) * 100, 0), 100);

  // 更新压缩图片的显示区域
  const compressedImg = container.value.querySelector('.compressed');
  if (compressedImg) {
    compressedImg.style.clipPath = `inset(0 0 0 ${sliderPosition.value}%)`;
  }
};

const stopDragging = () => {
  isDragging.value = false;
  document.removeEventListener('mousemove', handleDragging);
  document.removeEventListener('mouseup', stopDragging);
};

// 组件卸载时清理事件监听
onUnmounted(() => {
  document.removeEventListener('mousemove', handleDragging);
  document.removeEventListener('mouseup', stopDragging);
});


// 可选：处理图片对比组件加载完成的事件
const handleComparisonLoad = () => {
  // 在这里处理图片加载完成后的逻辑
  console.log('图片对比加载完成');
};


// 处理压缩结果
const handleCompressed = (result) => {
  compressedImage.value = result.base64;
};

// 更新系统状态计算
const systemStats = computed(() => {
  // 获取所有卡片
  const cards = document.querySelectorAll('.floating-card');
  
  // 按卡片分组的锚点信息
  const cardAnchors = {};
  
  // 遍历所有锚点并按卡片分组
  for (const [key, anchor] of anchors.value.entries()) {
    const cardId = anchor.cardId;
    if (!cardAnchors[cardId]) {
      // 获取卡片标题
      const cardElement = document.querySelector(`[data-card-id="${cardId}"]`);
      cardAnchors[cardId] = {
        title: cardElement?.querySelector('.card-header')?.textContent || cardId,
        anchors: []
      };
    }
    cardAnchors[cardId].anchors.push({
      id: key,
      type: anchor.type,
      side: anchor.side,
      label: anchor.label,
      position: anchor.position
    });
  }

  let result= {
    cardCount: cards.length,
    anchorCount: anchors.value.size,
    connectionCount: connections.value.length,
    cardAnchors,
    connections: connections.value.map(conn => ({
      start: conn.start,
      end: conn.end,
      startAnchor: anchors.value.get(conn.start),
      endAnchor: anchors.value.get(conn.end)
    }))
  };
  return result
});

// 提供锚点注册方法
provide('nodeInterface', {
  register: (componentId, interfaceConfig) => {
    const registeredAnchors = [];
    
    // 注册输入锚点
    if (interfaceConfig.inputs) {
      Object.entries(interfaceConfig.inputs).forEach(([key, config]) => {
        const anchorId = `${componentId}-${key}`;
        anchors.value.set(anchorId, {
          ...config,
          cardId: componentId,
          id: key
        });
        registeredAnchors.push(anchorId);
      });
    }
    
    // 注册输出锚点
    if (interfaceConfig.outputs) {
      Object.entries(interfaceConfig.outputs).forEach(([key, config]) => {
        const anchorId = `${componentId}-${key}`;
        anchors.value.set(anchorId, {
          ...config,
          cardId: componentId,
          id: key
        });
        registeredAnchors.push(anchorId);
      });
    }
    
    return registeredAnchors;
  },
  
  unregister: (anchorIds) => {
    anchorIds.forEach(id => {
      anchors.value.delete(id);
    });
  }
});
</script>

<style scoped>
.image-editor {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.image-comparison {
  margin: 20px;
  position: relative;
  max-width: 1200px;
  width: 100%;
  height: 600px;
  overflow: hidden;
  margin: 0
}

.image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.compressed {
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
}

.input-group {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.path-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
}

.path-input:focus {
  border-color: #409eff;
  outline: none;
}

.upload-btn {
  background: #409eff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.upload-btn:hover {
  background: #66b1ff;
}

.file-input-wrapper input[type="file"] {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.load-btn {
  width: 100%;
  padding: 8px;
  background: #67c23a;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.load-btn:hover {
  background: #85ce61;
}

.load-btn:disabled {
  background: #c0c4cc;
  cursor: not-allowed;
}

.control-btn {
  width: 100%;
  padding: 8px;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background-color 0.3s;
}

.control-btn:hover {
  background: #66b1ff;
}

.control-btn:disabled {
  background: #c0c4cc;
  cursor: not-allowed;
}

.control-btn.is-playing {
  background: #67c23a;
}

.control-btn.is-playing:hover {
  background: #85ce61;
}

/* 添加 canvas 样式 */
.connection-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.image-editor {
  position: relative;
  width: 100%;
  height: 100vh; /* 设置一个固定高度 */
  overflow: hidden;
}

/* 确保所有卡片容器使用相对于 image-editor 定位 */
:deep(.floating-card) {
  position: absolute;
  z-index: 2;
}
</style>