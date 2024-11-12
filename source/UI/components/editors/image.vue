<template>
  <div @wheel="handleWheel">
    <StyleSelector v-if="coordinateManager" v-model:connectionStyle="connectionStyle"
      :coordinateManager="coordinateManager">
      <div class="zoom-controls">
        <button class="zoom-btn" @click="() => adjustZoom(-0.1)">-</button>
        <span class="zoom-value">{{ Math.round(zoom * 100) }}%</span>
        <button class="zoom-btn" @click="() => adjustZoom(0.1)">+</button>
        <button class="zoom-btn" @click="resetZoom">重置</button>
      </div>
    </StyleSelector>
    <InfoPanel v-if="coordinateManager" :stats="systemStats"  />
    <div class="image-editor" ref="connectionCanvasRef" :style="{ zoom }">
      <!-- 使用 StyleSelector 组件 -->
      <ConnectionCanvas :style="{ zoom: 1 / zoom }" :zoom="zoom" v-if="config.connections" :cardsContainer="cardsContainer"
        :cards="运行时卡片对象序列" :connections="config.connections" :relations="config.relations"
        :coordinateManager="coordinateManager" :connectionStyle="connectionStyle"
        @connectionCreated="handleNewConnection" @relationCreated="handleNewrelation" />
      <!-- 动态渲染卡片 -->
      <div style="position: relative;
        max-width: 100%;
        max-height: 100%;
        overflow: auto;
        scrollbar-width:none;
        "
        >
        <div ref="cardsContainer">
          <template v-for="(运行时卡片对象, index) in 运行时卡片对象序列" :key="运行时卡片对象.id+index">
            <cardContainer :zoom="zoom" :force-position="forcedPositions.get(运行时卡片对象.id)" 
              :data-card-id="运行时卡片对象.id"  :component="运行时卡片对象.controller.component"
              :component-props="运行时卡片对象.controller.componentProps" :nodeDefine="运行时卡片对象.controller.nodeDefine"
              :component-events="运行时卡片对象.events" :anchors="运行时卡片对象.controller.anchors" :connections="config.connections"
              :card="运行时卡片对象" @onCardMove="onCardMove" @startDuplicating="handleStartDuplicating" />
          </template>
          <!-- 复制中的卡片预览 -->
          <cardContainer v-if="isDuplicating && duplicatingPreview" v-bind="duplicatingPreview" :style="{
            opacity: 0.7,
            pointerEvents: 'none',
            zIndex: 5,
            cursor: 'move'
          }" />
        </div>
      </div>
    </div>
  </div>
</template>
<script>
</script>
<script setup>
import { ref, onMounted, computed, toRef, inject, onUnmounted, watch, nextTick } from 'vue';
import { loadJson } from './componentMapLoader.js';
import CardContainer from './containers/cardContainer.vue';
import ConnectionCanvas from './ConnectionCanvas.vue';
// 使用同步函数加载异步组件
import InfoPanel from './InfoPanel.vue';
//用于流程构建和控制
import { CardManager } from './cardManager.js';
import { CoordinateManager, useZoom } from './CoordinateManager.js';
import { GraphManager } from './GraphManager.js';
import { ensureUniqueCardIds as 校验并实例化卡片组, updateConnectionIds, validateConnections } from './loader/utils.js';
import { updateAnchorsPosition } from './containers/nodeDefineParser/controllers/anchor.js';
import StyleSelector from './toolBar/StyleSelector.vue';

import { validateConnection } from '../../../utils/graph/PetriNet.js';
import { findExistingConnection, findDuplicateConnection } from './GraphManager.js';

