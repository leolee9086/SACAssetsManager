<template>
  <div class="setting-profile">
    <div class="profile-header">
      <h4>配置 #{{ profileIndex + 1 }}</h4>
      <div class="profile-actions">
        <button 
          v-if="canRemove" 
          class="action-btn small" 
          @click="$emit('remove')">
          <i class="icon">❌</i>
        </button>
      </div>
    </div>
    
    <div class="settings-grid">
      <div class="setting-group">
        <div class="setting-item">
          <label>视频分辨率</label>
          <select v-model="profile.resolution">
            <option value="1080p">1920×1080 (1080p)</option>
            <option value="2k">2560×1440 (2K)</option>
            <option value="4k">3840×2160 (4K)</option>
          </select>
        </div>
        
        <div class="setting-item">
          <label>视频帧率</label>
          <select v-model="profile.fps">
            <option :value="30">30 FPS</option>
            <option :value="60">60 FPS</option>
            <option :value="120">120 FPS</option>
          </select>
        </div>
      </div>
      
      <div class="setting-group">
        <div class="setting-item">
          <label>视频方向</label>
          <select v-model="profile.isLandscape">
            <option :value="true">横屏</option>
            <option :value="false">竖屏</option>
          </select>
        </div>
        
        <div class="setting-item">
          <label>视频时长</label>
          <select v-model="profile.duration">
            <option :value="12">12秒</option>
            <option :value="24">24秒</option>
            <option :value="30">30秒</option>
            <option :value="40">40秒</option>
          </select>
        </div>
      </div>
      
      <div class="setting-group">
        <div class="setting-item">
          <label>旋转圈数</label>
          <select v-model="profile.rotations">
            <option :value="1">1圈</option>
            <option :value="2">2圈</option>
            <option :value="3">3圈</option>
          </select>
        </div>
        
        <div class="setting-item">
          <label>平滑度</label>
          <input type="range" v-model="profile.smoothness" min="0" max="1" step="0.1" />
          <div class="range-value">{{ parseFloat(profile.smoothness).toFixed(1) }}</div>
        </div>
      </div>
    </div>
    
    <!-- 水印设置 -->
    <div class="watermark-settings">
      <div class="watermark-header">
        <h4>水印设置</h4>
        <div class="expand-toggle" @click="toggleWatermarkExpand">
          {{ profile.watermarkExpanded ? '收起' : '展开' }}
        </div>
      </div>
      
      <div class="watermark-content" v-if="profile.watermarkExpanded">
        <!-- 改为左右分栏布局 -->
        <div class="watermark-layout">
          <!-- 左侧水印设置 -->
          <div class="watermark-options-column">
            <!-- 文字水印设置 -->
            <div class="watermark-section">
              <div class="section-header">
                <div class="section-title">文字水印</div>
                <div class="section-toggle">
                  <input 
                    type="checkbox" 
                    :id="`textWatermarkEnabled-${profileIndex}`" 
                    v-model="profile.watermark.text.enabled" 
                  />
                  <label :for="`textWatermarkEnabled-${profileIndex}`">启用</label>
                </div>
              </div>
              
              <div class="watermark-options" v-if="profile.watermark.text.enabled">
                <div class="setting-item">
                  <label>水印文字</label>
                  <input 
                    type="text" 
                    v-model="profile.watermark.text.text" 
                    placeholder="请输入水印文字" 
                  />
                </div>
                
                <!-- 字体选择功能 -->
                <div class="setting-item">
                  <label>字体</label>
                  <div class="font-selector">
                    <div class="font-selector-header" @click="toggleFontSelector">
                      <span :style="{fontFamily: profile.watermark.text.fontFamily}">
                        {{ profile.watermark.text.fontFamily }}
                      </span>
                      <i class="icon">{{ fontSelectorOpen ? '🔼' : '🔽' }}</i>
                    </div>
                    <div class="font-selector-dropdown" v-if="fontSelectorOpen">
                      <div class="font-search">
                        <input 
                          type="text" 
                          v-model="fontSearchQuery" 
                          placeholder="搜索字体..."
                          @input="filterFonts" 
                        />
                      </div>
                      <div class="font-list">
                        <div 
                          v-for="font in filteredFonts" 
                          :key="font" 
                          class="font-item"
                          :class="{'selected': profile.watermark.text.fontFamily === font}"
                          :style="{fontFamily: font}" 
                          @click="selectFont(font)"
                        >
                          {{ font }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="setting-item">
                  <label>位置</label>
                  <select v-model="profile.watermark.text.position">
                    <option value="topLeft">左上角</option>
                    <option value="topRight">右上角</option>
                    <option value="bottomLeft">左下角</option>
                    <option value="bottomRight">右下角</option>
                    <option value="center">居中</option>
                  </select>
                </div>
                
                <div class="setting-item">
                  <label>字体大小</label>
                  <select v-model="profile.watermark.text.fontSize">
                    <option value="small">小</option>
                    <option value="medium">中</option>
                    <option value="large">大</option>
                  </select>
                </div>
                
                <div class="setting-item">
                  <label>文字颜色</label>
                  <div class="color-picker">
                    <input type="color" v-model="profile.watermark.text.colorHex" @input="updateTextWatermarkColor" />
                    <div class="transparency-slider">
                      <input 
                        type="range" 
                        v-model="profile.watermark.text.opacity" 
                        min="0" 
                        max="1" 
                        step="0.1" 
                        @input="updateTextWatermarkColor" 
                      />
                      <div class="range-value">透明度: {{ parseFloat(profile.watermark.text.opacity).toFixed(1) }}</div>
                    </div>
                  </div>
                </div>
                
                <!-- 字体预览区域 -->
                <div class="font-preview-area">
                  <div class="preview-label">文字预览</div>
                  <div 
                    class="font-preview" 
                    :style="{
                      fontFamily: profile.watermark.text.fontFamily,
                      color: profile.watermark.text.color,
                      fontSize: getFontSizePreview(profile.watermark.text.fontSize)
                    }"
                  >
                    {{ profile.watermark.text.text || '全景视频' }}
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 图片水印设置 -->
            <div class="watermark-section">
              <div class="section-header">
                <div class="section-title">图片水印</div>
                <div class="section-toggle">
                  <input 
                    type="checkbox" 
                    :id="`imageWatermarkEnabled-${profileIndex}`" 
                    v-model="profile.watermark.image.enabled" 
                  />
                  <label :for="`imageWatermarkEnabled-${profileIndex}`">启用</label>
                </div>
              </div>
              
              <div class="watermark-options" v-if="profile.watermark.image.enabled">
                <div class="setting-item">
                  <label>水印图片</label>
                  <div class="image-selector">
                    <button class="action-btn" @click="selectWatermarkImage">
                      <i class="icon">📷</i>
                      选择图片
                    </button>
                    <div v-if="profile.watermark.image.preview" class="image-preview">
                      <img :src="profile.watermark.image.preview" alt="水印预览" />
                    </div>
                  </div>
                </div>
                
                <div class="setting-item">
                  <label>位置</label>
                  <select v-model="profile.watermark.image.position">
                    <option value="topLeft">左上角</option>
                    <option value="topRight">右上角</option>
                    <option value="bottomLeft">左下角</option>
                    <option value="bottomRight">右下角</option>
                    <option value="center">居中</option>
                  </select>
                </div>
                
                <div class="setting-item">
                  <label>大小 (占视频宽度的百分比)</label>
                  <div class="range-with-value">
                    <input 
                      type="range" 
                      v-model="profile.watermark.image.size" 
                      min="0.05" 
                      max="0.3" 
                      step="0.01" 
                    />
                    <div class="range-value">{{ Math.round(profile.watermark.image.size * 100) }}%</div>
                  </div>
                </div>
                
                <div class="setting-item">
                  <label>透明度</label>
                  <div class="range-with-value">
                    <input 
                      type="range" 
                      v-model="profile.watermark.image.opacity" 
                      min="0" 
                      max="1" 
                      step="0.1" 
                    />
                    <div class="range-value">{{ parseFloat(profile.watermark.image.opacity).toFixed(1) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 右侧水印预览 -->
          <div class="watermark-preview-column" v-if="hasWatermarkEnabled">
            <div class="watermark-preview-section">
              <div class="section-header">
                <div class="section-title">水印效果预览</div>
                <div class="section-toggle">
                  <button 
                    class="action-btn small" 
                    @click="$emit('generate-preview')" 
                    :disabled="!canGeneratePreview"
                  >
                    <i class="icon">🔄</i>
                    更新预览
                  </button>
                </div>
              </div>
              
              <div class="preview-container">
                <div v-if="!profile.previewImage" class="empty-preview" :style="previewContainerStyle">
                  <div v-if="canGeneratePreview">点击"更新预览"按钮查看水印效果</div>
                  <div v-else>请先选择全景图以生成预览</div>
                </div>
                <div v-else-if="profile.previewError" class="preview-error">
                  <div class="error-icon">⚠️</div>
                  <div class="error-message">渲染失败: {{ profile.previewError }}</div>
                </div>
                <div v-else class="frame-preview">
                  <img :src="profile.previewImage" alt="水印预览" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, defineProps, defineEmits, watch } from 'vue';
import { 
  getFontSizePreview,
  hasWatermarkEnabled as checkWatermarkEnabled,
  updateTextWatermarkColor as updateWatermarkColor
} from '../utils/watermarkUtils.js';
import { getPreviewContainerStyle } from '../utils/common.js';

const props = defineProps({
  profile: {
    type: Object,
    required: true
  },
  profileIndex: {
    type: Number,
    required: true
  },
  canRemove: {
    type: Boolean,
    default: false
  },
  availableFonts: {
    type: Array,
    default: () => []
  },
  canGeneratePreview: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'remove', 
  'update-profile', 
  'generate-preview'
]);

// 字体选择器状态
const fontSelectorOpen = ref(false);
const fontSearchQuery = ref('');
const filteredFonts = ref([]);

// 监听 availableFonts 属性变化，确保字体列表正确更新
watch(() => props.availableFonts, (newFonts) => {
  if (newFonts && newFonts.length > 0) {
    filteredFonts.value = [...newFonts];
    console.log('字体列表已更新，总共', filteredFonts.value.length, '个字体');
  }
}, { immediate: true });

// 计算属性
const hasWatermarkEnabled = computed(() => 
  checkWatermarkEnabled(props.profile)
);

const previewContainerStyle = computed(() => 
  getPreviewContainerStyle(props.profile)
);

// 更新水印颜色
const updateTextWatermarkColor = () => {
  updateWatermarkColor(props.profile);
  emit('update-profile', props.profile);
};

// 展开/收起水印设置
const toggleWatermarkExpand = () => {
  props.profile.watermarkExpanded = !props.profile.watermarkExpanded;
  emit('update-profile', props.profile);
};

// 切换字体选择器
const toggleFontSelector = () => {
  fontSelectorOpen.value = !fontSelectorOpen.value;
  
  // 重置筛选结果，确保显示全部字体
  if (fontSelectorOpen.value) {
    fontSearchQuery.value = '';
    filteredFonts.value = [...props.availableFonts];
    
    // 检查字体列表是否为空
    if (filteredFonts.value.length === 0 && props.availableFonts.length > 0) {
      filteredFonts.value = [...props.availableFonts];
      console.log('重新加载字体列表，总共', filteredFonts.value.length, '个字体');
    }
    
    // 点击外部关闭选择器
    setTimeout(() => {
      const clickListener = (e) => {
        const selector = document.querySelector(`.font-selector`);
        if (selector && !selector.contains(e.target)) {
          fontSelectorOpen.value = false;
          document.removeEventListener('click', clickListener);
        }
      };
      document.addEventListener('click', clickListener);
    }, 0);
  }
};

// 根据搜索词过滤字体
const filterFonts = () => {
  const query = fontSearchQuery.value.toLowerCase();
  if (!query) {
    // 空查询时显示所有字体
    filteredFonts.value = [...props.availableFonts];
  } else {
    // 确保有字体可筛选
    if (props.availableFonts.length === 0) {
      console.warn('没有可用字体列表进行筛选');
      return;
    }
    
    // 匹配包含查询词的字体
    filteredFonts.value = props.availableFonts.filter(
      font => font.toLowerCase().includes(query)
    );
    
    console.log(`字体搜索"${query}"，找到 ${filteredFonts.value.length} 个匹配项`);
  }
};

// 添加对搜索框的监听，实现即时搜索
watch(fontSearchQuery, () => {
  filterFonts();
});

// 选择字体
const selectFont = (font) => {
  props.profile.watermark.text.fontFamily = font;
  fontSelectorOpen.value = false;
  emit('update-profile', props.profile);
};

// 选择水印图片
const selectWatermarkImage = () => {
  // 创建临时文件选择元素
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  
  fileInput.onchange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      // 使用ObjectURL创建预览
      const preview = URL.createObjectURL(file);
      
      // 更新配置
      props.profile.watermark.image.file = file;
      props.profile.watermark.image.preview = preview;
      emit('update-profile', props.profile);
    }
  };
  
  // 触发文件选择
  fileInput.click();
};
</script>

