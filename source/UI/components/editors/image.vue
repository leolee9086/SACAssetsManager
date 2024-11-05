<template>
  <div class="image-editor">
    <div v-show="false" ref="connectionCanvas" class="connection-canvas">

    </div>
    <ConnectionCanvas 
      :cards="parsedCards" 
      :connections="config.connections"
    />
    <!-- 动态渲染卡片 -->
    <template v-for="card in parsedCards" :key="card.id">
      <cardContainer :title="card.title" :position="card.position" :data-card-id="card.id" :cardID="card.id"
        :component="card.controller.component" :component-props="card.controller.componentProps"
        :component-events="card.events" :anchors="card.controller.anchors" :card="card" @onCardMove="onCardMove" />
    </template>

    <InfoPanel :stats="systemStats" />
  </div>
</template>
<script>
const editorConfig = {
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
        "anchorId": "filePath"
      },
      "to": {
        "cardId": "imageComparison",
        "anchorId": "originalImage"
      }
    },
    {
      "from": {
        "cardId": "imageInput",
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
    }
  ]
}

</script>
<script setup>
import { ref, onMounted, computed, toRef, inject, onUnmounted, shallowRef, watch } from 'vue';
import CardContainer from './containers/cardContainer.vue';
import _Konva from '../../../../static/konva.js'
import { 已经连接, 执行Petri网 } from '../../../utils/graph/PetriNet.js';
import ConnectionCanvas from './ConnectionCanvas.vue';


// 使用同步函数加载异步组件
import InfoPanel from './InfoPanel.vue';
//用于流程构建和控制
import { parseNodeDefine } from './containers/nodeDefineParser.js';
import { validateUUID } from '../../../utils/uuid/index.js';
// 组件映射表
const componentMap = {
  localImageInput: '/plugins/SACAssetsManager/source/UI/components/editors/localImageInput.vue',
  ImageCompressor: '/plugins/SACAssetsManager/source/UI/components/editors/ImageCompressor.vue',
  ImageComparison: '/plugins/SACAssetsManager/source/UI/components/editors/ImageComparison.vue',
};
const parsedCards = ref([]);
// 新增函数：解析组件定义
const parseComponentDefinition = async (cardType) => {
  const componentURL = componentMap[cardType];
  return await parseNodeDefine(componentURL);
};
let componentDefinitions = {}
/**
 * 添加或更新卡片
 * @param {Object} cardConfig 卡片配置
 * @param {Object} [options] 额外选项
 * @param {boolean} [options.skipExisting=false] 是否跳过已存在的卡片
 * @returns {Promise<Object>} 添加或更新的卡片对象
 */
const addCard = async (cardConfig, options = {}) => {
  try {
    // 验证必要参数
    const requiredFields = ['id', 'type', 'title', 'position'];
    const missingFields = requiredFields.filter(field => !cardConfig[field]);
    if (missingFields.length > 0) {
      throw new Error(`缺少必要的卡片配置: ${missingFields.join(', ')}`);
    }

    // 检查组件类型是否支持
    if (!componentMap[cardConfig.type]) {
      throw new Error(`不支持的卡片类型: ${cardConfig.type}`);
    }

    // 获取或解析组件定义
    let controller;
    if (componentDefinitions[cardConfig.type]) {
      controller = componentDefinitions[cardConfig.type];
    } else {
      controller = await parseComponentDefinition(cardConfig.type);
      componentDefinitions[cardConfig.type] = controller;
    }

    // 创建新卡片对象
    const newCard = {
      controller,
      id: cardConfig.id,
      position: {
        x: cardConfig.position.x || 0,
        y: cardConfig.position.y || 0,
        width: cardConfig.position.width || 300,
        height: cardConfig.position.height || 200
      },
      title: cardConfig.title
    };

    // 查找是否存在同ID的卡片
    const existingIndex = parsedCards.value.findIndex(card => card.id === cardConfig.id);

    if (existingIndex !== -1) {
      if (options.skipExisting) {
        // 如果设置了跳过，则返回现有卡片
        return parsedCards.value[existingIndex];
      }

      // 更新现有卡片
      const existingCard = parsedCards.value[existingIndex];

      // 如果类型改变，需要更新controller
      if (cardConfig.type !== existingCard.type) {
        existingCard.controller = controller;
      }

      // 更新其他属性
      existingCard.title = newCard.title;
      existingCard.position = newCard.position;

      // 更新配置中的卡片
      const configIndex = config.value.cards.findIndex(card => card.id === cardConfig.id);
      if (configIndex !== -1) {
        config.value.cards[configIndex] = { ...cardConfig };
      } else {
        config.value.cards.push(cardConfig);
      }

      return existingCard;
    } else {
      // 添加新卡片
      parsedCards.value.push(newCard);
      config.value.cards.push(cardConfig);
      return newCard;
    }
  } catch (error) {
    console.error('添加或更新卡片失败:', error);
    throw error;
  }
};