const cardsContainer = ref(null)
const cardManager = new CardManager();
const 运行时卡片对象序列 = ref([]);
const editorConfig = "/plugins/SACAssetsManager/source/UI/components/editors/builtInNet/brightness.json"
const connectionCanvasRef = ref(null);
const coordinateManager = ref(null);
const container = ref(null);
const appData = toRef(inject('appData'))
// 修改连线相关的状态管理
const anchors = ref(new Map()); // 存储所有锚点信息
const 锚点连接表 = ref([]); // 存储连线信息
// 配置相关
const config = ref({
});
// 修改 从卡片配置添加控制器 函数
const 从卡片配置添加控制器 = async (卡片数据, options = {}) => {
  const 运行时卡片对象 = await cardManager.从卡片配置添加控制器(卡片数据, options);
  运行时卡片对象序列.value = cardManager.cards;
  return 运行时卡片对象;
};
//vue里才能使用
const 强制更新控制器序列 =(运行时控制器序列)=>{
  运行时控制器序列.value = [...运行时控制器序列.value]
}
let componentDefinitions = {}
const graphManager = new GraphManager();
const getGlobalInputs = () => {
  // 返回全局输入对象
  return appData.value.meta
};
function reStartPetriNet() {
 graphManager.reStartPetriNet(config.value, 运行时卡片对象序列.value, getGlobalInputs)
}
const {
  zoom,
  handleWheel,
  adjustZoom,
  resetZoom
} = useZoom(connectionCanvasRef, coordinateManager)
// 重构后的 loadConfig 函数
const loadConfig = async () => {
  try {
    // 清空现有状态
    运行时卡片对象序列.value = [];
    componentDefinitions = {};
    // 确保卡片ID唯一性
    const { updatedCards, idMap } = 校验并实例化卡片组(config.value.cards);
    config.value.cards = updatedCards;
    // 更新连接和关系中的卡片ID
    config.value.connections = updateConnectionIds(config.value.connections, idMap);
    config.value.relations = updateRelationIds(config.value.relations, idMap);
    // 添加所有卡片
    for await (const cardConfig of config.value.cards) {
      await 从卡片配置添加控制器(cardConfig, { skipExisting: false });
    }
    // 验证并更新连接和关系
    config.value.connections = validateConnections(config.value.connections, 运行时卡片对象序列.value);
    config.value.relations = validateRelations(config.value.relations, 运行时卡片对象序列.value);
    console.log("connections", config.value.connections);
    console.log("relations", config.value.relations);
    // 初始化和启动Petri网
    reStartPetriNet()
  } catch (error) {
    console.error('加载配置失败:', error);
    throw error;
  }
};

// 添加更新关系ID的函数
const updateRelationIds = (relations, idMap) => {
  if (!Array.isArray(relations)) return [];

  return relations.map(relation => ({
    from: {
      cardId: idMap[relation.from.cardId] || relation.from.cardId
    },
    to: {
      cardId: idMap[relation.to.cardId] || relation.to.cardId
    }
  }));
};

// 添加验证关系的函数
const validateRelations = (relations, cards) => {
  if (!Array.isArray(relations)) return [];

  return relations.filter(relation => {
    // 验证源卡片和目标卡片是否存在
    const fromCard = cards.find(card => card.id === relation.from.cardId);
    const toCard = cards.find(card => card.id === relation.to.cardId);

    if (!fromCard || !toCard) {
      console.warn('关系验证失败: 找不到对应的卡片', relation);
      return false;
    }

    // 验证是否存在重复的关系
    const isDuplicate = relations.some((r, index) =>
      relations.findIndex(r2 =>
        r2.from.cardId === r.from.cardId &&
        r2.to.cardId === r.to.cardId
      ) !== index
    );

    if (isDuplicate) {
      console.warn('关系验证失败: 存在重复的关系', relation);
      return false;
    }

    // 验证是否存在自我引用
    if (relation.from.cardId === relation.to.cardId) {
      console.warn('关系验证失败: 不允许自我引用', relation);
      return false;
    }

    return true;
  });
};


