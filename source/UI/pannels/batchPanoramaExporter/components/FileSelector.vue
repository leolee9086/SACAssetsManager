<template>
  <div class="file-selector-section">
    <div class="section-header">
      <h3>源文件</h3>
      <div class="header-actions">
        <button class="action-btn" @click="showFileSelector" :disabled="isDisabled">
          <i class="icon">📂</i>
          浏览文件
        </button>
        <button class="action-btn" @click="scanFolder" :disabled="isDisabled">
          <i class="icon">🔍</i>
          扫描文件夹
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
import { generateThumbnailFromUrl, generateThumbnailFromPath, showWarningMessage } from '../utils/fileUtils.js';
// 替换kernelApi导入为electron和node模块
const { dialog } = window.require('@electron/remote');
const fs = window.require('fs');
const path = window.require('path');

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

// 扫描文件夹并导入全景图片
const scanFolder = async () => {
  try {
    // 使用系统API选择文件夹
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return;
    }
    
    const folderPath = result.filePaths[0];
    console.log('选择的文件夹路径:', folderPath);
    
    // 创建进度提示
    const progressElement = document.createElement('div');
    progressElement.className = 'scan-progress';
    progressElement.innerHTML = `
      <div class="progress-title">扫描全景图片</div>
      <div class="progress-status">准备扫描...</div>
      <div class="progress-bar-container">
        <div class="progress-bar" style="width: 0%"></div>
      </div>
      <div class="progress-detail">正在收集文件...</div>
    `;
    document.body.appendChild(progressElement);
    
    // 记录成功导入的全景图数量和扫描的文件数量
    let panoramaCount = 0;
    let scannedCount = 0;
    let totalFiles = 0;
    
    // 收集文件路径的函数
    const collectImageFiles = async (dir) => {
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        const files = [];
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            // 递归扫描子目录
            const subFiles = await collectImageFiles(fullPath);
            files.push(...subFiles);
          } else if (entry.isFile()) {
            const extension = path.extname(entry.name).toLowerCase();
            if (['.jpg', '.jpeg', '.png'].includes(extension)) {
              files.push(fullPath);
            }
          }
        }
        
        return files;
      } catch (error) {
        console.error(`读取目录 ${dir} 失败:`, error);
        return [];
      }
    };
    
    // 更新进度的函数
    const updateProgress = (current, total, status, isPanorama = false) => {
      const progressBar = progressElement.querySelector('.progress-bar');
      const progressDetail = progressElement.querySelector('.progress-detail');
      const progressStatus = progressElement.querySelector('.progress-status');
      
      const percent = Math.round((current / total) * 100);
      progressBar.style.width = `${percent}%`;
      progressDetail.textContent = `${current}/${total}${isPanorama ? ` (找到${panoramaCount}个全景图)` : ''}`;
      
      if (status) {
        progressStatus.textContent = status;
      }
    };
    
    // 收集所有图片文件
    console.log('开始递归扫描文件夹...');
    const imageFiles = await collectImageFiles(folderPath);
    totalFiles = imageFiles.length;
    
    if (totalFiles === 0) {
      document.body.removeChild(progressElement);
      showWarningMessage('未找到图片文件');
      return;
    }
    
    console.log(`找到 ${totalFiles} 个图片文件`);
    updateProgress(0, totalFiles, `找到 ${totalFiles} 个图片文件，开始分析...`);
    
    // 创建一个批处理函数
    const processBatch = async (filePaths, startIndex, batchSize) => {
      const endIndex = Math.min(startIndex + batchSize, filePaths.length);
      
      for (let i = startIndex; i < endIndex; i++) {
        const filePath = filePaths[i];
        const fileName = path.basename(filePath);
        
        // 更新进度提示
        scannedCount++;
        updateProgress(scannedCount, totalFiles, `检查图片 ${fileName}`, true);
        
        try {
          // 检查图片是否为全景图
          const panoramaResult = await checkIsPanoramaImage(filePath);
          
          if (panoramaResult.isPanorama) {
            updateProgress(scannedCount, totalFiles, `导入全景图 ${fileName} (比例:${panoramaResult.ratio.toFixed(2)})`, true);
            // 生成缩略图
            const thumbnail = await generateThumbnailFromPath(filePath);
            
            // 添加到文件列表
            emit('add-files', {
              name: fileName,
              path: filePath,
              thumbnail,
              accuracy: panoramaResult.accuracy,
              ratio: panoramaResult.ratio
            });
            
            panoramaCount++;
          }
        } catch (error) {
          console.error(`处理文件 ${fileName} 时出错:`, error);
        }
      }
      
      // 如果还有未处理的文件，处理下一批
      if (endIndex < filePaths.length) {
        // 允许界面刷新，防止阻塞
        await new Promise(resolve => setTimeout(resolve, 10));
        return processBatch(filePaths, endIndex, batchSize);
      }
    };
    
    // 开始批处理，每批5个文件
    await processBatch(imageFiles, 0, 5);
    
    // 移除进度提示
    document.body.removeChild(progressElement);
    
    // 显示导入结果
    if (panoramaCount > 0) {
      showWarningMessage(`导入完成：扫描了 ${totalFiles} 个图片文件，成功导入 ${panoramaCount} 个严格1:2比例的全景图`);
    } else {
      showWarningMessage(`未找到严格符合1:2比例的全景图片。已扫描 ${totalFiles} 个图片文件。`);
    }
    
  } catch (error) {
    console.error('扫描文件夹失败:', error);
    showWarningMessage('扫描文件夹失败: ' + error.message);
  }
};

// 检查图片是否为全景图，严格检查1:2比例
const checkIsPanoramaImage = (filePath) => {
  return new Promise((resolve, reject) => {
    // 首先检查文件是否存在且是一个文件
    fs.stat(filePath, (err, stats) => {
      if (err) {
        reject(new Error(`文件不存在或无法访问: ${err.message}`));
        return;
      }
      
      if (!stats.isFile()) {
        reject(new Error('不是一个文件'));
        return;
      }
      
      const img = new Image();
      
      img.onload = () => {
        // 只检查宽高比是否严格符合1:2比例
        const width = img.width;
        const height = img.height;
        const ratio = width / height;
        
        // 严格检查比例，允许极小的误差（0.05 = 5%）
        const isRatioMatch = Math.abs(ratio - 2) < 0.05;
        
        // 计算与2:1的接近程度（百分比）
        const ratioAccuracy = (1 - Math.abs(ratio - 2) / 2) * 100;
        
        resolve({
          isPanorama: isRatioMatch,
          ratio: ratio,
          width: width,
          height: height,
          accuracy: Math.round(ratioAccuracy)
        });
      };
      
      img.onerror = () => {
        reject(new Error('加载图片失败'));
      };
      
      img.src = filePath;
    });
  });
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

/* 扫描进度提示样式 */
.scan-progress {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 16px 24px;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  border-radius: 8px;
  font-size: 14px;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  min-width: 300px;
  text-align: center;
}

.progress-title {
  font-weight: bold;
  margin-bottom: 12px;
  font-size: 16px;
}

.progress-status {
  margin-bottom: 10px;
  color: #ccc;
}

.progress-bar-container {
  width: 100%;
  height: 8px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-bar {
  height: 100%;
  background-color: #4caf50;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-detail {
  font-size: 12px;
  color: #ccc;
}
</style> 