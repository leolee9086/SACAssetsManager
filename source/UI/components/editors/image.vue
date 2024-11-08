<template>
  <div class="image-editor">
    <!-- 使用 StyleSelector 组件 -->
    <StyleSelector v-model:connectionStyle="connectionStyle" />

    <div v-show="false" ref="connectionCanvas" class="connection-canvas">
    </div>
    <ConnectionCanvas 
       v-if="config.connections"
      :cards="parsedCards" 
      :connections="config.connections" 
      :coordinateManager="coordinateManager"
      :connectionStyle="connectionStyle"
      @connectionCreated="handleNewConnection" />
    <!-- 动态渲染卡片 -->
    <template v-for="card in parsedCards" :key="card.id">
      <cardContainer :title="card.title" :position="card.position" :data-card-id="card.id" :cardID="card.id"
        :component="card.controller.component" :component-props="card.controller.componentProps"
        :nodeDefine="card.controller.nodeDefine" :component-events="card.events" :anchors="card.controller.anchors"
        :connections="config.connections"
        :card="card" @onCardMove="onCardMove" />
    </template>

    <InfoPanel :stats="systemStats" />
  </div>
</template>
<script>
</script>
<script setup>
import { ref, onMounted, computed, toRef, inject, onUnmounted,  watch, nextTick } from 'vue';
import { loadJson } from './componentMapLoader.js';

import CardContainer from './containers/cardContainer.vue';
import ConnectionCanvas from './ConnectionCanvas.vue';
// 使用同步函数加载异步组件
import InfoPanel from './InfoPanel.vue';
//用于流程构建和控制
import { CardManager } from './cardManager.js';
import { CoordinateManager } from './CoordinateManager.js';
// 在 setup 中
import StyleSelector from './toolBar/StyleSelector.vue';
const cardManager = new CardManager();
const parsedCards = ref([]);
const editorConfig ="/plugins/SACAssetsManager/source/UI/components/editors/builtInNet/imageCompressor.json"
// 修改 addCard 函数
const addCard = async (cardConfig, options = {}) => {
  const card = await cardManager.addCard(cardConfig, options);
  parsedCards.value = cardManager.cards;
  return card;
};
let componentDefinitions = {}

import { GraphManager } from './GraphManager.js';

const graphManager = new GraphManager();
const getGlobalInputs = () => {
  // 返回全局输入对象
  return appData.value.meta
};
// 修改 buildPetriNet 函数
function buildPetriNet() {
  return graphManager.buildPetriNet(config.value, parsedCards.value, getGlobalInputs);
}

import { ensureUniqueCardIds ,updateConnectionIds,validateConnections} from './loader/utils.js';

// 重构后的 loadConfig 函数
const loadConfig = async () => {
  try {
    // 清空现有状态
    parsedCards.value = [];
    componentDefinitions = {};
    // 确保卡片ID唯一性
    const { updatedCards, idMap } = ensureUniqueCardIds(config.value.cards);
    config.value.cards = updatedCards;
    // 更新连接中的卡片ID
    config.value.connections = updateConnectionIds(config.value.connections, idMap);
    // 添加所有卡片
    for (const cardConfig of config.value.cards) {
      await addCard(cardConfig, { skipExisting: true });
    }
    // 验证并更新连接
    config.value.connections = validateConnections(config.value.connections, parsedCards.value);
    console.error("connections", config.value.connections);
    // 初始化和启动Petri网
    let pn = buildPetriNet();
    pn.exec(undefined, true);
    pn.startAutoExec();
  } catch (error) {
    console.error('加载配置失败:', error);
    throw error;
  }
};
const container = ref(null);
const appData = toRef(inject('appData'))
// 修改连线相关的状态管理
const connectionCanvas = ref(null);
const anchors = ref(new Map()); // 存储所有锚点信息
const connections = ref([]); // 存储连线信息
// 配置相关
const config = ref(editorConfig);
// 组件属性映射
// 绘制连线
// 初始化 canvas 和连接
onMounted(async () => {
  config.value = await loadJson(editorConfig); // 使用异步加载函数
   console.log(config.value)
  await loadConfig();
  updateAnchorsPosition(parsedCards.value)
  // 将配置文件中的连接转换为内部连接格式
  connections.value = config.value.connections.map(conn => ({
    start: `${conn.from.cardId}-${conn.from.anchorId}`,
    end: `${conn.to.cardId}-${conn.to.anchorId}`
  }));
  console.error(connections.value, config.value.connections)
});
// 在组件挂载时初始化Petri网
onMounted(() => {
  // 处理初始加载
  const { type, subtype, meta } = appData?.value || {};
  if (type === 'local' && subtype === 'file') {
    const { path } = meta;
    if (path) {
      console.log(path)
    }
  }
});
// 修改自动处理开关函数
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