// 组件属性映射
// 绘制连线
// 初始化 canvas 和连接
onMounted(async () => {
  config.value = await loadJson(editorConfig); // 使用异步加载函数
  await loadConfig();
  updateAnchorsPosition(运行时卡片对象序列.value)
  // 将配置文件中的连接转换为内部连接格式
  锚点连接表.value = config.value.connections.map(conn => ({
    start: `${conn.from.cardId}-${conn.from.anchorId}`,
    end: `${conn.to.cardId}-${conn.to.anchorId}`
  }));
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
const getCardAnchors = (cards) => {
  const cardAnchors = [];
  cards.forEach(card => {
    cardAnchors.push(...card.controller.anchors)
  });
  return cardAnchors;
};

// 格式化连接信息
const formatConnections = (connections, anchors) => {
  return connections.map(conn => ({
    start: conn.start,
    end: conn.end,
    startAnchor: anchors.get(conn.start),
    endAnchor: anchors.get(conn.end)
  }));
};

// 计算系统状态
const systemStats = computed(() => {
  const cards = 运行时卡片对象序列.value;
  const cardAnchors = getCardAnchors(cards);
  return {
    cardCount: cards.length,
    anchorCount: cardAnchors.length,
    connectionCount: 锚点连接表.value.length,
    cards,
    connections: formatConnections(锚点连接表.value, anchors.value)
  };
});

// 在需要的地方调用更新函数
watch(() => 运行时卡片对象序列.value.map(card => ({
  id: card.id,
  position: { ...card.position }
})), () => {
  // 卡片位置变化时更新锚点
  updateAnchorsPosition(运行时卡片对象序列.value);
}, { deep: true });

// 添加判断是否为笔记类型卡片的辅助函数
const isNoteCard = (card) => {
  return card.controller.cardInfo.type?.startsWith('note/');
};
// 添加一个 Map 来跟踪每个卡片的强制位置
const forcedPositions = ref(new Map());

// 更新卡片位置的核心函数
const updateCardPosition = (card, newPosition) => {
  card.position = newPosition;
  updateAnchorsPosition([card]);
};

// 获取与指定卡片直接关联的关系
const getDirectRelations = (cardId) => {
  return config.value.relations.filter(relation =>
    relation.from.cardId === cardId || relation.to.cardId === cardId
  );
};

// 获取关联卡片的ID
const getRelatedCardId = (relation, sourceCardId) => {
  return relation.from.cardId === sourceCardId ? relation.to.cardId : relation.from.cardId;
};
import { 以位移向量变换矩形对象 } from './geometry/geometryCalculate/rect.js';

const moveRelatedCard = (relatedCard, sourceCardId, deltaX, deltaY) => {
  if (!relatedCard || relatedCard.id === sourceCardId) return;
  if(!relatedCard.moveTo) return
  relatedCard.moveTo(以位移向量变换矩形对象(relatedCard.position, {x:deltaX, y:deltaY}));
};
// 处理关联卡片的移动（主函数）
const updateRelatedCards = (cardId, deltaX, deltaY) => {
  const directRelations = getDirectRelations(cardId);
  directRelations.forEach(relation => {
    const relatedCardId = getRelatedCardId(relation, cardId);
    const relatedCard = 运行时卡片对象序列.value.find(c => c.id === relatedCardId);
    moveRelatedCard(relatedCard, cardId, deltaX, deltaY);
  });
};
const onCardMove = (cardId, newPosition) => {
  const card = 运行时卡片对象序列.value.find(c => c.id === cardId);
  if (!card) return;
  updateCardPosition(card, newPosition);
  if (isNoteCard(card) && newPosition.isDragging) {
    const { deltaX, deltaY } = newPosition;
    if (deltaX && deltaY) {
      updateRelatedCards(cardId, deltaX, deltaY);
    }
  }
};
onMounted(() => {
  coordinateManager.value = new CoordinateManager(connectionCanvasRef.value, cardsContainer.value);
  window.addEventListener('resize', () => updateAnchorsPosition(运行时卡片对象序列.value));
});
onUnmounted(() => {
  window.removeEventListener('resize', () => updateAnchorsPosition(运行时卡片对象序列.value));
});
const connectionStyle = ref({
  geometry: 'circuit',
  drawingStyle: 'normal'
});
const handleNewConnection = async (newConnection) => {
  const existingConnectionIndex = findExistingConnection(config.value.connections, newConnection);
  const validationResult = validateConnection(
    config.value.connections.filter((_, index) => index !== existingConnectionIndex),
    newConnection,
    运行时卡片对象序列.value
  );
  if (!validationResult.isValid) {
    console.error('连接验证失败:', validationResult.error);
    return;
  }
  try {
    const duplicateConnectionIndex = findDuplicateConnection(config.value.connections, newConnection);
    if (duplicateConnectionIndex !== -1) {
      config.value.connections.splice(duplicateConnectionIndex, 1);
      console.log('重复连接已移除:', newConnection);
    } else {
      if (existingConnectionIndex !== -1) {
        config.value.connections.splice(existingConnectionIndex, 1, newConnection);
      } else {
        config.value.connections.push(newConnection);
      }
    }
    config.value.connections = [...config.value.connections];
    await nextTick();
    reStartPetriNet()
  } catch (error) {
    config.value.connections = [...previousConnections];
    console.error('Petri网络构建失败:', error);
    await nextTick();
  }
};
// 修改响应式变量
const duplicatingPreview = ref(null);
const actualCard = ref(null);
const isDuplicating = ref(false);
const duplicateOffset = ref({ x: 0, y: 0 });

// 修改处理开始复制事件的方法
const handleStartDuplicating = ({ previewCard, actualCard: newCard, mouseEvent, sourcePosition }) => {
  if (isDuplicating.value) return;
  isDuplicating.value = true;
  actualCard.value = newCard;
  const rect = connectionCanvasRef.value.getBoundingClientRect();
  const scroll = coordinateManager.value.getScrollOffset();
  // 计算鼠标相对于容器的绝对位置，考虑缩放
  const mouseX = (mouseEvent.clientX - rect.left + scroll.scrollLeft) / zoom.value;
  const mouseY = (mouseEvent.clientY - rect.top + scroll.scrollTop) / zoom.value;
  // 设置预览卡片的初始位置为鼠标位置
  duplicatingPreview.value = {
    
    ...previewCard,
    position: {
      ...previewCard.position,
      x: mouseX,
      y: mouseY,
      // 保持原始尺寸
      width: previewCard.position.width,
      height: previewCard.position.height
    },
    componentProps: {
      ...previewCard.componentProps,
      isPreview: true,
      zoom: zoom.value // 传递缩放值给预览组件
    }
  };
  duplicatingPreview.value.card=    duplicatingPreview.value

  
  // 计算鼠标相对于预览卡片的偏移，考虑缩放
  duplicateOffset.value = {
    x: (mouseEvent.clientX - rect.left) / zoom.value,
    y: (mouseEvent.clientY - rect.top) / zoom.value
  };

  document.addEventListener('mousemove', handleDuplicateMove);
  document.addEventListener('click', handleDuplicatePlace, true);
};

// 修改移动处理方法
const handleDuplicateMove = (e) => {
  if (!isDuplicating.value || !duplicatingPreview.value) return;

  const rect = connectionCanvasRef.value.getBoundingClientRect();
  const scroll = coordinateManager.value.getScrollOffset();

  // 计算鼠标相对于容器的绝对位置，考虑缩放
  const x = (e.clientX - rect.left + scroll.scrollLeft) / zoom.value;
  const y = (e.clientY - rect.top + scroll.scrollTop) / zoom.value;

  // 更新预览卡片位置为缩放后的坐标
  duplicatingPreview.value = {
    ...duplicatingPreview.value,
    position: {
      ...duplicatingPreview.value.position,
      x,
      y
    },
    componentProps: {
      ...duplicatingPreview.value.componentProps,
      zoom: zoom.value // 确保缩放值更新
    }
  };
  duplicatingPreview.value.card=    duplicatingPreview.value

};

// 修改放置处理方法
const handleDuplicatePlace = async (e) => {
  if (!isDuplicating.value || !actualCard.value) return;

  e.stopPropagation();

  isDuplicating.value = false;
  document.removeEventListener('mousemove', handleDuplicateMove);
  document.removeEventListener('click', handleDuplicatePlace);

  try {
    const rect = connectionCanvasRef.value.getBoundingClientRect();
    const scroll = coordinateManager.value.getScrollOffset();

    // 计算最终放置位置，考虑缩放
    const finalX = (e.clientX - rect.left + scroll.scrollLeft) / zoom.value;
    const finalY = (e.clientY - rect.top + scroll.scrollTop) / zoom.value;

    // 使用最终位置更新实际卡片，保持原始尺寸
    actualCard.value.position = {
      ...duplicatingPreview.value.position,
      x: finalX,
      y: finalY,
      width: duplicatingPreview.value.position.width,
      height: duplicatingPreview.value.position.height
    };

    // 添加新卡片
    const 新运行时卡片对象 = await 从卡片配置添加控制器(actualCard.value);
    强制更新控制器序列(运行时卡片对象序列)

    // 等待下一个渲染周期
    await nextTick();

    // 手动触发 onCardMove 事件来更新卡片位置，传递未缩放的坐标
    onCardMove(新运行时卡片对象.id, {
      x: finalX,
      y: finalY,
      width: 新运行时卡片对象.position.width,
      height: 新运行时卡片对象.position.height,
      zoom: zoom.value // 传递缩放值给移动事件
    });

    // 更新网络结构
    reStartPetriNet()
  } catch (error) {
    console.error('复制卡片失败:', error);
  } finally {
    // 清理状态
    duplicatingPreview.value = null;
    actualCard.value = null;
  }
};

// 在组件卸载时清理事件监听
onUnmounted(() => {
  document.removeEventListener('mousemove', handleDuplicateMove);
  document.removeEventListener('click', handleDuplicatePlace);
});

// 添加处理新 relation 的方法
const handleNewrelation = (newrelation) => {
  // 检查是否存在重复的 relation
  const duplicaterelationIndex = config.value.relations.findIndex(relation =>
    relation.from.cardId === newrelation.from.cardId &&
    relation.from.anchorId === newrelation.from.anchorId &&
    relation.to.cardId === newrelation.to.cardId &&
    relation.to.anchorId === newrelation.to.anchorId
  );
  if (duplicaterelationIndex !== -1) {
    // 如果存在重复 relation，移除它
    config.value.relations.splice(duplicaterelationIndex, 1);
  } else {
    // 添加新 relation
    config.value.relations.push(newrelation);
  }
  // 强制更新 relations 数组的引用，触发视图更新
  config.value.relations = [...config.value.relations];
};
</script>
<style scoped>
.image-editor {
  background: var(--b3-theme-background);
  border-radius: var(--b3-border-radius);
  box-shadow: var(--b3-dialog-shadow);
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: hidden
}

.input-group {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

/* 确保所有卡片容器使用相对于 image-editor 定位 */
:deep(.floating-card) {
  position: absolute;
  z-index: 2;
}


.zoom-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--b3-theme-surface);
  padding: 6px 12px;
  border-radius: var(--b3-border-radius);
  border: 1px solid var(--b3-border-color);
}

.zoom-btn {
  padding: 4px 8px;
  border: 1px solid var(--b3-border-color);
  border-radius: var(--b3-border-radius);
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-surface);
  cursor: pointer;
  outline: none;
  min-width: 28px;
}

.zoom-btn:hover {
  background: var(--b3-list-hover);
  border-color: var(--b3-theme-primary);
}

.zoom-value {
  min-width: 60px;
  text-align: center;
  font-size: 14px;
  color: var(--b3-theme-on-surface);
}
/* 添加预览内容的样式 */
:deep(.preview-content) {
  pointer-events: none;
  user-select: none;
}
</style>
