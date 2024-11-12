<template>
  <div class="info-panel" :class="{ 'is-collapsed': isCollapsed }"
    :style="{ top: `20px`, right: `20px` }">
    <div class="info-header" @click="toggleCollapse">
      <span class="title">系统信息</span>
      <span class="toggle-icon">{{ isCollapsed ? '▼' : '▲' }}</span>
    </div>

    <div class="info-content" v-show="!isCollapsed">
      <div class="info-group">
        <h4>组件统计</h4>
        <div class="info-item">
          <span class="label">卡片数量:</span>
          <span class="value">{{ stats.cardCount }}</span>
        </div>
        <div class="info-item">
          <span class="label">锚点数量:</span>
          <span class="value">{{ stats.anchorCount }}</span>
        </div>
        <div class="info-item">
          <span class="label">连接数量:</span>
          <span class="value">{{ stats.connectionCount }}</span>
        </div>
      </div>

      <div class="info-group">
        <h4>卡片与锚点</h4>
        <div class="card-list">
          <div v-for="(card, cardId) in stats.cards" :key="cardId" class="card-item">
            <div class="card-header">
              <span class="card-title">{{ card.title }}({{ card.id }})</span>
              <span class="anchor-count">{{ card.controller.anchors.length }}个锚点</span>
            </div>
            <div class="anchor-list">
              <div v-for="anchor in card.controller.anchors" :key="anchor.id" class="anchor-item">
                <div class="anchor-info">
                  <span class="anchor-type" :class="anchor.type">{{ anchor.type }}</span>
                  <span class="anchor-side">{{ getSideName(anchor.side) }}</span>
                  <span class="anchor-label">{{ anchor.label || anchor.id }}</span>
                </div>
                <div class="anchor-position" v-if="anchor.position">
                  <span class="coord">x: {{ Math.round(anchor.absolutePosition?.x) }}</span>
                  <span class="coord">y: {{ Math.round(anchor.absolutePosition?.y) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="info-group">
        <h4>连接关系</h4>
        <div class="connection-list">
          <div v-for="(conn, index) in stats.connections" :key="index" class="connection-item">
            <div class="connection-endpoints">
              <span class="connection-from">{{ getAnchorLabel(conn.start) }}</span>
              <span class="connection-arrow">→</span>
              <span class="connection-to">{{ getAnchorLabel(conn.end) }}</span>
            </div>
            <div class="connection-coords" v-if="conn.startAnchor?.position && conn.endAnchor?.position">
              <div class="coord-item">
                <span class="coord-label">起点:</span>
                <span class="coord">x: {{ Math.round(conn.startAnchor.absolutePosition?.x) }}</span>
                <span class="coord">y: {{ Math.round(conn.startAnchor.absolutePosition?.y) }}</span>
              </div>
              <div class="coord-item">
                <span class="coord-label">终点:</span>
                <span class="coord">x: {{ Math.round(conn.endAnchor.absolutePosition?.x) }}</span>
                <span class="coord">y: {{ Math.round(conn.endAnchor.absolutePosition?.y) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
const props = defineProps({
  stats: {
    type: Object,
    required: true
  },

});

const isCollapsed = ref(false);

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
};

// 获取方向名称
const getSideName = (side) => {
  const sideNames = {
    left: '左',
    right: '右',
    top: '上',
    bottom: '下'
  };
  return sideNames[side] || side;
};

// 获取锚点显示标签
const getAnchorLabel = (anchorId) => {
  return anchorId;
};

</script>

<style scoped>
.info-panel {
  position: absolute;
  width: 360px;
  background: var(--b3-theme-background);
  border-radius: 8px;
  box-shadow: var(--b3-dialog-shadow);
  border: 1px solid var(--b3-theme-surface-lighter);
  z-index: 10;
  font-size: 14px;
  max-height: 90%;
  overflow: auto;
}

.info-header {
  padding: 12px 16px;
  background: var(--b3-theme-background);
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--b3-theme-surface-lighter);
}

.title {
  font-weight: 500;
  color: var(--b3-theme-on-surface);
}

.toggle-icon {
  color: var(--b3-theme-on-surface);
}

.info-content {
  padding: 12px;
  max-height: none;
  overflow: auto;
}

.info-group {
  margin-bottom: 12px;
  background: var(--b3-theme-surface);
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--b3-theme-surface-lighter);
}

.info-group h4 {
  margin: 0;
  padding: 8px 12px;
  background: var(--b3-theme-surface-lighter);
  border-bottom: 1px solid var(--b3-theme-surface-lighter);
  font-size: 13px;
  font-weight: 500;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 12px;
  border-bottom: 1px solid var(--b3-theme-surface-lighter);
}

.info-item:last-child {
  border-bottom: none;
}

.label {
  color: var(--b3-theme-on-surface);
  opacity: 0.86;
}

.value {
  color: var(--b3-theme-primary);
  font-family: monospace;
  min-width: 30px;
  text-align: right;
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-item {
  background: var(--b3-theme-surface);
  border: 1px solid var(--b3-theme-surface-lighter);
  margin-bottom: 8px;
  border-radius: 4px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  background: var(--b3-theme-surface-lighter);
  padding: 6px 8px;
  border-radius: 4px;
}

.card-title {
  font-weight: 500;
  color: var(--b3-theme-on-surface);
}

.anchor-count {
  font-size: 12px;
  color: var(--b3-theme-on-surface);
}

.anchor-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.anchor-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: var(--b3-theme-background);
  border: 1px solid var(--b3-theme-surface-lighter);
  margin: 4px 8px;
  border-radius: 4px;
}

.anchor-item:hover {
  background: var(--b3-theme-surface);
}

.anchor-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.anchor-position {
  display: flex;
  gap: 8px;
  font-family: monospace;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
}

.coord {
  background: var(--b3-theme-background);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  font-family: monospace;
  border: 1px solid var(--b3-theme-surface-lighter);
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 11px;
}

.connection-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.connection-item {
  background: var(--b3-theme-surface);
  padding: 8px;
  border-radius: 4px;
  margin-bottom: 4px;
  border: 1px solid var(--b3-theme-surface-lighter);
}

.connection-item:hover {
  background: var(--b3-theme-surface-lighter);
}

.connection-endpoints {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--b3-theme-surface-lighter);
  padding: 6px 8px;
  border-radius: 4px;
}

.connection-arrow {
  color: #409EFF;
}

.connection-from,
.connection-to {
  color: var(--b3-theme-on-surface);
}

.is-collapsed {
  width: 160px;
}

/* 自定义滚动条样式 */
.info-content::-webkit-scrollbar {
  width: 4px;
}

.info-content::-webkit-scrollbar-track {
  background: var(--b3-theme-background);
}

.info-content::-webkit-scrollbar-thumb {
  background: var(--b3-scroll-color);
  border-radius: 2px;
}

.info-content::-webkit-scrollbar-thumb:hover {
  background: var(--b3-scroll-hover-color);
}

/* 交互状态 */
.toggle-icon:hover {
  color: var(--b3-theme-primary);
}

.info-header:hover {
  background: var(--b3-theme-surface-lighter);
}

/* 分割线 */
.divider {
  border-bottom: 1px solid var(--b3-theme-surface-lighter);
  margin: 8px 0;
}
</style>