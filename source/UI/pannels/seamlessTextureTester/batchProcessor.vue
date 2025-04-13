<template>
  <div class="batch-processor">
    <div class="batch-header">
      <h4>批量检测</h4>
      <div class="batch-actions">
        <button @click="triggerFileInput" :disabled="isProcessing">添加图片</button>
        <button @click="clearImages" :disabled="!imageFiles.length || isProcessing">清空</button>
        <button @click="startBatchProcessing" :disabled="!imageFiles.length || isProcessing">开始批量检测</button>
      </div>
      <input type="file" ref="fileInput" @change="handleFilesSelected" accept="image/*" multiple style="display: none" />
    </div>
    
    <div v-if="imageFiles.length > 0" class="image-list">
      <div v-for="(file, index) in imageFiles" :key="index" class="image-item">
        <div class="image-preview" :class="{ 'processed': processedResults[index] }">
          <img :src="imagePreviewUrls[index]" alt="Preview" />
          <div v-if="processedResults[index]" class="result-badge" :class="{ 'seamless': processedResults[index].isSeamless }">
            {{ processedResults[index].isSeamless ? '无缝' : '非无缝' }}
          </div>
        </div>
        <div class="image-info">
          <div class="image-name">{{ file.name }}</div>
          <div class="image-size">{{ formatFileSize(file.size) }}</div>
        </div>
        <div class="result-preview" v-if="processedResults[index]">
          <div class="score-line">
            <span>得分: {{ (processedResults[index].score * 100).toFixed(1) }}%</span>
            <div class="mini-progress">
              <div class="mini-bar" :style="{ width: `${processedResults[index].score * 100}%`, backgroundColor: getScoreColor(processedResults[index].score) }"></div>
            </div>
          </div>
        </div>
        <button class="remove-button" @click="removeImage(index)" :disabled="isProcessing">&times;</button>
      </div>
    </div>
    
    <div v-else class="empty-batch">
      <p>请添加图片以进行批量检测</p>
    </div>
    
    <div v-if="isProcessing" class="processing-overlay">
      <div class="processing-content">
        <div class="spinner"></div>
        <div class="progress-text">
          处理中... {{ currentProcessing + 1 }}/{{ imageFiles.length }}
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar-full" :style="{ width: `${(currentProcessing + 1) / imageFiles.length * 100}%` }"></div>
        </div>
      </div>
    </div>
    
    <div v-if="processingSummary" class="results-summary">
      <h4>检测结果统计</h4>
      <div class="summary-content">
        <div class="summary-row">
          <span>检测总数:</span>
          <span>{{ processingSummary.total }}</span>
        </div>
        <div class="summary-row">
          <span>无缝贴图:</span>
          <span>{{ processingSummary.seamless }}</span>
        </div>
        <div class="summary-row">
          <span>非无缝贴图:</span>
          <span>{{ processingSummary.nonSeamless }}</span>
        </div>
        <div class="summary-row">
          <span>平均得分:</span>
          <span>{{ processingSummary.averageScore.toFixed(1) }}%</span>
        </div>
      </div>
      
      <div class="export-section">
        <button @click="exportResults" :disabled="!processingSummary">导出结果</button>
      </div>
    </div>
  </div>
</template>

<script>
import { 分析无缝贴图, 批量分析无缝贴图 } from '../../../../src/toolBox/feature/useImage/useSeamlessDetector.js';

