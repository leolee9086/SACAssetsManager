<template>
  <div @wheel="handleWheel">
    <StyleSelector v-if="coordinateManager" v-model:connectionStyle="connectionStyle"
      :coordinateManager="coordinateManager" >
      <div class="zoom-controls">
        <button class="zoom-btn" @click="()=>adjustZoom(-0.1)">-</button>
        <span class="zoom-value">{{ Math.round(zoom * 100) }}%</span>
        <button class="zoom-btn" @click="()=>adjustZoom(0.1)">+</button>
        <button class="zoom-btn" @click="resetZoom">重置</button>
      </div>

    </StyleSelector>
    <InfoPanel v-if="coordinateManager" :stats="systemStats" :coordinateManager="coordinateManager" />

    <div class="image-editor" ref="connectionCanvasRef" :style="{zoom}">
      <!-- 使用 StyleSelector 组件 -->

      <ConnectionCanvas 
      :style="{zoom:1/zoom}" 
      :zoom="zoom"
      v-if="config.connections" :cardsContainer="cardsContainer" :cards="parsedCards"
        :connections="config.connections" :relations="config.relations" :coordinateManager="coordinateManager"
        :connectionStyle="connectionStyle" @connectionCreated="handleNewConnection"
        @relationCreated="handleNewrelation" />
      <!-- 动态渲染卡片 -->
      <div style="position: relative;
        max-width: 100%;
        max-height: 100%;
        overflow: auto;">

        <div ref="cardsContainer">
          <template v-for="(card, index) in parsedCards" :key="card.id+index">
            <cardContainer :zoom="zoom" :force-position="forcedPositions.get(card.id)" :title="card.title" :position="card.position"
              :data-card-id="card.id" :cardID="card.id" :component="card.controller.component"
              :component-props="card.controller.componentProps" :nodeDefine="card.controller.nodeDefine"
              :component-events="card.events" :anchors="card.controller.anchors" :connections="config.connections"
              :card="card" @onCardMove="onCardMove" @startDuplicating="handleStartDuplicating" />
          </template>
          <!-- 复制中的卡片预览 -->
          <cardContainer v-if="isDuplicating && duplicatingPreview" v-bind="duplicatingPreview" :style="{
            opacity: 0.7,
            pointerEvents: 'none',
            zIndex: 1000,
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
import { CoordinateManager } from './CoordinateManager.js';
import { GraphManager } from './GraphManager.js';
import { ensureUniqueCardIds as 校验并实例化卡片组, updateConnectionIds, validateConnections } from './loader/utils.js';
import { updateAnchorsPosition } from './containers/nodeDefineParser/controllers/anchor.js';
import StyleSelector from './toolBar/StyleSelector.vue';
import { useZoom } from './CoordinateManager.js';
const cardsContainer = ref(null)
const cardManager = new CardManager();
const parsedCards = ref([]);
const editorConfig = "/plugins/SACAssetsManager/source/UI/components/editors/builtInNet/brightness.json"
const connectionCanvasRef = ref(null);
const coordinateManager = ref(null);
// 修改 addCard 函数
const addCard = async (cardConfig, options = {}) => {
  const card = await cardManager.addCard(cardConfig, options);
  parsedCards.value = cardManager.cards;
  return card;
};
let componentDefinitions = {}