/**
 * 从保存的卡片加载配置文件
 */
const loadConfig = async () => {
  try {
    // 清空现有卡片和定义缓存
    parsedCards.value = [];
    componentDefinitions = {};
    // 创建ID映射表
    const idMap = new Map();
    // 验证并修正所有卡片的ID
    config.value.cards = config.value.cards.map(card => {
      const oldId = card.id;
      const newId = validateUUID(oldId);
      if (oldId !== newId) {
        console.warn(`卡片ID不是有效的UUID，已修正: ${oldId} -> ${newId}`);
        idMap.set(oldId, newId);
      }
      return {
        ...card,
        id: newId
      };
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
    });
    buildPetriNet()
  } catch (error) {
    console.error('加载配置失败:', error);
    throw error;
  }
};
import { 创建流程图, 添加节点, 添加动作, 添加连接, 找到入口节点, 找到出口节点 } from '../../../utils/graph/PetriNet.js';

// Petri 网构建函数
function buildPetriNet(connections) {
  // 创建一个新的 Petri 网
  const petriNet = 创建流程图(`PetriNet_${config.value.name}`);
  config.value.connections.forEach(
    conn => {
      // 处理锚点（anchors）
      const fromCard = parsedCards.value.find(card => card.id === conn.from.cardId);
      const toCard = parsedCards.value.find(card => card.id === conn.to.cardId);
      const fromAnchor = fromCard.controller.anchors.find(a => a.id === conn.from.anchorId);
      const toAnchor = toCard.controller.anchors.find(a => a.id === conn.to.anchorId);
      if (!fromAnchor || !toAnchor) {
        console.warn('无效的锚点，无法构建 Petri 网');
        return;
      }
      // 为卡片间连接添加状态节点
      const fromPlaceId = `place_${fromCard.id}_${fromAnchor.id}`;
      const toPlaceId = `place_${toCard.id}_${toAnchor.id}`;
      if (!petriNet.节点.has(fromPlaceId)) {
        添加节点(petriNet, fromPlaceId, { type: 'process', tokens: 0, content: fromAnchor });
      }
      if (!petriNet.节点.has(toPlaceId)) {
        添加节点(petriNet, toPlaceId, { type: 'process', tokens: 0, content: toAnchor })
      }
      // 为卡片间连接添加动作节点
      const transitionId = `transition_${fromCard.id}-${fromAnchor.id}_to_${toCard.id}-${toAnchor.id}`;
      if (!petriNet.动作.has(transitionId)) {
        添加动作(petriNet, transitionId, async () => {
          console.log(`执行动作: ${transitionId}`);
          const value = fromAnchor.getValue()
          console.log(value)
          toAnchor.setValue(value)
        });
      }
      if (!已经连接(petriNet, fromPlaceId, transitionId)) {
        添加连接(petriNet, fromPlaceId, transitionId)

      }
      if (!已经连接(petriNet, transitionId, toPlaceId)) {
        添加连接(petriNet, transitionId, toPlaceId)
      }
      // 为卡片内部输入输出连接添加状态节点
      构建卡片内部连接结构(petriNet, fromCard)
      构建卡片内部连接结构(petriNet, toCard)

    }
  )
  // 输出 Petri 网结构
  console.log('构建的 Petri 网:', petriNet, '入口节点:', 找到入口节点(petriNet), '出口节点:', 找到出口节点(petriNet));
  //为入口节点赋值
  找到入口节点(petriNet).forEach(
    节点id => {
      let 节点内容 = petriNet.节点.get(节点id).内容
      console.log(节点内容)
      节点内容&&节点内容.define&&节点内容.setValue(节点内容.define.default)
      petriNet.节点.get(节点id).数值 = 1
      console.log(节点id, petriNet.节点.get(节点id))
    }
  )
  执行Petri网(petriNet)
}
function 构建卡片内部连接结构(petriNet, card) {
  console.log(card)
  const inputAnchors = card.controller.anchors.filter(a => a.type === 'input');
  const outputAnchors = card.controller.anchors.filter(a => a.type === 'output');
  if (inputAnchors.length) {
    const internalTransitionId = `internal_transition_${card.id}_${card.title}`;
    if (!petriNet.动作.has(internalTransitionId)) {
      添加动作(petriNet, internalTransitionId, async () => {
        console.log(`执行内部动作: ${internalTransitionId}`);
        // 在这里实现卡片内部的处理逻辑
        await card.controller.exec()

      });
    }
    inputAnchors.forEach(inputAnchor => {
      const inputPlaceId = `place_${card.id}_${inputAnchor.id}`;
      if (!petriNet.节点.has(inputPlaceId)) {
        添加节点(petriNet, inputPlaceId, { type: 'process', tokens: 0, content: inputAnchor });
      }
      if (!已经连接(petriNet, inputPlaceId, internalTransitionId)) {
        添加连接(petriNet, inputPlaceId, internalTransitionId);

      }
    });
    outputAnchors.forEach(outputAnchor => {
      const outputPlaceId = `place_${card.id}_${outputAnchor.id}`;
      if (!petriNet.节点.has(outputPlaceId)) {
        添加节点(petriNet, outputPlaceId, { type: 'process', tokens: 0, content: outputAnchor });
      }
      if (!已经连接(petriNet, internalTransitionId, outputPlaceId)) {
        添加连接(petriNet, internalTransitionId, outputPlaceId);
      }
    });
  } else {
    const internalPalaceId = `internal_palace_${card.id}_${card.title}`;
    const internalTransitionId = `internal_transition_${card.id}_${card.title}`;
    if (!petriNet.节点.has(internalPalaceId)) {
      添加节点(petriNet, internalPalaceId, { type: 'start', tokens: 1, content: card });
    }
    if (!petriNet.动作.has(internalTransitionId)) {
      添加动作(petriNet, internalTransitionId, async() => {
        console.log(`执行无参内部动作: ${internalTransitionId}`);
        await card.controller.exec(appData.value)
      });
    }
    if (!已经连接(petriNet, internalPalaceId, internalTransitionId)) {
        添加连接(petriNet, internalPalaceId, internalTransitionId);
      }

    outputAnchors.forEach(outputAnchor => {
      const outputPlaceId = `place_${card.id}_${outputAnchor.id}`;
      if (!petriNet.节点.has(outputPlaceId)) {
        添加节点(petriNet, outputPlaceId, { type: 'process', tokens: 0, content: outputAnchor });
      }
      if (!已经连接(petriNet, internalTransitionId, outputPlaceId)) {
        添加连接(petriNet, internalTransitionId, outputPlaceId);
      }
    });
  }
}
const container = ref(null);
const appData = toRef(inject('appData'))
console.log('appData', appData)
// 修改连线相关的状态管理
const connectionCanvas = ref(null);
const ctx = ref(null);
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
  const ANCHOR_OFFSET = 8; // 锚点的偏移量

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
      // 如果有连接，也更新连接线的路径
      const relatedConnections = config.value.connections.filter(conn =>
        (conn.from.cardId === card.id && conn.from.anchorId === anchor.id) ||
        (conn.to.cardId === card.id && conn.to.anchorId === anchor.id)
      );

      relatedConnections.forEach(conn => {
        updateConnectionPath(conn);
      });
    });
  });
};

/**
 * 更新连接线的路径
 * @param {Object} connection 连接对象
 */
const updateConnectionPath = (connection) => {
  const fromCard = parsedCards.value.find(card => card.id === connection.from.cardId);
  const toCard = parsedCards.value.find(card => card.id === connection.to.cardId);

  if (!fromCard || !toCard) return;

  const fromAnchor = fromCard.controller.anchors
    .find(anchor => anchor.id === connection.from.anchorId);
  const toAnchor = toCard.controller.anchors
    .find(anchor => anchor.id === connection.to.anchorId);
  if (!fromAnchor || !toAnchor) return;

  // 计算贝塞尔曲线控制点
  const fromPos = fromAnchor.absolutePosition;
  const toPos = toAnchor.absolutePosition;
  const controlPointOffset = 50; // 控制点偏移量
  if (fromPos && toPos) {
    connection.path = {
      start: fromPos,
      end: toPos,
      control1: {
        x: fromPos.x + (fromAnchor.side === 'left' ? -controlPointOffset : controlPointOffset),
        y: fromPos.y
      },
      control2: {
        x: toPos.x + (toAnchor.side === 'left' ? -controlPointOffset : controlPointOffset),
        y: toPos.y
      }
    };
  }
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
</style>}
</style>