export default {
  name: 'BatchProcessor',
  props: {
    analysisOptions: {
      type: Object,
      default: () => ({
        borderWidth: 5,
        tileSize: 2,
        qualityThreshold: 0.85,
        edgeWeight: 0.4,
        tileWeight: 0.4,
        correlationWeight: 0.2,
        maxEdgeSize: 1024
      })
    }
  },
  data() {
    return {
      imageFiles: [],
      imagePreviewUrls: [],
      processedResults: [],
      isProcessing: false,
      currentProcessing: -1,
      processingSummary: null
    };
  },
  methods: {
    triggerFileInput() {
      this.$refs.fileInput.click();
    },
    
    handleFilesSelected(event) {
      const files = Array.from(event.target.files);
      if (files.length === 0) return;
      
      // 仅接受图片文件
      const imageFiles = files.filter(file => file.type.match('image.*'));
      
      // 添加到现有文件列表
      this.addImages(imageFiles);
      
      // 清空文件输入，允许选择相同文件
      this.$refs.fileInput.value = '';
    },
    
    addImages(files) {
      // 处理新添加的图片
      files.forEach(file => {
        this.imageFiles.push(file);
        
        // 创建预览URL
        const previewUrl = URL.createObjectURL(file);
        this.imagePreviewUrls.push(previewUrl);
        
        // 添加空结果占位符
        this.processedResults.push(null);
      });
    },
    
    removeImage(index) {
      // 释放预览URL资源
      if (this.imagePreviewUrls[index]) {
        URL.revokeObjectURL(this.imagePreviewUrls[index]);
      }
      
      // 移除图片
      this.imageFiles.splice(index, 1);
      this.imagePreviewUrls.splice(index, 1);
      this.processedResults.splice(index, 1);
      
      // 如果所有图片都被移除，重置摘要
      if (this.imageFiles.length === 0) {
        this.processingSummary = null;
      } else {
        // 更新摘要
        this.updateSummary();
      }
    },
    
    clearImages() {
      // 释放所有预览URL
      this.imagePreviewUrls.forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
      
      // 清空所有数组
      this.imageFiles = [];
      this.imagePreviewUrls = [];
      this.processedResults = [];
      this.processingSummary = null;
    },
    
    async startBatchProcessing() {
      if (this.imageFiles.length === 0 || this.isProcessing) return;
      
      this.isProcessing = true;
      this.currentProcessing = -1;
      
      try {
        // 逐个处理图片
        for (let i = 0; i < this.imageFiles.length; i++) {
          // 跳过已处理的图片
          if (this.processedResults[i]) continue;
          
          this.currentProcessing = i;
          
          // 加载图片
          const imgElement = await this.loadImageAsElement(this.imageFiles[i]);
          
          // 分析图片
          const result = await 分析无缝贴图(imgElement, this.analysisOptions);
          
          // 保存结果 - 修复this.$set问题
          const newResults = [...this.processedResults];
          newResults[i] = result;
          this.processedResults = newResults;
        }
        
        // 更新摘要
        this.updateSummary();
      } catch (error) {
        console.error('批量处理错误:', error);
      } finally {
        this.isProcessing = false;
        this.currentProcessing = -1;
      }
    },
    
    async loadImageAsElement(file) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          // 检查图片是否需要缩放
          const maxSize = this.analysisOptions.maxEdgeSize || 1024;
          if (img.width > maxSize || img.height > maxSize) {
            // 计算缩放比例
            const ratio = Math.min(maxSize / img.width, maxSize / img.height);
            const newWidth = Math.floor(img.width * ratio);
            const newHeight = Math.floor(img.height * ratio);
            
            // 创建缩略图
            const canvas = document.createElement('canvas');
            canvas.width = newWidth;
            canvas.height = newHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, newWidth, newHeight);
            
            // 从canvas创建新的图像
            const thumbnailImg = new Image();
            thumbnailImg.onload = () => resolve(thumbnailImg);
            thumbnailImg.onerror = () => reject(new Error(`无法创建缩略图: ${file.name}`));
            thumbnailImg.src = canvas.toDataURL('image/jpeg', 0.9);
            
            console.log(`图片已缩放: ${file.name}, 原始尺寸: ${img.width}x${img.height}, 缩放尺寸: ${newWidth}x${newHeight}`);
          } else {
            // 直接使用原图
            resolve(img);
          }
        };
        img.onerror = () => reject(new Error(`无法加载图片: ${file.name}`));
        img.src = URL.createObjectURL(file);
      });
    },
    
    updateSummary() {
      // 过滤出已处理的结果
      const validResults = this.processedResults.filter(r => r !== null);
      if (validResults.length === 0) return;
      
      // 统计无缝贴图数量
      const seamlessCount = validResults.filter(r => r.isSeamless).length;
      
      // 计算平均得分
      const totalScore = validResults.reduce((sum, r) => sum + r.score, 0);
      const averageScore = (totalScore / validResults.length) * 100;
      
      this.processingSummary = {
        total: validResults.length,
        seamless: seamlessCount,
        nonSeamless: validResults.length - seamlessCount,
        averageScore: averageScore
      };
    },
    
    exportResults() {
      if (!this.processingSummary) return;
      
      // 创建结果数据
      const resultData = this.imageFiles.map((file, index) => {
        const result = this.processedResults[index];
        if (!result) return null;
        
        return {
          filename: file.name,
          isSeamless: result.isSeamless,
          score: result.score,
          confidence: result.confidence,
          horizontalSimilarity: result.details.edgeAnalysis.horizontalSimilarity,
          verticalSimilarity: result.details.edgeAnalysis.verticalSimilarity,
          tileScore: result.details.tileAnalysis.score,
          correlationScore: result.details.correlationAnalysis.score,
          width: result.imageInfo.width,
          height: result.imageInfo.height
        };
      }).filter(item => item !== null);
      
      // 转换为CSV格式
      const headers = [
        '文件名', '是否无缝', '总体评分', '置信度', 
        '水平边缘匹配', '垂直边缘匹配', '平铺评分', '自相关评分',
        '宽度', '高度'
      ];
      
      const rows = resultData.map(item => [
        item.filename,
        item.isSeamless ? '是' : '否',
        (item.score * 100).toFixed(2) + '%',
        (item.confidence * 100).toFixed(2) + '%',
        (item.horizontalSimilarity * 100).toFixed(2) + '%',
        (item.verticalSimilarity * 100).toFixed(2) + '%',
        (item.tileScore * 100).toFixed(2) + '%',
        (item.correlationScore * 100).toFixed(2) + '%',
        item.width,
        item.height
      ]);
      
      // 添加摘要行
      rows.push([]);
      rows.push(['总计', '', '', '', '', '', '', '', '', '']);
      rows.push(['总数', this.processingSummary.total, '', '', '', '', '', '', '', '']);
      rows.push(['无缝贴图数', this.processingSummary.seamless, '', '', '', '', '', '', '', '']);
      rows.push(['非无缝贴图数', this.processingSummary.nonSeamless, '', '', '', '', '', '', '', '']);
      rows.push(['平均评分', this.processingSummary.averageScore.toFixed(2) + '%', '', '', '', '', '', '', '', '']);
      
      // 拼接CSV
      const csv = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      // 创建下载
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `无缝贴图检测结果_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    
    formatFileSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    },
    
    getScoreColor(score) {
      if (score >= 0.85) return '#4caf50'; // 绿色
      if (score >= 0.7) return '#8bc34a';  // 浅绿
      if (score >= 0.5) return '#ffc107';  // 黄色
      return '#f44336';  // 红色
    }
  }
};
</script>

<style scoped>
.batch-processor {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

.batch-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 16px;
}

.batch-header h4 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.batch-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.batch-actions button {
  padding: 6px 12px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.batch-actions button:hover:not(:disabled) {
  background-color: #2980b9;
}

.batch-actions button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.image-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
  overflow-y: auto;
  padding: 4px;
}

.image-item {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
  background-color: white;
  transition: transform 0.2s;
}

.image-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.image-preview {
  height: 120px;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
}

.image-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.image-preview.processed::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.05);
  pointer-events: none;
}

.result-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  background-color: #f44336;
  color: white;
}

.result-badge.seamless {
  background-color: #4caf50;
}

.image-info {
  padding: 8px;
}

.image-name {
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #333;
}

.image-size {
  font-size: 11px;
  color: #666;
  margin-top: 2px;
}

.result-preview {
  padding: 0 8px 8px;
}

.score-line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.score-line span {
  white-space: nowrap;
  color: #666;
}

.mini-progress {
  flex: 1;
  height: 4px;
  background-color: #e0e0e0;
  border-radius: 2px;
  overflow: hidden;
}

.mini-bar {
  height: 100%;
  transition: width 0.3s;
}

.remove-button {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
  font-size: 16px;
  line-height: 1;
  padding: 0;
}

.image-item:hover .remove-button {
  opacity: 1;
}

.empty-batch {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 14px;
  background-color: #f9f9f9;
  border-radius: 6px;
  padding: 40px;
}

.processing-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.processing-content {
  background-color: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  max-width: 300px;
  width: 100%;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.progress-text {
  font-size: 14px;
  color: #333;
}

.progress-bar-container {
  width: 100%;
  height: 6px;
  background-color: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-full {
  height: 100%;
  background-color: #3498db;
  transition: width 0.3s ease;
}

.results-summary {
  margin-top: 16px;
  padding: 16px;
  border-top: 1px solid #e0e0e0;
}

.results-summary h4 {
  margin: 0 0 12px;
  font-size: 16px;
  color: #333;
}

.summary-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.summary-row span:first-child {
  color: #666;
}

.summary-row span:last-child {
  font-weight: 500;
  color: #333;
}

.export-section {
  display: flex;
  justify-content: flex-end;
}

.export-section button {
  padding: 6px 12px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.export-section button:hover:not(:disabled) {
  background-color: #388e3c;
}

.export-section button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style> 