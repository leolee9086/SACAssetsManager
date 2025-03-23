<template>
  <div class="preview-card" :class="{ 'floating-mode': isFloating }">
    <div class="card-header">
      <h3>预览效果</h3>
      <button v-if="isFloating" class="close-float-btn" @click="closeFloating">×</button>
    </div>
    <div class="preview-content">
      <div v-if="template" class="svg-result" v-html="generateFinalSvg()"></div>
      <div v-else class="no-template">
        <div class="empty-state-icon">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 7H7V13H13V7Z" stroke="#cccccc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M17 11H11V17H17V11Z" stroke="#cccccc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="empty-state-text">请选择一个模板</div>
      </div>
    </div>
    <div class="preview-actions">
      <button 
        class="action-button download-button" 
        @click="downloadSvg"
        :disabled="!template"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 15L12 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M20 21H4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        下载SVG
      </button>
      <button 
        class="action-button copy-button" 
        @click="copySvgCode"
        :disabled="!template"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" stroke-width="2"/>
          <path d="M16 8V6C16 4.89543 15.1046 4 14 4H6C4.89543 4 4 4.89543 4 6V14C4 15.1046 4.89543 16 6 16H8" stroke="currentColor" stroke-width="2"/>
        </svg>
        复制SVG代码
      </button>
      <button 
        v-if="isFloating" 
        class="action-button close-button" 
        @click="closeFloating"
      >
        关闭
      </button>
    </div>
  </div>
</template>

<script setup>
// 引入响应式API
import { ref } from 'vue';

const props = defineProps({
  template: {
    type: Object,
    default: null
  },
  customValues: {
    type: Object,
    required: true
  },
  generateFinalSvg: {
    type: Function,
    required: true
  },
  isFloating: {
    type: Boolean,
    default: false
  },
  onClose: {
    type: Function,
    default: () => {}
  }
});

// 提示状态
const copySuccess = ref(false);

// 下载SVG文件
const downloadSvg = () => {
  if (!props.template) return;
  
  const svgCode = props.generateFinalSvg();
  const blob = new Blob([svgCode], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${props.template.name}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// 复制SVG代码到剪贴板
const copySvgCode = () => {
  if (!props.template) return;
  
  const svgCode = props.generateFinalSvg();
  navigator.clipboard.writeText(svgCode)
    .then(() => {
      copySuccess.value = true;
      alert('SVG代码已复制到剪贴板！');
      setTimeout(() => {
        copySuccess.value = false;
      }, 2000);
    })
    .catch(err => {
      console.error('复制失败：', err);
      alert('复制失败，请重试');
    });
};

// 关闭浮动窗口
const closeFloating = () => {
  if (props.isFloating && props.onClose) {
    props.onClose();
  }
};
</script>

<style scoped>
.preview-card {
  background-color: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.card-header {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.close-float-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background-color: #f0f0f0;
  color: #666;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
}

.close-float-btn:hover {
  background-color: #e0e0e0;
  color: #333;
}

/* 浮动模式样式 */
.floating-mode {
  height: 100%;
}

.preview-content {
  flex-grow: 1;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: auto;
  background-color: #f8f9fa;
  position: relative;
}

.svg-result {
  max-width: 100%;
  max-height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.1));
}

.no-template {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #999;
}

.empty-state-icon {
  margin-bottom: 16px;
}

.empty-state-text {
  font-size: 16px;
}

.preview-actions {
  display: flex;
  padding: 16px;
  gap: 12px;
  border-top: 1px solid #f0f0f0;
}

.action-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.download-button {
  background-color: #3a86ff;
  color: white;
}

.download-button:hover:not(:disabled) {
  background-color: #2a75f0;
}

.copy-button {
  background-color: #f8f9fa;
  color: #333;
  border: 1px solid #e0e0e0;
}

.copy-button:hover:not(:disabled) {
  background-color: #f0f0f0;
}

.close-button {
  background-color: #f0f0f0;
  color: #666;
  border: 1px solid #e0e0e0;
}

.close-button:hover {
  background-color: #e0e0e0;
}

@media (max-width: 600px) {
  .card-header {
    padding: 12px 16px;
  }
  
  .preview-content {
    padding: 16px;
  }
  
  .preview-actions {
    padding: 12px;
    flex-direction: column;
  }
  
  .action-button {
    padding: 10px;
    font-size: 14px;
  }
}
</style> 