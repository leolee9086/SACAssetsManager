<template>
  <div class="seamless-texture-tester">
    <div class="control-panel">
      <div class="header">
        <h3>无缝贴图检测器</h3>
      </div>
      
      <div class="upload-area" @click="triggerFileInput" @dragover.prevent @drop.prevent="handleDrop">
        <input type="file" ref="fileInput" @change="handleFileSelected" accept="image/*" style="display: none" />
        <div v-if="!imageSrc" class="upload-placeholder">
          <i class="icon">📁</i>
          <p>点击或拖拽图片到此处</p>
        </div>
        <div v-else class="preview-container">
          <img :src="imageSrc" class="preview-image" />
        </div>
      </div>
      
      <div class="actions">
        <button @click="analyzeTexture" :disabled="!imageSrc || isAnalyzing">分析图片</button>
        <button @click="clearImage" :disabled="!imageSrc || isAnalyzing">清除</button>
      </div>
      
      <div class="options">
        <div class="option-group">
          <div class="option-row">
            <label>边缘宽度</label>
            <input type="range" v-model.number="options.borderWidth" min="1" max="20" />
            <span class="option-value">{{ options.borderWidth }}px</span>
          </div>
          <div class="option-row">
            <label>平铺尺寸</label>
            <input type="range" v-model.number="options.tileSize" min="2" max="5" />
            <span class="option-value">{{ options.tileSize }}x{{ options.tileSize }}</span>
          </div>
          <div class="option-row">
            <label>最大边尺寸</label>
            <input type="range" v-model.number="options.maxEdgeSize" min="512" max="4096" step="256" />
            <span class="option-value">{{ options.maxEdgeSize }}px</span>
          </div>
        </div>
        <div class="option-row">
          <label>质量阈值:</label>
          <input type="range" v-model.number="options.qualityThreshold" min="0.5" max="0.95" step="0.05" />
          <span>{{ options.qualityThreshold.toFixed(2) }}</span>
        </div>
      </div>
    </div>
    
    <div class="result-panel">
      <div v-if="isAnalyzing" class="analyzing">
        <div class="spinner"></div>
        <span>正在分析中...</span>
      </div>
      
      <div v-else-if="result" class="result-container">
        <div class="result-header" :class="{'is-seamless': result.isSeamless}">
          <h3>{{ result.isSeamless ? '✓ 无缝贴图' : '✗ 非无缝贴图' }}</h3>
          <div class="score-badge">
            匹配度: {{ (result.score * 100).toFixed(0) }}%
          </div>
        </div>
        
        <div class="result-details">
          <div class="detail-row">
            <span>总体评分:</span>
            <div class="progress-bar">
              <div class="progress" :style="{width: `${result.score * 100}%`, backgroundColor: getScoreColor(result.score)}"></div>
            </div>
            <span>{{ (result.score * 100).toFixed(1) }}%</span>
          </div>
          
          <div v-if="result.isAdjusted" class="adjustment-info">
            <div class="adjustment-badge">
              <span>评分已调整</span>
              <span class="adjustment-reason">{{ result.adjustmentReason }}</span>
            </div>
            <div class="detail-row">
              <span>原始评分:</span>
              <div class="progress-bar">
                <div class="progress" :style="{width: `${result.rawScore * 100}%`, backgroundColor: getScoreColor(result.rawScore)}"></div>
              </div>
              <span>{{ (result.rawScore * 100).toFixed(1) }}%</span>
            </div>
          </div>
          
          <div class="detail-row">
            <span>水平边缘匹配:</span>
            <div class="progress-bar">
              <div class="progress" :style="{width: `${result.details.edgeAnalysis.horizontalSimilarity * 100}%`, backgroundColor: getScoreColor(result.details.edgeAnalysis.horizontalSimilarity)}"></div>
            </div>
            <span>{{ (result.details.edgeAnalysis.horizontalSimilarity * 100).toFixed(1) }}%</span>
          </div>
          
          <div class="detail-row">
            <span>垂直边缘匹配:</span>
            <div class="progress-bar">
              <div class="progress" :style="{width: `${result.details.edgeAnalysis.verticalSimilarity * 100}%`, backgroundColor: getScoreColor(result.details.edgeAnalysis.verticalSimilarity)}"></div>
            </div>
            <span>{{ (result.details.edgeAnalysis.verticalSimilarity * 100).toFixed(1) }}%</span>
          </div>
          
          <div class="detail-row">
            <span>平铺接缝分析:</span>
            <div class="progress-bar">
              <div class="progress" :style="{width: `${result.details.tileAnalysis.score * 100}%`, backgroundColor: getScoreColor(result.details.tileAnalysis.score)}"></div>
            </div>
            <span>{{ (result.details.tileAnalysis.score * 100).toFixed(1) }}%</span>
          </div>
          
          <div class="detail-row">
            <span>自相关性分析:</span>
            <div class="progress-bar">
              <div class="progress" :style="{width: `${result.details.correlationAnalysis.score * 100}%`, backgroundColor: getScoreColor(result.details.correlationAnalysis.score)}"></div>
            </div>
            <span>{{ (result.details.correlationAnalysis.score * 100).toFixed(1) }}%</span>
          </div>
          
          <div v-if="result.details.patternAnalysis" class="pattern-analysis">
            <h4>图案分析</h4>
            <div class="detail-row">
              <span>图案复杂度:</span>
              <div class="progress-bar">
                <div class="progress" :style="{width: `${result.details.patternAnalysis.complexityScore * 100}%`, backgroundColor: getScoreColor(result.details.patternAnalysis.complexityScore)}"></div>
              </div>
              <span>{{ (result.details.patternAnalysis.complexityScore * 100).toFixed(1) }}%</span>
            </div>
            
            <div class="detail-row">
              <span>规律性:</span>
              <div class="progress-bar">
                <div class="progress" :style="{width: `${result.details.patternAnalysis.regularityScore * 100}%`, backgroundColor: getScoreColor(1 - result.details.patternAnalysis.regularityScore)}"></div>
              </div>
              <span>{{ (result.details.patternAnalysis.regularityScore * 100).toFixed(1) }}%</span>
            </div>
            
            <div class="detail-row">
              <span>曲线特征:</span>
              <div class="progress-bar">
                <div class="progress" :style="{width: `${result.details.patternAnalysis.curvePatternScore * 100}%`, backgroundColor: getScoreColor(1 - result.details.patternAnalysis.curvePatternScore)}"></div>
              </div>
              <span>{{ (result.details.patternAnalysis.curvePatternScore * 100).toFixed(1) }}%</span>
            </div>
          </div>
          
          <div class="detail-row">
            <span>置信度:</span>
            <div class="progress-bar">
              <div class="progress" :style="{width: `${result.confidence * 100}%`, backgroundColor: getScoreColor(result.confidence)}"></div>
            </div>
            <span>{{ (result.confidence * 100).toFixed(1) }}%</span>
          </div>
        </div>
        
        <div class="tiled-preview" v-if="tiledPreviewUrl">
          <h4>平铺预览</h4>
          <div class="tiled-image-container">
            <img :src="tiledPreviewUrl" class="tiled-image" />
          </div>
        </div>
        
        <div class="image-info" v-if="result.imageInfo">
          <h4>图片信息</h4>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">尺寸:</div>
              <div class="info-value">{{ result.imageInfo.width }}×{{ result.imageInfo.height }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">类型:</div>
              <div class="info-value">{{ getImageSizeCategory(result.imageInfo) }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">比例:</div>
              <div class="info-value">{{ result.imageInfo.aspectRatio.toFixed(2) }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else-if="error" class="error-container">
        <div class="error-icon">❌</div>
        <div class="error-message">{{ error }}</div>
      </div>
      
      <div v-else class="empty-result">
        <p>请上传图片并点击"分析图片"按钮</p>
      </div>
    </div>
  </div>
</template>

<script>
import { 分析无缝贴图 } from '../../../../src/toolBox/feature/useImage/useSeamlessDetector.js';
import { formatFileSize, getScoreColor, getImageSizeCategory } from './utils.js';

export default {
  name: 'SingleDetector',
  data() {
    return {
      imageSrc: null,
      imageElement: null,
      isAnalyzing: false,
      result: null,
      error: null,
      tiledPreviewUrl: null,
      options: {
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
    // 导入工具函数
    getScoreColor,
    getImageSizeCategory,
    formatFileSize,
    
    triggerFileInput() {
      this.$refs.fileInput.click();
    },
    
    handleFileSelected(event) {
      const files = event.target.files;
      if (files.length > 0) {
        this.loadImage(files[0]);
      }
    },
    
    handleDrop(event) {
      const files = event.dataTransfer.files;
      if (files.length > 0) {
        this.loadImage(files[0]);
      }
    },
    
    async loadImageFromFile(file) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        
        img.onload = () => {
          // 检查图片是否需要缩放
          const maxSize = this.options.maxEdgeSize || 1024;
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
            thumbnailImg.onload = () => {
              URL.revokeObjectURL(objectUrl);
              console.log(`图片已缩放: 原始尺寸: ${img.width}x${img.height}, 缩放尺寸: ${newWidth}x${newHeight}`);
              resolve({
                element: thumbnailImg,
                src: thumbnailImg.src,
                originalSize: { width: img.width, height: img.height },
                scaledSize: { width: newWidth, height: newHeight }
              });
            };
            thumbnailImg.onerror = () => {
              URL.revokeObjectURL(objectUrl);
              reject(new Error('无法创建缩略图'));
            };
            thumbnailImg.src = canvas.toDataURL('image/jpeg', 0.9);
          } else {
            // 直接使用原图
            URL.revokeObjectURL(objectUrl);
            resolve({
              element: img,
              src: objectUrl,
              originalSize: { width: img.width, height: img.height }
            });
          }
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('无法加载图片'));
        };
        
        img.src = objectUrl;
      });
    },
    
    async loadImage(file) {
      if (!file.type.match('image.*')) {
        this.error = '请选择有效的图片文件';
        return;
      }
      
      try {
        this.isAnalyzing = true;
        this.result = null;
        this.error = null;
        this.tiledPreviewUrl = null;
        
        // 加载图片
        const imageResult = await this.loadImageFromFile(file);
        this.imageSrc = imageResult.src;
        this.imageElement = imageResult.element;
        
        // 显示图片信息
        if (imageResult.scaledSize) {
          this.imageInfo = {
            filename: file.name,
            size: this.formatFileSize(file.size),
            width: imageResult.originalSize.width,
            height: imageResult.originalSize.height,
            scaledWidth: imageResult.scaledSize.width,
            scaledHeight: imageResult.scaledSize.height
          };
        } else {
          this.imageInfo = {
            filename: file.name,
            size: this.formatFileSize(file.size),
            width: imageResult.originalSize.width,
            height: imageResult.originalSize.height
          };
        }
        
        // 分析无缝贴图
        const result = await 分析无缝贴图(this.imageElement, {
          borderWidth: this.options.borderWidth,
          tileSize: this.options.tileSize,
          qualityThreshold: this.options.qualityThreshold,
          edgeWeight: this.options.edgeWeight,
          tileWeight: this.options.tileWeight,
          correlationWeight: this.options.correlationWeight
        });
        
        this.result = result;
        
        // 获取平铺预览
        if (result.details.tileAnalysis.tiledCanvas) {
          this.tiledPreviewUrl = result.details.tileAnalysis.tiledCanvas.toDataURL();
        }
      } catch (err) {
        console.error('分析失败:', err);
        this.error = `分析过程中出错: ${err.message || '未知错误'}`;
      } finally {
        this.isAnalyzing = false;
        this.$refs.fileInput.value = '';
      }
    },
    
    clearImage() {
      this.imageSrc = null;
      this.imageElement = null;
      this.result = null;
      this.error = null;
      this.tiledPreviewUrl = null;
      this.$refs.fileInput.value = '';
    }
  }
};
</script>