// 更新系统状态计算
const systemStats = computed(() => {
  // 获取所有卡片
  const cards = parsedCards.value
  // 按卡片分组的锚点信息
  const cardAnchors = [];
  cards.forEach(
    card => {
      cardAnchors.push(...card.controller.anchors)
    }
  )

  let result = {
    cardCount: cards.length,
    anchorCount: cardAnchors.length,
    connectionCount: connections.value.length,
    cards,
    connections: connections.value.map(conn => ({
      start: conn.start,
      end: conn.end,
      startAnchor: anchors.value.get(conn.start),
      endAnchor: anchors.value.get(conn.end)
    }))
  };
  return result
});

import { updateAnchorsPosition } from './containers/nodeDefineParser/controllers/anchor.js';


// 在需要的地方调用更新函数
watch(() => parsedCards.value.map(card => ({
  id: card.id,
  position: { ...card.position }
})), () => {
  // 卡片位置变化时更新锚点
  updateAnchorsPosition(parsedCards.value);
}, { deep: true });

// 在卡片移动时调用
const onCardMove = (cardId, newPosition) => {
  const card = parsedCards.value.find(c => c.id === cardId);
  if (card) {
    card.position = newPosition;
    updateAnchorsPosition([card]);
  }
};
// 在窗口大小改变时可能也需要更新
onMounted(() => {
  window.addEventListener('resize', () => updateAnchorsPosition(parsedCards.value));
});
onUnmounted(() => {
  window.removeEventListener('resize', () => updateAnchorsPosition(parsedCards.value));
});

const connectionCanvasRef = ref(null);
const coordinateManager = ref(null);

onMounted(() => {
  coordinateManager.value = new CoordinateManager(connectionCanvasRef.value);
});

// 连接样式常量
const GEOMETRY_OPTIONS = {
  'circuit': '电路板式',
  'bezier': '贝塞尔曲线',
  'arc': '弧线'
};

const DRAWING_STYLE_OPTIONS = {
  'normal': '普通',
  'handDrawn': '手绘'
};

// 连接样式状态
const connectionStyle = ref({
  geometry: 'circuit',
  drawingStyle: 'normal'
});

import { validateConnection } from '../../../utils/graph/PetriNet.js';

const handleNewConnection = async (newConnection) => {
    // 1. 检查是否存在需要替换的连接
    const existingConnectionIndex = config.value.connections.findIndex(conn => 
        conn.to.cardId === newConnection.to.cardId && 
        conn.to.anchorId === newConnection.to.anchorId
    );

    // 2. 验证新连接的有效性（除了输入锚点已连接的检查）
    const validationResult = validateConnection(
        config.value.connections.filter((_, index) => index !== existingConnectionIndex),
        newConnection,
        parsedCards.value
    );

    if (!validationResult.isValid) {
        console.error('连接验证失败:', validationResult.error);
        return;
    }

    try {
        // 3. 保存当前状态以便回滚
        const previousConnections = [...config.value.connections];

        // 4. 检查是否存在重复连接
        const duplicateConnectionIndex = config.value.connections.findIndex(conn =>
            conn.from.cardId === newConnection.from.cardId &&
            conn.from.anchorId === newConnection.from.anchorId &&
            conn.to.cardId === newConnection.to.cardId &&
            conn.to.anchorId === newConnection.to.anchorId
        );

        if (duplicateConnectionIndex !== -1) {
            // 如果存在重复连接，移除该连接
            config.value.connections.splice(duplicateConnectionIndex, 1);
            console.log('重复连接已移除:', newConnection);
        } else {
            // 5. 更新连接
            if (existingConnectionIndex !== -1) {
                // 替换已有连接
                config.value.connections.splice(existingConnectionIndex, 1, newConnection);
            } else {
                // 添加新连接
                config.value.connections.push(newConnection);
            }
        }

        // 6. 强制更新连接数组的引用，触发视图更新
        config.value.connections = [...config.value.connections];

        // 7. 等待下一个 tick，确保视图更新
        await nextTick();

        // 8. 重建并验证整个 Petri 网络
        let pn = buildPetriNet();
        pn.exec(undefined, true);
        pn.startAutoExec();
    } catch (error) {
        // 9. 如果出错，回滚到之前的状态
        config.value.connections = [...previousConnections];
        console.error('Petri网络构建失败:', error);
        
        // 10. 强制更新视图
        await nextTick();
    }
};
</script>
<style scoped>
.image-editor {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.input-group {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.image-editor {
  position: relative;
  width: 100%;
  height: 100vh;
  /* 设置一个固定高度 */
  overflow: hidden;
}

/* 确保所有卡片容器使用相对于 image-editor 定位 */
:deep(.floating-card) {
  position: absolute;
  z-index: 2;
}

.connection-style-selector {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 1000;
  display: flex;
  gap: 10px;
  background: white;
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.style-select {
  padding: 6px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background-color: white;
  font-size: 14px;
  color: #606266;
  cursor: pointer;
  outline: none;
}

.style-select:hover {
  border-color: #c0c4cc;
}

.style-select:focus {
  border-color: #409eff;
}
</style>
