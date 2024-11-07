<template>
  <div class="image-editor">
    <div v-show="false" ref="connectionCanvas" class="connection-canvas">

    </div>
    <ConnectionCanvas :cards="parsedCards" :connections="config.connections" />
    <!-- 动态渲染卡片 -->
    <template v-for="card in parsedCards" :key="card.id">
      <cardContainer :title="card.title" :position="card.position" :data-card-id="card.id" :cardID="card.id"
        :component="card.controller.component" :component-props="card.controller.componentProps"
        :nodeDefine="card.controller.nodeDefine" :component-events="card.events" :anchors="card.controller.anchors"
        :card="card" @onCardMove="onCardMove" />
    </template>

    <InfoPanel :stats="systemStats" />
  </div>
</template>
<script>
const editorConfig = {
  "name": "图片编辑器",
  "cards": [
    {
      "id": "scale",
      "type": "math/number",
      "title": "缩放比例",
      "position": {
        "x": 20,
        "y": 20,
        "width": 300,
        "height": 200
      },
      "props": {
        min: 0,
        max: 100,
        step: 1
      }
    },
    {
      "id": "path",
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
    {
      "id": "quality",
      "type": "math/number",
      "title": "压缩质量",
      "position": {
        "x": 20,
        "y": 240,
        "width": 300,
        "height": 200
      },
      "props": {
        min: 0,
        max: 100,
        step: 1
      }
    },
  ],
  "connections": [
    {
      "from": {
        "cardId": "scale",
        "anchorId": "number"
      },
      "to": {
        "cardId": "imageCompressor",
        "anchorId": "scale"
      }
    },
    {
      "from": {
        "cardId": "path",
        "anchorId": "filePath"
      },
      "to": {
        "cardId": "imageComparison",
        "anchorId": "originalImage"
      }
    },
    {
      "from": {
        "cardId": "path",
        "anchorId": "file"
      },
      "to": {
        "cardId": "imageCompressor",
        "anchorId": "source"
      }
    },
    {
      "from": {
        "cardId": "imageCompressor",
        "anchorId": "compressedImage"
      },
      "to": {
        "cardId": "imageComparison",
        "anchorId": "processedImage"
      }
    },
    {
      "from": {
        "cardId": "quality",
        "anchorId": "number"
      },
      "to": {
        "cardId": "imageCompressor",
        "anchorId": "quality"
      }
    }
  ]
}

</script>
<script setup>
import { ref, onMounted, computed, toRef, inject, onUnmounted, shallowRef, watch, nextTick } from 'vue';
import CardContainer from './containers/cardContainer.vue';
import _Konva from '../../../../static/konva.js'
import ConnectionCanvas from './ConnectionCanvas.vue';
// 使用同步函数加载异步组件
import InfoPanel from './InfoPanel.vue';
//用于流程构建和控制
import { CardManager } from './cardManager.js';
// 在 setup 中
const cardManager = new CardManager();
const parsedCards = ref([]);

// 修改 addCard 函数
const addCard = async (cardConfig, options = {}) => {
  const card = await cardManager.addCard(cardConfig, options);

  parsedCards.value = cardManager.cards;
  return card;
};
let componentDefinitions = {}


/**
 * 从保存的卡片加载配置文件
 */
const loadConfig = async () => {
  try {
    // 清空现有卡片和定义缓存
    parsedCards.value = [];
    componentDefinitions = {};

    // 检查ID唯一性
    const usedIds = new Set();
    const idMap = new Map();

    // 仅检查ID唯一性，不再验证UUID格式
    config.value.cards = config.value.cards.map(card => {
      const oldId = card.id;
      if (usedIds.has(oldId)) {
        // 如果ID重复，生成新的唯一ID
        const newId = `${oldId}_${Date.now()}`;
        console.warn(`发现重复卡片ID，已修正: ${oldId} -> ${newId}`);
        idMap.set(oldId, newId);
        usedIds.add(newId);
        return {
          ...card,
          id: newId
        };
      }
      usedIds.add(oldId);
      return card;
    });
   
    // 更新所有连接中的卡片ID
    if (idMap.size > 0) {
      const oldConnections = [...config.value.connections];
      config.value.connections = oldConnections.map(conn => ({
        from: {
          cardId: idMap.get(conn.from.cardId) || conn.from.cardId,
          anchorId: conn.from.anchorId
        },
        to: {
          cardId: idMap.get(conn.to.cardId) || conn.to.cardId,
          anchorId: conn.to.anchorId
        }
      }));
      // 记录连接的修改
      const modifiedConnections = config.value.connections.filter((conn, index) => {
        const oldConn = oldConnections[index];
        return conn.from.cardId !== oldConn.from.cardId ||
          conn.to.cardId !== oldConn.to.cardId;
      });
      if (modifiedConnections.length > 0) {
        console.warn('已更新以下连接的卡片ID:', modifiedConnections);
      }
    }
    // 使用 addCard 添加所有卡片
    for (const cardConfig of config.value.cards) {
      await addCard(cardConfig, { skipExisting: true });
    }
    // 验证连接的有效性
    config.value.connections = config.value.connections.filter(conn => {
      const fromCard = parsedCards.value.find(card => card.id === conn.from.cardId);
      const toCard = parsedCards.value.find(card => card.id === conn.to.cardId);
      if (!fromCard || !toCard) {
        console.warn('移除无效连接:', conn);
        return false;
      }
      const fromAnchor = fromCard.controller.anchors.find(a => a.id === conn.from.anchorId);
      const toAnchor = toCard.controller.anchors.find(a => a.id === conn.to.anchorId);
      if (!fromAnchor || !toAnchor) {
        console.warn('移除无效锚点连接:', conn);
        return false;
      }
      return true;
    })
    console.error("connections",config.value.connections)
    ;
    let pn = buildPetriNet()

    pn.exec(undefined,true);
    pn.startAutoExec()
  } catch (error) {
    console.error('加载配置失败:', error);
    throw error;
  }
};
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
  await loadConfig();
  // 将配置文件中的连接转换为内部连接格式
  connections.value = config.value.connections.map(conn => ({
    start: `${conn.from.cardId}-${conn.from.anchorId}`,
    end: `${conn.to.cardId}-${conn.to.anchorId}`
  }));
  console.error(connections.value,config.value.connections)
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

/**
 * 计算锚点的绝对坐标
 * @param {Object} card 卡片对象
 * @param {Object} anchor 锚点对象
 * @returns {Object} 锚点的绝对坐标
 */
const calculateAnchorPosition = (card, anchor) => {
  const cardPos = card.position;
  const ANCHOR_OFFSET = 10; // 锚点的偏移量
  // 根据锚点在卡片上的位置计算坐标
  switch (anchor.side) {
    case 'left':
      return {
        x: cardPos.x - ANCHOR_OFFSET,
        y: cardPos.y + (cardPos.height * anchor.position)
      };
    case 'right':
      return {
        x: cardPos.x + cardPos.width + ANCHOR_OFFSET,
        y: cardPos.y + (cardPos.height * anchor.position)
      };
    case 'top':
      return {
        x: cardPos.x + (cardPos.width * anchor.position),
        y: cardPos.y - ANCHOR_OFFSET
      };
    case 'bottom':
      console.log(anchor,cardPos.width)
      return {
        x: cardPos.x + (cardPos.width * anchor.position),
        y: cardPos.y + cardPos.height + ANCHOR_OFFSET
      };
    default:
      console.warn(`未知的锚点方向: ${anchor.side}`);
      return { x: cardPos.x, y: cardPos.y };
  }
};

/**
 * 更新所有锚点的坐标
 * @param {Object} [options] 更新选项
 * @param {string} [options.cardId] 指定要更新的卡片ID，不指定则更新所有卡片
 */
const updateAnchorsPosition = (options = {}) => {
  const cardsToUpdate = options.cardId
    ? parsedCards.value.filter(card => card.id === options.cardId)
    : parsedCards.value;
  cardsToUpdate.forEach(card => {
    if (!card.controller) return;

    card.controller.anchors.forEach(anchor => {
      const pos = calculateAnchorPosition(card, anchor);
      // 更新锚点的绝对坐标
      anchor.absolutePosition = pos;
    });
  });
};

// 在需要的地方调用更新函数
watch(() => parsedCards.value.map(card => ({
  id: card.id,
  position: { ...card.position }
})), () => {
  // 卡片位置变化时更新锚点
  updateAnchorsPosition();
}, { deep: true });

// 在卡片移动时调用
const onCardMove = (cardId, newPosition) => {
  const card = parsedCards.value.find(c => c.id === cardId);
  if (card) {
    card.position = newPosition;
    // 只更新移动的卡片的锚点
    updateAnchorsPosition({ cardId });
  }
};
// 在窗口大小改变时可能也需要更新
onMounted(() => {
  window.addEventListener('resize', () => updateAnchorsPosition());
});
onUnmounted(() => {
  window.removeEventListener('resize', () => updateAnchorsPosition());
});
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
</style>