const graphManager = new GraphManager();
const getGlobalInputs = () => {
  // 返回全局输入对象
  return appData.value.meta
};
// 修改 buildPetriNet 函数
function buildPetriNet() {
  return graphManager.buildPetriNet(config.value, parsedCards.value, getGlobalInputs);
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
    parsedCards.value = [];
    componentDefinitions = {};

    // 确保卡片ID唯一性
    const { updatedCards, idMap } = 校验并实例化卡片组(config.value.cards);
    config.value.cards = updatedCards;
    // 更新连接和关系中的卡片ID
    config.value.connections = updateConnectionIds(config.value.connections, idMap);
    config.value.relations = updateRelationIds(config.value.relations, idMap);
    // 添加所有卡片
    for await (const cardConfig of config.value.cards) {
      await addCard(cardConfig, { skipExisting: false });
    }

    // 验证并更新连接和关系
    config.value.connections = validateConnections(config.value.connections, parsedCards.value);
    config.value.relations = validateRelations(config.value.relations, parsedCards.value);

    console.log("connections", config.value.connections);
    console.log("relations", config.value.relations);

    // 初始化和启动Petri网
    let pn = buildPetriNet();
    pn.exec(undefined, true);
    pn.startAutoExec();
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

const container = ref(null);
const appData = toRef(inject('appData'))
// 修改连线相关的状态管理
const anchors = ref(new Map()); // 存储所有锚点信息
const connections = ref([]); // 存储连线信息
// 配置相关
const config = ref({
  ...editorConfig,
});
// 组件属性映射
// 绘制连线
// 初始化 canvas 和连接
onMounted(async () => {
  config.value = await loadJson(editorConfig); // 使用异步加载函数
  await loadConfig();
  updateAnchorsPosition(parsedCards.value)
  // 将配置文件中的连接转换为内部连接格式
  connections.value = config.value.connections.map(conn => ({
    start: `${conn.from.cardId}-${conn.from.anchorId}`,
    end: `${conn.to.cardId}-${conn.to.anchorId}`
  }));
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



// 在需要的地方调用更新函数
watch(() => parsedCards.value.map(card => ({
  id: card.id,
  position: { ...card.position }
})), () => {
  // 卡片位置变化时更新锚点
  updateAnchorsPosition(parsedCards.value);
}, { deep: true });

// 添加判断是否为笔记类型卡片的辅助函数
const isNoteCard = (card) => {
  return card.controller.cardInfo.type?.startsWith('note/');
};
// 添加一个 Map 来跟踪每个卡片的强制位置
const forcedPositions = ref(new Map());

// 修改 onCardMove 函数
const onCardMove = (cardId, newPosition) => {
  // 找到当前移动的卡片
  const card = parsedCards.value.find(c => c.id === cardId);
  if (!card) return;
  // 更新当前卡片位置
  card.position = newPosition;
  updateAnchorsPosition([card]);

  // 如果不是笔记类型的卡片，则不需要处理关联移动
  if (!isNoteCard(card)) {
    return;
  }
  if (newPosition.isDragging) {

    const deltaX = newPosition.deltaX
    const deltaY = newPosition.deltaY
    if (!deltaX || !deltaY) {
      return
    }
    // 查找直接关联的卡片
    const directRelations = config.value.relations.filter(relation =>
      relation.from.cardId === cardId || relation.to.cardId === cardId
    );

    // 更新关联卡片的强制位置
    directRelations.forEach(relation => {
      const relatedCardId = relation.from.cardId === cardId ? relation.to.cardId : relation.from.cardId;
      const relatedCard = parsedCards.value.find(c => c.id === relatedCardId);

      if (relatedCard && relatedCard.id !== card.id) {
        const newRelatedPosition = {
          x: relatedCard.position.x + deltaX,
          y: relatedCard.position.y + deltaY,
          width: relatedCard.position.width,
          height: relatedCard.position.height,
        };
        relatedCard.moveTo && relatedCard.moveTo(newRelatedPosition)
      }
    });
  }

};

// 在窗口大小改变时可能也需要更新
onMounted(() => {
  coordinateManager.value = new CoordinateManager(connectionCanvasRef.value, cardsContainer.value);

  window.addEventListener('resize', () => updateAnchorsPosition(parsedCards.value));
});
onUnmounted(() => {
  window.removeEventListener('resize', () => updateAnchorsPosition(parsedCards.value));
});





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
    const newCard = await addCard(actualCard.value);

    // 强制更新 parsedCards 的引用以触发视图更新
    parsedCards.value = [...parsedCards.value];

    // 等待下一个渲染周期
    await nextTick();

    // 手动触发 onCardMove 事件来更新卡片位置，传递未缩放的坐标
    onCardMove(newCard.id, {
      x: finalX,
      y: finalY,
      width: newCard.position.width,
      height: newCard.position.height,
      zoom: zoom.value // 传递缩放值给移动事件
    });

    // 更新网络结构
    const pn = buildPetriNet();
    pn.exec(undefined, true);
    pn.startAutoExec();

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

.connection-style-selector {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 1000;
  display: flex;
  gap: 10px;
  background: var(--b3-theme-surface);
  padding: 10px;
  border-radius: var(--b3-border-radius);
  box-shadow: var(--b3-dialog-shadow);
  border: 1px solid var(--b3-border-color);
}

.style-select {
  padding: 6px 12px;
  border: 1px solid var(--b3-border-color);
  border-radius: var(--b3-border-radius);
  background: var(--b3-theme-background);
  font-size: 14px;
  color: var(--b3-theme-on-surface);
  cursor: pointer;
  outline: none;
}

.style-select:hover {
  border-color: var(--b3-theme-primary);
  background: var(--b3-list-hover);
}

.style-select:focus {
  border-color: var(--b3-theme-primary);
  box-shadow: 0 0 0 2px var(--b3-theme-primary-light);
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