<style scoped>
.setting-profile {
  border: 1px solid var(--cc-border-color);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 16px;
}

.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--cc-theme-surface-light);
  border-bottom: 1px solid var(--cc-border-color);
}

.profile-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
}

.profile-actions {
  display: flex;
  gap: 8px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
  padding: 16px;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-item label {
  font-size: 14px;
  font-weight: 500;
}

.setting-item select,
.setting-item input[type="text"] {
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid var(--cc-border-color);
  background: var(--cc-theme-surface-light);
  width: 100%;
}

.setting-item input[type="text"] {
  font-size: 14px;
}

.setting-item input[type="range"] {
  width: 100%;
}

.range-value {
  text-align: center;
  font-size: 12px;
  color: var(--cc-theme-on-surface-variant);
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

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 水印设置样式 */
.watermark-settings {
  border-top: 1px solid var(--cc-border-color);
  margin-top: 16px;
}

.watermark-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
}

.watermark-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
}

.expand-toggle {
  font-size: 12px;
  color: var(--cc-theme-primary);
  cursor: pointer;
}

.watermark-content {
  padding: 0 16px 16px;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.watermark-section {
  margin-bottom: 16px;
  border: 1px solid var(--cc-border-color);
  border-radius: 4px;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--cc-theme-surface-light);
  border-bottom: 1px solid var(--cc-border-color);
}