<style scoped>
.seamless-texture-tester {
  display: flex;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

.control-panel {
  width: 40%;
  padding: 16px;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.result-panel {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.upload-area {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.3s;
  background-color: #f9f9f9;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-area:hover {
  border-color: #999;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.upload-placeholder .icon {
  font-size: 32px;
  color: #666;
}

.upload-placeholder p {
  margin: 0;
  color: #666;
}

.preview-container {
  width: 100%;
  max-height: 200px;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-image {
  max-width: 100%;
  max-height: 200px;
  object-fit: contain;
}

.actions {
  display: flex;
  gap: 10px;
}

.actions button {
  flex: 1;
  padding: 8px 16px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.actions button:hover:not(:disabled) {
  background-color: #2980b9;
}

.actions button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background-color: #f5f5f5;
  padding: 12px;
  border-radius: 6px;
}

.option-group {
  display: flex;
  gap: 10px;
}

.option-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.option-row label {
  color: #666;
}

.option-row input[type="range"] {
  width: 100%;
}

.option-row span {
  text-align: right;
  color: #333;
}

.option-value {
  width: 50px;
}

.analyzing {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 16px;
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

.result-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-radius: 6px;
  background-color: #f44336;
  color: white;
}

.result-header.is-seamless {
  background-color: #4caf50;
}

.result-header h3 {
  margin: 0;
  font-size: 18px;
}

.score-badge {
  background-color: rgba(255, 255, 255, 0.2);
  padding: 4px 8px;
  border-radius: 20px;
  font-size: 14px;
}

.result-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background-color: #f5f5f5;
  padding: 16px;
  border-radius: 6px;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.detail-row span:first-child {
  width: 120px;
  color: #666;
}

.detail-row span:last-child {
  width: 50px;
  text-align: right;
  color: #333;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background-color: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.progress {
  height: 100%;
  transition: width 0.3s ease;
}

.tiled-preview {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tiled-preview h4 {
  margin: 0;
  color: #333;
}

.tiled-image-container {
  max-height: 300px;
  overflow: hidden;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
}

.tiled-image {
  width: 100%;
  object-fit: contain;
}

.image-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background-color: #f5f5f5;
  padding: 16px;
  border-radius: 6px;
}

.image-info h4 {
  margin: 0;
  color: #333;
  font-size: 14px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  color: #666;
}

.info-value {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  gap: 16px;
  color: #f44336;
  text-align: center;
}

.error-icon {
  font-size: 48px;
}

.error-message {
  font-size: 16px;
}

.empty-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #666;
}

.adjustment-info {
  background-color: #fff3e0;
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 10px;
  border-left: 3px solid #ff9800;
}

.adjustment-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
}

.adjustment-badge span:first-child {
  font-weight: 500;
  color: #e65100;
}

.adjustment-reason {
  color: #666;
  font-style: italic;
}

.pattern-analysis {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px dashed #ddd;
}

.pattern-analysis h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #555;
}
</style> 