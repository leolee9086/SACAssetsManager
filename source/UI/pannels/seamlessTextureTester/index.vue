<template>
  <div class="seamless-texture-tester-panel">
    <div class="tab-header">
      <div 
        class="tab-item" 
        :class="{ active: activeTab === 'single' }" 
        @click="switchTab('single')"
      >
        单图检测
      </div>
      <div 
        class="tab-item" 
        :class="{ active: activeTab === 'batch' }" 
        @click="switchTab('batch')"
      >
        批量检测
      </div>
    </div>
    
    <div class="tab-content">
      <div v-show="activeTab === 'single'" class="tab-pane">
        <SingleDetector ref="singleDetector" />
      </div>
      <div v-show="activeTab === 'batch'" class="tab-pane">
        <BatchProcessor ref="batchProcessor" :analysisOptions="batchAnalysisOptions" />
      </div>
    </div>
  </div>
</template>

<script>
import SingleDetector from './singleDetector.vue';
import BatchProcessor from './batchProcessor.vue';

export default {
  name: 'SeamlessTextureTester',
  components: {
    SingleDetector,
    BatchProcessor
  },
  data() {
    return {
      activeTab: 'single',
      batchAnalysisOptions: {
        borderWidth: 5,
        tileSize: 2,
        qualityThreshold: 0.85,
        edgeWeight: 0.4,
        tileWeight: 0.4,
        correlationWeight: 0.2,
        maxEdgeSize: 1024
      }
    };
  },
  methods: {
    switchTab(tabName) {
      this.activeTab = tabName;
      
      // 如果切换到批量检测标签页，同步单图检测的选项
      if (tabName === 'batch' && this.$refs.singleDetector) {
        const singleOptions = this.$refs.singleDetector.options;
        this.batchAnalysisOptions = {
          borderWidth: singleOptions.borderWidth,
          tileSize: singleOptions.tileSize,
          qualityThreshold: singleOptions.qualityThreshold,
          edgeWeight: singleOptions.edgeWeight,
          tileWeight: singleOptions.tileWeight,
          correlationWeight: singleOptions.correlationWeight,
          maxEdgeSize: singleOptions.maxEdgeSize
        };
      }
    }
  }
};
</script>

<style scoped>
.seamless-texture-tester-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

.tab-header {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  background-color: #f5f5f5;
}

.tab-item {
  padding: 12px 20px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
  color: #666;
  border-bottom: 2px solid transparent;
}

.tab-item:hover {
  background-color: #ececec;
  color: #333;
}

.tab-item.active {
  color: #3498db;
  border-bottom-color: #3498db;
  background-color: white;
}

.tab-content {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.tab-pane {
  height: 100%;
  overflow: hidden;
}
</style> 