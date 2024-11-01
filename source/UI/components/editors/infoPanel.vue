<template>
    <div class="info-panel" :class="{ 'is-collapsed': isCollapsed }">
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
            <div v-for="(card, cardId) in stats.cardAnchors" 
                 :key="cardId" 
                 class="card-item">
              <div class="card-header">
                <span class="card-title">{{ card.title }}</span>
                <span class="anchor-count">{{ card.anchors.length }}个锚点</span>
              </div>
              <div class="anchor-list">
                <div v-for="anchor in card.anchors" 
                     :key="anchor.id" 
                     class="anchor-item">
                  <div class="anchor-info">
                    <span class="anchor-type" :class="anchor.type">{{ anchor.type }}</span>
                    <span class="anchor-side">{{ getSideName(anchor.side) }}</span>
                    <span class="anchor-label">{{ anchor.label || anchor.id }}</span>
                  </div>
                  <div class="anchor-position" v-if="anchor.position">
                    <span class="coord">x: {{ Math.round(anchor.position.x) }}</span>
                    <span class="coord">y: {{ Math.round(anchor.position.y) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="info-group">
          <h4>连接关系</h4>
          <div class="connection-list">
            <div v-for="(conn, index) in stats.connections" 
                 :key="index" 
                 class="connection-item">
              <div class="connection-endpoints">
                <span class="connection-from">{{ getAnchorLabel(conn.start) }}</span>
                <span class="connection-arrow">→</span>
                <span class="connection-to">{{ getAnchorLabel(conn.end) }}</span>
              </div>
              <div class="connection-coords" v-if="conn.startAnchor?.position && conn.endAnchor?.position">
                <div class="coord-item">
                  <span class="coord-label">起点:</span>
                  <span class="coord">x: {{ Math.round(conn.startAnchor.position.x) }}</span>
                  <span class="coord">y: {{ Math.round(conn.startAnchor.position.y) }}</span>
                </div>
                <div class="coord-item">
                  <span class="coord-label">终点:</span>
                  <span class="coord">x: {{ Math.round(conn.endAnchor.position.x) }}</span>
                  <span class="coord">y: {{ Math.round(conn.endAnchor.position.y) }}</span>
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
    }
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
    // 从stats中查找对应的锚点信息
    for (const card of Object.values(props.stats.cardAnchors)) {
      const anchor = card.anchors.find(a => a.id === anchorId);
      if (anchor) {
        return `${card.title}:${anchor.label || anchor.id}`;
      }
    }
    return anchorId;
  };
  </script>
  
  <style scoped>
  .info-panel {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 360px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    font-size: 14px;
  }
  
  .info-header {
    padding: 12px 16px;
    background: #f4f4f5;
    border-radius: 8px 8px 0 0;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .title {
    font-weight: 500;
    color: #303133;
  }
  
  .toggle-icon {
    color: #909399;
  }
  
  .info-content {
    padding: 16px;
    max-height: none;
    overflow: auto;
  }
  
  .info-group {
    margin-bottom: 16px;
  }
  
  .info-group h4 {
    margin: 0 0 8px 0;
    color: #606266;
    font-size: 13px;
  }
  
  .info-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
    padding: 4px 0;
  }
  
  .label {
    color: #909399;
  }
  
  .value {
    color: #303133;
    font-family: monospace;
  }
  
  .card-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .card-item {
    background: #f8f9fa;
    border-radius: 6px;
    padding: 8px;
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .card-title {
    font-weight: 500;
    color: #303133;
  }
  
  .anchor-count {
    font-size: 12px;
    color: #909399;
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
    padding: 6px;
    background: white;
    border-radius: 4px;
    margin-bottom: 4px;
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
    color: #666;
  }
  
  .coord {
    background: #f5f7fa;
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
    background: #f8f9fa;
    padding: 8px;
    border-radius: 4px;
    margin-bottom: 4px;
  }
  
  .connection-endpoints {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .connection-arrow {
    color: #409EFF;
  }
  
  .connection-from, .connection-to {
    color: #606266;
  }
  
  .is-collapsed {
    width: 160px;
  }
  
  /* 自定义滚动条样式 */
  .info-content::-webkit-scrollbar {
    width: 6px;
  }
  
  .info-content::-webkit-scrollbar-track {
    background: #f4f4f5;
    border-radius: 3px;
  }
  
  .info-content::-webkit-scrollbar-thumb {
    background: #909399;
    border-radius: 3px;
  }
  </style>