<template>
  <div class="file-selector-section">
    <div class="section-header">
      <h3>源文件</h3>
      <div class="header-actions">
        <button class="action-btn" @click="showFileSelector" :disabled="isDisabled">
          <i class="icon">📂</i>
          浏览文件
        </button>
        <button class="action-btn" @click="clearSelectedFiles" :disabled="isDisabled || selectedFiles.length === 0">
          <i class="icon">🗑️</i>
          清空
        </button>
      </div>
    </div>
    
    <div class="file-list-container">
      <div v-if="selectedFiles.length === 0" class="empty-tip">
        未选择文件，点击"浏览文件"添加全景图
      </div>
      <div v-else class="file-list">
        <div v-for="(file, index) in selectedFiles" :key="index" class="file-item">
          <div class="file-preview">
            <img :src="file.thumbnail" alt="全景图预览" />
          </div>
          <div class="file-info">
            <div class="file-name">{{ file.name }}</div>
            <div class="file-path">{{ file.path }}</div>
          </div>
          <div class="file-actions">
            <button class="action-btn small" @click="removeFile(index)" :disabled="isDisabled">
              <i class="icon">❌</i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, computed } from 'vue';
import { generateThumbnailFromUrl } from '../utils/fileUtils.js';

// 定义props，接收父组件传递的数据
const props = defineProps({
  selectedFiles: {
    type: Array,
    required: true
  },
  isExporting: {
    type: Boolean,
    default: false
  }
});

// 定义事件
const emit = defineEmits([
  'update:selectedFiles', 
  'add-files', 
  'remove-file', 
  'clear-files'
]);

// 计算禁用状态
const isDisabled = computed(() => {
  return props.isExporting;
});

// 显示文件选择器
const showFileSelector = async () => {
  try {
    // 创建一个临时的file input元素
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = '.jpg,.jpeg,.png';
    
    // 处理文件选择事件
    fileInput.onchange = async (event) => {
      const files = Array.from(event.target.files);
      
      if (files && files.length > 0) {
        // 处理选择的文件
        for (const file of files) {
          try {
            // 创建本地URL用于预览
            const objectUrl = URL.createObjectURL(file);
            
            // 生成缩略图
            const thumbnail = await generateThumbnailFromUrl(objectUrl);
            
            // 添加到选择的文件列表
            emit('add-files', {
              name: file.name,
              path: objectUrl,
              file: file,
              thumbnail
            });
          } catch (error) {
            console.error('生成缩略图失败:', error);
          }
        }
      }
    };
    
    // 触发文件选择对话框
    fileInput.click();
  } catch (error) {
    console.error('选择文件失败:', error);
  }
};

// 移除文件
const removeFile = (index) => {
  emit('remove-file', index);
};

// 清空文件列表
const clearSelectedFiles = () => {
  emit('clear-files');
};
</script>

<style scoped>
.file-selector-section {
  background: var(--cc-theme-surface);
  border-radius: 8px;
  border: 1px solid var(--cc-border-color);
}

.section-header {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--cc-border-color);
}

.section-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  background: var(--cc-theme-surface-light);
  border: 1px solid var(--cc-border-color);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
}

.action-btn:hover {
  background: var(--cc-theme-surface-hover);
}

.action-btn.small {
  padding: 4px 8px;
  font-size: 12px;
}

.file-list-container {
  padding: 16px;
  max-height: 300px;
  overflow-y: auto;
}

.empty-tip {
  padding: 32px;
  text-align: center;
  color: var(--cc-theme-on-surface-variant);
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.file-item {
  display: flex;
  gap: 12px;
  padding: 8px;
  border-radius: 4px;
  background: var(--cc-theme-surface-light);
  align-items: center;
}

.file-preview {
  width: 80px;
  height: 45px;
  overflow: hidden;
  border-radius: 4px;
  flex-shrink: 0;
}

.file-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-name {
  font-weight: 500;
}

.file-path {
  font-size: 12px;
  color: var(--cc-theme-on-surface-variant);
  word-break: break-all;
}

.icon {
  display: inline-block;
  width: 20px;
  text-align: center;
}
</style> 