.section-title {
  font-size: 13px;
  font-weight: 500;
}

.section-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
}

.watermark-options {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.image-selector {
  display: flex;
  gap: 12px;
  align-items: center;
}

.image-preview {
  width: 80px;
  height: 45px;
  overflow: hidden;
  border-radius: 4px;
  border: 1px solid var(--cc-border-color);
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.color-picker {
  display: flex;
  gap: 16px;
  align-items: center;
}

.color-picker input[type="color"] {
  width: 40px;
  height: 36px;
  border: 1px solid var(--cc-border-color);
  border-radius: 4px;
  cursor: pointer;
}

.transparency-slider {
  flex: 1;
}

.range-with-value {
  display: flex;
  align-items: center;
  gap: 12px;
}

.range-with-value input[type="range"] {
  flex: 1;
}

/* 字体选择器样式 */
.font-selector {
  position: relative;
  width: 100%;
}

.font-selector-header {
  padding: 8px 12px;
  border: 1px solid var(--cc-border-color);
  border-radius: 4px;
  background: var(--cc-theme-surface-light);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.font-selector-dropdown {
  position: absolute;
  width: 100%;
  max-height: 300px;
  background: var(--cc-theme-surface);
  border: 1px solid var(--cc-border-color);
  border-radius: 4px;
  margin-top: 4px;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.font-search {
  padding: 8px;
  border-bottom: 1px solid var(--cc-border-color);
}

.font-search input {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--cc-border-color);
  border-radius: 4px;
}

.font-list {
  overflow-y: auto;
  max-height: 240px;
}

.font-item {
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.font-item:hover {
  background-color: var(--cc-theme-surface-hover);
}

.font-item.selected {
  background-color: var(--cc-theme-primary-light);
}

.font-preview-area {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid var(--cc-border-color);
  border-radius: 4px;
  background-color: var(--cc-theme-surface-light);
}

.preview-label {
  font-size: 12px;
  margin-bottom: 8px;
  color: var(--cc-theme-on-surface-variant);
}

.font-preview {
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 8px;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  word-break: break-word;
}

/* 水印布局样式 */
.watermark-layout {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.watermark-options-column {
  flex: 1;
  min-width: 300px;
}

.watermark-preview-column {
  flex: 1;
  min-width: 300px;
  display: flex;
  flex-direction: column;
}

.watermark-preview-section {
  height: 100%;
  border: 1px solid var(--cc-border-color);
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.preview-container {
  padding: 16px;
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.empty-preview {
  height: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--cc-theme-on-surface-variant);
  text-align: center;
  background: rgba(0, 0, 0, 0.05);
  width: 100%;
  border-radius: 4px;
  position: relative;
}

.empty-preview > div {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  padding: 0 10px;
}

.frame-preview {
  max-width: 100%;
  text-align: center;
}

.frame-preview img {
  max-width: 100%;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 添加错误信息样式 */
.preview-error {
  height: auto;
  min-height: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #721c24;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  padding: 16px;
  width: 100%;
  text-align: center;
}

.error-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.error-message {
  word-break: break-word;
  font-size: 13px;
}

.icon {
  display: inline-block;
  width: 20px;
  text-align: center;
}
</style> 