<template>
  <div class="batch-exporter-container">
    <div class="panel-header">
      <h2>批量全景视频导出</h2>
      <div class="panel-actions">
        <button class="action-btn refresh-btn" @click="refreshFileList">
          <i class="icon">🔄</i>
          刷新
        </button>
      </div>
    </div>

    <div class="panel-body">
      <!-- 源文件选择 -->
      <div class="section">
        <div class="section-header">
          <h3>源文件</h3>
          <div class="header-actions">
            <button class="action-btn" @click="showFileSelector">
              <i class="icon">📂</i>
              浏览文件
            </button>
            <button class="action-btn" @click="clearSelectedFiles">
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
                <button class="action-btn small" @click="removeFile(index)">
                  <i class="icon">❌</i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 导出设置 -->
      <div class="section">
        <div class="section-header">
          <h3>导出设置</h3>
          <div class="header-actions">
            <button class="action-btn" @click="addSettingProfile">
              <i class="icon">➕</i>
              添加配置
            </button>
          </div>
        </div>
        
        <div class="settings-profiles-container">
          <div v-for="(profile, profileIndex) in settingProfiles" :key="profileIndex" class="setting-profile">
            <div class="profile-header">
              <h4>配置 #{{ profileIndex + 1 }}</h4>
              <div class="profile-actions">
                <button 
                  v-if="settingProfiles.length > 1" 
                  class="action-btn small" 
                  @click="removeSettingProfile(profileIndex)">
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
            
            <!-- 添加水印设置 -->
            <div class="watermark-settings">
              <div class="watermark-header">
                <h4>水印设置</h4>
                <div class="expand-toggle" @click="toggleWatermarkExpand(profileIndex)">
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
                        
                        <!-- 新增字体选择功能 -->
                        <div class="setting-item">
                          <label>字体</label>
                          <div class="font-selector">
                            <div class="font-selector-header" @click="toggleFontSelector(profileIndex)">
                              <span :style="{fontFamily: profile.watermark.text.fontFamily}">
                                {{ profile.watermark.text.fontFamily }}
                              </span>
                              <i class="icon">{{ fontSelectorOpen[profileIndex] ? '🔼' : '🔽' }}</i>
                            </div>
                            <div class="font-selector-dropdown" v-if="fontSelectorOpen[profileIndex]">
                              <div class="font-search">
                                <input 
                                  type="text" 
                                  v-model="fontSearchQuery[profileIndex]" 
                                  placeholder="搜索字体..."
                                  @input="filterFonts(profileIndex)" 
                                />
                              </div>
                              <div class="font-list">
                                <div 
                                  v-for="font in filteredFonts[profileIndex]" 
                                  :key="font" 
                                  class="font-item"
                                  :class="{'selected': profile.watermark.text.fontFamily === font}"
                                  :style="{fontFamily: font}" 
                                  @click="selectFont(profileIndex, font)"
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
                            <input type="color" v-model="profile.watermark.text.colorHex" @input="updateTextWatermarkColor(profileIndex)" />
                            <div class="transparency-slider">
                              <input 
                                type="range" 
                                v-model="profile.watermark.text.opacity" 
                                min="0" 
                                max="1" 
                                step="0.1" 
                                @input="updateTextWatermarkColor(profileIndex)" 
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
                            <button class="action-btn" @click="selectWatermarkImage(profileIndex)">
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
                  <div class="watermark-preview-column" v-if="hasWatermarkEnabled(profile)">
                    <div class="watermark-preview-section">
                      <div class="section-header">
                        <div class="section-title">水印效果预览</div>
                        <div class="section-toggle">
                          <button class="action-btn small" @click="generateWatermarkPreview(profileIndex)" :disabled="!canGeneratePreview">
                            <i class="icon">🔄</i>
                            更新预览
                          </button>
                        </div>
                      </div>
                      
                      <div class="preview-container">
                        <div v-if="!profile.previewImage" class="empty-preview" :style="getPreviewContainerStyle(profile)">
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
        </div>
        
        <div class="setting-item">
          <label>输出目录</label>
          <div class="output-path-selector">
            <input type="text" v-model="outputDir" readonly placeholder="点击选择输出目录" />
            <button class="action-btn" @click="selectOutputDir">
              <i class="icon">📁</i>
              选择
            </button>
          </div>
        </div>

        <div class="setting-item">
          <div class="checkbox-wrapper">
            <input type="checkbox" id="createSubDirs" v-model="createSubDirs">
            <label for="createSubDirs">为每个文件创建子目录</label>
          </div>
        </div>
      </div>

      <!-- 批处理任务 -->
      <div class="section">
        <div class="section-header">
          <h3>批处理任务</h3>
          <div class="header-actions">
            <button class="action-btn primary" 
                    @click="startBatchExport" 
                    :disabled="!canStartExport || isExporting">
              <i class="icon">🚀</i>
              {{ isExporting ? '导出中...' : '开始批量导出' }}
            </button>
          </div>
        </div>
        
        <div class="tasks-container">
          <div v-if="tasks.length === 0" class="empty-tip">
            任务列表为空。设置导出选项后点击"开始批量导出"
          </div>
          <div v-else class="task-list">
            <div v-for="(task, index) in tasks" :key="index" class="task-item" :class="{'task-completed': task.status === 'completed', 'task-error': task.status === 'error'}">
              <div class="task-info">
                <div class="task-name">
                  <span class="file-name">{{ task.fileName }}</span>
                  <span v-if="task.profileIndex !== undefined" class="profile-badge">配置 #{{ task.profileIndex + 1 }}</span>
                </div>
                <div class="task-status">{{ getTaskStatusText(task) }}</div>
              </div>
              <div class="task-progress">
                <div class="progress-bar">
                  <div class="progress-fill" :style="{width: `${task.progress * 100}%`}"></div>
                </div>
                <div class="progress-details">
                  <div class="progress-value">{{ Math.round(task.progress * 100) }}%</div>
                  <div v-if="task.stage" class="stage-info">
                    {{ task.stage }} 
                    <span v-if="task.currentFrame && task.totalFrames">
                      ({{ task.currentFrame }}/{{ task.totalFrames }} 帧)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div v-if="isExporting" class="overall-progress">
          <div class="progress-info">
            <div>总体进度：{{ Math.round(overallProgress * 100) }}%</div>
            <div>已完成：{{ completedCount }}/{{ totalCount }}</div>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{width: `${overallProgress * 100}%`}"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, defineProps, reactive, watch } from 'vue';
import { PanoramaVideoGenerator, saveVideoBlob, captureFrame } from '../pannoViewer/panoramaToVideo.js';
import * as THREE from '../../../../static/three/three.mjs';
import { clientApi, plugin, kernelApi } from '../../../asyncModules.js'
import { addTextWatermark, addImageWatermark } from '../pannoViewer/watermarkUtils.js';

// 定义props，接收对话框传递的数据
const props = defineProps({
  sourceType: String,
  currentImage: Object,
  settings: Object
});

// 事件总线引用
let eventBus;

// 状态管理
const selectedFiles = ref([]);
const settingProfiles = ref([
  {
    resolution: '1080p',
    fps: 30,
    duration: 24,
    isLandscape: true,
    rotations: 1,
    smoothness: 0.8,
    // 添加水印设置
    watermarkExpanded: false,
    watermark: {
      text: {
        enabled: false,
        text: '全景视频',
        position: 'bottomRight',
        fontSize: 'medium', // small, medium, large
        colorHex: '#ffffff',
        opacity: 0.8,
        color: 'rgba(255, 255, 255, 0.8)',
        fontFamily: 'Arial' // 默认字体
      },
      image: {
        enabled: false,
        file: null,
        preview: null,
        position: 'bottomLeft',
        size: 0.15, // 占视频宽度百分比
        opacity: 0.8
      }
    },
    previewImage: null, // 存储预览图URL
    previewError: null  // 存储预览错误信息
  }
]);
const outputDir = ref('');
const createSubDirs = ref(true);

const tasks = ref([]);
const isExporting = ref(false);
const currentTaskIndex = ref(-1);

// 添加字体相关的状态
const availableFonts = ref([]);
const fontSelectorOpen = reactive({});
const fontSearchQuery = reactive({});
const filteredFonts = reactive({});

// 添加一个缓存对象用于存储预览器实例和纹理
const previewerCache = ref({});

// 获取系统字体
const loadSystemFonts = async () => {
  try {
    const fonts = await kernelApi.getSysFonts();
    availableFonts.value = Array.isArray(fonts) ? fonts : [];
    console.log('加载了系统字体:', availableFonts.value.length);
    
    // 初始化每个配置文件的过滤字体
    settingProfiles.value.forEach((_, index) => {
      filteredFonts[index] = [...availableFonts.value];
      fontSearchQuery[index] = '';
      fontSelectorOpen[index] = false;
    });
  } catch (error) {
    console.error('获取系统字体失败:', error);
    // 设置默认字体列表
    availableFonts.value = ['Arial', 'Verdana', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Tahoma', 'Trebuchet MS'];
    
    // 初始化每个配置文件的过滤字体
    settingProfiles.value.forEach((_, index) => {
      filteredFonts[index] = [...availableFonts.value];
      fontSearchQuery[index] = '';
      fontSelectorOpen[index] = false;
    });
  }
};

// 切换字体选择器
const toggleFontSelector = (profileIndex) => {
  fontSelectorOpen[profileIndex] = !fontSelectorOpen[profileIndex];
  
  // 点击外部关闭选择器
  if (fontSelectorOpen[profileIndex]) {
    setTimeout(() => {
      const clickListener = (e) => {
        const selector = document.querySelector(`.setting-profile:nth-child(${profileIndex + 1}) .font-selector`);
        if (selector && !selector.contains(e.target)) {
          fontSelectorOpen[profileIndex] = false;
          document.removeEventListener('click', clickListener);
        }
      };
      document.addEventListener('click', clickListener);
    }, 0);
  }
};

// 根据搜索词过滤字体
const filterFonts = (profileIndex) => {
  const query = fontSearchQuery[profileIndex].toLowerCase();
  if (!query) {
    filteredFonts[profileIndex] = [...availableFonts.value];
  } else {
    filteredFonts[profileIndex] = availableFonts.value.filter(
      font => font.toLowerCase().includes(query)
    );
  }
};

// 选择字体
const selectFont = (profileIndex, font) => {
  settingProfiles.value[profileIndex].watermark.text.fontFamily = font;
  fontSelectorOpen[profileIndex] = false;
};

// 获取预览用的字体大小
const getFontSizePreview = (size) => {
  switch (size) {
    case 'small': return '14px';
    case 'large': return '24px';
    case 'medium':
    default: return '18px';
  }
};

// 计算属性
const canStartExport = computed(() => {
  return selectedFiles.value.length > 0 && 
         outputDir.value && 
         !isExporting.value;
});

const overallProgress = computed(() => {
  if (tasks.value.length === 0) return 0;
  
  const totalProgress = tasks.value.reduce((sum, task) => sum + task.progress, 0);
  return totalProgress / tasks.value.length;
});

const completedCount = computed(() => {
  return tasks.value.filter(task => task.status === 'completed').length;
});

const totalCount = computed(() => {
  return tasks.value.length;
});

// 判断是否可以生成预览
const canGeneratePreview = computed(() => {
  return selectedFiles.value.length > 0;
});

// 判断是否有水印启用
const hasWatermarkEnabled = (profile) => {
  return profile.watermark.text.enabled || profile.watermark.image.enabled;
};

// 获取预览容器样式，确保宽高比正确
const getPreviewContainerStyle = (profile) => {
  if (profile.isLandscape) {
    // 横屏 16:9
    return { 
      width: '100%',
      paddingBottom: '56.25%', // 9/16 = 0.5625 = 56.25%
      position: 'relative',
      height: '0'
    };
  } else {
    // 竖屏 9:16
    return {
      width: '56.25%', // 相对于父容器的宽度
      paddingBottom: '100%', // 高度是宽度的16/9倍
      position: 'relative',
      height: '0',
      margin: '0 auto'
    };
  }
};

// 修改生成水印预览的方法，确保水印尺寸比例与导出时相同
const generateWatermarkPreview = async (profileIndex) => {
  if (!canGeneratePreview.value) return;
  
  const profile = settingProfiles.value[profileIndex];
  const selectedFile = selectedFiles.value[0]; // 使用第一个文件作为预览
  
  try {
    // 重置预览错误信息
    profile.previewError = null;
    
    // 加载图像
    const texture = await loadImageTexture(selectedFile);
    if (!texture) {
      showWarningMessage('无法加载图像进行预览');
      return;
    }
    
    // 根据方向调整预览尺寸，保持正确的宽高比
    let previewWidth, previewHeight;
    
    if (profile.isLandscape) {
      // 横屏模式 16:9
      previewWidth = 640;
      previewHeight = 360; // 16:9 比例
    } else {
      // 竖屏模式 9:16
      previewWidth = 360;
      previewHeight = 640; // 9:16 比例
    }
    
    // 计算预览与实际导出的缩放比例
    // 获取实际导出分辨率宽度
    let exportWidth;
    switch(profile.resolution) {
      case '4k':
        exportWidth = profile.isLandscape ? 3840 : 2160;
        break;
      case '2k':
        exportWidth = profile.isLandscape ? 2560 : 1440;
        break;
      default: // 1080p
        exportWidth = profile.isLandscape ? 1920 : 1080;
    }
    
    // 计算缩放比例 (预览宽度/导出宽度)
    const scaleRatio = previewWidth / exportWidth;
    
    // 创建一个临时的Canvas元素用于渲染
    const canvas = document.createElement('canvas');
    canvas.width = previewWidth;
    canvas.height = previewHeight;
    const ctx = canvas.getContext('2d');
    
    // 创建一个临时的渲染容器
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    document.body.appendChild(container);
    
    // 创建一个新的PanoramaVideoGenerator实例
    const generator = new PanoramaVideoGenerator(previewWidth, previewHeight);
    
    // 使用try-finally确保资源清理
    try {
      // 设置场景
      await generator.setupScene(texture);
      
      // 预处理水印选项 - 确保与导出时的水印比例一致
      if (profile.watermark.text.enabled) {
        // 计算与导出相同比例的字体大小
        let fontSize;
        switch (profile.watermark.text.fontSize) {
          case 'small':
            fontSize = Math.max(16 * scaleRatio, exportWidth / 60 * scaleRatio);
            break;
          case 'large':
            fontSize = Math.max(32 * scaleRatio, exportWidth / 30 * scaleRatio);
            break;
          case 'medium':
          default:
            fontSize = Math.max(24 * scaleRatio, exportWidth / 45 * scaleRatio);
        }
        
        // 设置文字水印
        generator.setTextWatermark({
          enabled: true,
          text: profile.watermark.text.text || '全景视频',
          position: profile.watermark.text.position,
          font: `${Math.round(fontSize)}px ${profile.watermark.text.fontFamily}`,
          color: profile.watermark.text.color
        });
        
        console.log('预览文字水印大小:', Math.round(fontSize), 'px（按实际导出', Math.round(fontSize/scaleRatio), 'px比例缩放）');
      }
      
      // 处理图片水印 - 应用相同的缩放比例
      if (profile.watermark.image.enabled && profile.watermark.image.preview) {
        await generator.setImageWatermark({
          imageUrl: profile.watermark.image.preview,
          position: profile.watermark.image.position,
          width: profile.watermark.image.size, // 水印宽度使用百分比表示，不需要缩放
          opacity: profile.watermark.image.opacity
        });
      }
      
      // 渲染一帧
      // 创建渲染器并添加到DOM
      generator.renderer.domElement.style.width = `${previewWidth}px`;
      generator.renderer.domElement.style.height = `${previewHeight}px`;
      container.appendChild(generator.renderer.domElement);
      
      // 设置相机位置
      generator.camera.position.set(0, 0, 0);
      generator.camera.rotation.set(0, 0, 0);
      generator.camera.rotateY(THREE.MathUtils.degToRad(0)); // 初始经度
      generator.camera.rotateX(THREE.MathUtils.degToRad(0)); // 初始纬度
      
      // 尝试使用captureFrame渲染
      try {
        const frameData = await captureFrame(
          generator.renderer,
          generator.scene,
          generator.camera,
          previewWidth, 
          previewHeight,
          true,
          {
            text: generator.watermarkOptions.text,
            image: generator.watermarkOptions.image
          }
        );
        
        // 复制渲染结果到我们的Canvas
        if (frameData && frameData.imageData) {
          ctx.drawImage(frameData.imageData, 0, 0);
        } else {
          // 如果captureFrame不可用，直接从renderer获取图像
          generator.renderer.render(generator.scene, generator.camera);
          ctx.drawImage(generator.renderer.domElement, 0, 0);
          
          // 手动添加水印
          if (profile.watermark.text.enabled) {
            addWatermarkToCanvas(canvas, profile, exportWidth, scaleRatio);
          }
        }
      } catch (error) {
        console.error('捕获帧失败，使用备用方法:', error);
        
        // 备用方法：直接渲染场景
        generator.renderer.render(generator.scene, generator.camera);
        ctx.drawImage(generator.renderer.domElement, 0, 0);
        
        // 手动添加水印
        if (profile.watermark.text.enabled) {
          addWatermarkToCanvas(canvas, profile, exportWidth, scaleRatio);
        }
      }
      
      // 将Canvas转换为数据URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      profile.previewImage = dataUrl;
    } catch (error) {
      console.error('渲染预览失败:', error);
      profile.previewError = error.message;
      showWarningMessage(`生成预览失败: ${error.message}`);
    } finally {
      // 清理资源
      try {
        if (generator.renderer) {
          if (generator.renderer.domElement && generator.renderer.domElement.parentNode) {
            generator.renderer.domElement.parentNode.removeChild(generator.renderer.domElement);
          }
          generator.renderer.dispose();
        }
        if (container && container.parentNode) {
          container.parentNode.removeChild(container);
        }
      } catch (cleanupError) {
        console.warn('清理预览资源时出错:', cleanupError);
      }
    }
  } catch (error) {
    console.error('生成预览总体失败:', error);
    profile.previewError = error.message;
    showWarningMessage(`生成预览失败: ${error.message}`);
  }
};

// 修改手动添加水印的方法，应用正确的缩放比例
const addWatermarkToCanvas = (canvas, profile, exportWidth, scaleRatio) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const { text, position, fontFamily, fontSize, color } = profile.watermark.text;
  
  // 计算与导出时相同比例的字体大小
  let fontSizePixels;
  switch (fontSize) {
    case 'small':
      fontSizePixels = Math.max(16 * scaleRatio, exportWidth / 60 * scaleRatio);
      break;
    case 'large':
      fontSizePixels = Math.max(32 * scaleRatio, exportWidth / 30 * scaleRatio);
      break;
    case 'medium':
    default:
      fontSizePixels = Math.max(24 * scaleRatio, exportWidth / 45 * scaleRatio);
  }
  
  // 设置样式
  ctx.font = `${Math.round(fontSizePixels)}px ${fontFamily}`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  
  // 测量文本尺寸
  const metrics = ctx.measureText(text || '全景视频');
  const textWidth = metrics.width;
  const textHeight = fontSizePixels;
  
  // 计算内边距 - 也应用相同的缩放比例
  const padding = Math.max(10 * scaleRatio, exportWidth / 100 * scaleRatio);
  
  // 根据位置计算坐标
  let x, y;
  switch(position) {
    case 'topLeft':
      x = padding;
      y = padding + textHeight / 2;
      break;
    case 'topRight':
      x = canvas.width - textWidth - padding;
      y = padding + textHeight / 2;
      break;
    case 'bottomLeft':
      x = padding;
      y = canvas.height - padding - textHeight / 2;
      break;
    case 'bottomRight':
      x = canvas.width - textWidth - padding;
      y = canvas.height - padding - textHeight / 2;
      break;
    case 'center':
      x = (canvas.width - textWidth) / 2;
      y = canvas.height / 2;
      break;
    default:
      x = padding;
      y = canvas.height - padding - textHeight / 2;
  }
  
  // 绘制文字
  ctx.fillText(text || '全景视频', x, y);
};

// 监听水印设置变化，自动更新预览 - 优化防抖
const updatePreviewDebounced = debounce((profileIndex) => {
  if (canGeneratePreview.value) {
    console.log('水印设置已更改，更新预览');
    generateWatermarkPreview(profileIndex);
  }
}, 300); // 300ms防抖延迟

// 添加防抖函数
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

watch(
  () => settingProfiles.value.map(profile => ({
    textEnabled: profile.watermark.text.enabled,
    text: profile.watermark.text.text,
    textPosition: profile.watermark.text.position,
    fontSize: profile.watermark.text.fontSize,
    fontFamily: profile.watermark.text.fontFamily,
    color: profile.watermark.text.color,
    imageEnabled: profile.watermark.image.enabled,
    imagePosition: profile.watermark.image.position,
    imageSize: profile.watermark.image.size,
    imageOpacity: profile.watermark.image.opacity,
    isLandscape: profile.isLandscape
  })),
  (newVal, oldVal) => {
    // 找出哪个配置发生了变化
    for (let i = 0; i < newVal.length; i++) {
      if (oldVal && oldVal[i] && JSON.stringify(newVal[i]) !== JSON.stringify(oldVal[i])) {
        // 使用防抖函数更新预览
        updatePreviewDebounced(i);
        break;
      }
    }
  },
  { deep: true }
);

// 从文件加载纹理
const loadImageTexture = async (fileInfo) => {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      
      img.onload = () => {
        const texture = new THREE.Texture(img);
        texture.needsUpdate = true;
        resolve(texture);
      };
      
      img.onerror = () => {
        reject(new Error('无法加载图像'));
      };
      
      // 根据文件信息设置图像源
      if (fileInfo.file) {
        const objectUrl = URL.createObjectURL(fileInfo.file);
        img.src = objectUrl;
      } else if (fileInfo.path) {
        img.src = fileInfo.path;
      } else {
        reject(new Error('无效的文件信息'));
      }
    } catch (error) {
      reject(error);
    }
  });
};

// 文件列表变化时执行部分清理
watch(selectedFiles, () => {
  // 当文件列表变化时，清理预览缓存
  Object.values(previewerCache.value).forEach(item => {
    if (item.previewer && item.previewer.dispose) {
      item.previewer.dispose();
    }
  });
  previewerCache.value = {};
  
  // 清除所有预览图
  settingProfiles.value.forEach(profile => {
    profile.previewImage = null;
  });
}, { deep: true });

// 注册事件监听器和数据接收
const setupEventListeners = () => {
  // 对话框模式：检查组件的data属性
  if (props && props.sourceType) {
    console.log('对话框模式：从props获取数据');
    handleReceivedData(props);
    return;
  }
  
  // Tab模式：从Tab属性获取数据
  if (window.siyuan && window.siyuan.menus) {
    // 获取当前Tab ID
    const tabID = plugin.name + 'batchPanoramaExporterTab';
    
    // 从当前Tab数据中获取传入的数据
    const tab = document.querySelector(`[data-id="${tabID}"]`);
    if (tab) {
      const tabModel = tab.getAttribute('data-model');
      if (tabModel) {
        try {
          // 尝试解析数据
          const tabData = JSON.parse(tabModel);
          if (tabData && tabData.data) {
            handleReceivedData(tabData.data);
          }
        } catch (error) {
          console.error('解析Tab数据失败:', error);
        }
      }
    }
  }
};

// 处理接收到的数据
const handleReceivedData = async (data) => {
  if (!data) return;
  
  console.log('批量导出器收到数据:', data);
  
  // 如果从全景预览器传来了当前图像，添加到文件列表
  if (data.sourceType === 'panorama' && data.currentImage?.path) {
    try {
      // 加载图像并生成缩略图
      const thumbnail = await generateThumbnailFromPath(data.currentImage.path);
      
      // 检查当前文件列表中是否已有此文件
      const exists = selectedFiles.value.some(file => file.path === data.currentImage.path);
      
      if (!exists) {
        // 添加到选择的文件列表
        selectedFiles.value.push({
          name: data.currentImage.name || '全景图',
          path: data.currentImage.path,
          thumbnail
        });

        // 如果传入了默认设置，更新设置
        if (data.settings?.defaultSettings) {
          const defaultSettings = data.settings.defaultSettings;
          if (settingProfiles.value.length > 0) {
            const profile = settingProfiles.value[0];
            
            // 更新设置，仅更新提供的值
            if (defaultSettings.isLandscape !== undefined) {
              profile.isLandscape = defaultSettings.isLandscape;
            }
            if (defaultSettings.duration !== undefined) {
              profile.duration = defaultSettings.duration;
            }
            if (defaultSettings.fps !== undefined) {
              profile.fps = defaultSettings.fps;
            }
          }
        }
      }
    } catch (error) {
      console.error('处理接收到的图像失败:', error);
      showWarningMessage(`添加图像失败: ${error.message}`);
    }
  }
};

// 从文件路径生成缩略图
const generateThumbnailFromPath = async (path) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 160;
      canvas.height = 90;
      
      // 计算裁剪区域以保持比例
      let sourceWidth = img.width;
      let sourceHeight = img.height;
      let sourceX = 0;
      let sourceY = 0;
      
      if (img.width / img.height > 16 / 9) {
        sourceWidth = img.height * (16 / 9);
        sourceX = (img.width - sourceWidth) / 2;
      } else {
        sourceHeight = img.width * (9 / 16);
        sourceY = (img.height - sourceHeight) / 2;
      }
      
      ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, 160, 90);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    
    img.onerror = () => {
      reject(new Error('生成缩略图失败'));
    };
    
    img.src = path;
  });
};

// 清理事件监听器
const cleanupEventListeners = () => {
  // 由于不再使用事件总线，这里可以清空
};

// 方法
const refreshFileList = () => {
  // 重新加载已选文件的缩略图和信息
  selectedFiles.value.forEach(async (file, index) => {
    try {
      if (file.file) {
        // 如果是File对象，重新生成缩略图
        const objectUrl = URL.createObjectURL(file.file);
        const thumbnail = await generateThumbnailFromUrl(objectUrl);
        selectedFiles.value[index].thumbnail = thumbnail;
      } else if (file.path) {
        // 如果是文件路径，尝试重新加载
        try {
          const thumbnail = await generateThumbnailFromPath(file.path);
          selectedFiles.value[index].thumbnail = thumbnail;
        } catch (error) {
          console.error('刷新文件路径缩略图失败:', error);
        }
      }
    } catch (error) {
      console.error('刷新缩略图失败:', error);
    }
  });
};

const showFileSelector = async () => {
  try {
    // 清空之前的文件列表
    clearSelectedFiles();
    
    // 使用浏览器原生的文件选择对话框
    return new Promise((resolve, reject) => {
      // 创建一个临时的file input元素
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.multiple = true;
      fileInput.accept = '.jpg,.jpeg,.png';
      
      // 处理文件选择事件
      fileInput.onchange = async (event) => {
        const files = Array.from(event.target.files);
        
        if (files && files.length > 0) {
          try {
            // 处理选择的文件
            for (const file of files) {
              // 创建本地URL用于预览
              const objectUrl = URL.createObjectURL(file);
              
              // 生成缩略图
              const thumbnail = await generateThumbnailFromUrl(objectUrl);
              
              // 添加到选择的文件列表
              selectedFiles.value.push({
                name: file.name,
                path: objectUrl, // 使用对象URL作为路径
                file: file, // 保存原始文件对象以便后续处理
                thumbnail
              });
            }
            resolve(files);
          } catch (error) {
            reject(error);
          }
        } else {
          resolve([]);
        }
      };
      
      // 触发文件选择对话框
      fileInput.click();
    });
  } catch (error) {
    console.error('选择文件失败:', error);
  }
};

// 展开/收起水印设置
const toggleWatermarkExpand = (profileIndex) => {
  settingProfiles.value[profileIndex].watermarkExpanded = !settingProfiles.value[profileIndex].watermarkExpanded;
};

// 添加配置文件
const addSettingProfile = () => {
  const newProfile = JSON.parse(JSON.stringify(settingProfiles.value[0]));
  newProfile.watermarkExpanded = false;
  newProfile.previewImage = null;
  settingProfiles.value.push(newProfile);
  
  // 为新配置初始化字体过滤
  const newIndex = settingProfiles.value.length - 1;
  filteredFonts[newIndex] = [...availableFonts.value];
  fontSearchQuery[newIndex] = '';
  fontSelectorOpen[newIndex] = false;
};

// 移除配置文件
const removeSettingProfile = (index) => {
  if (settingProfiles.value.length > 1) {
    settingProfiles.value.splice(index, 1);
  }
};

// 从URL生成缩略图
const generateThumbnailFromUrl = async (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    // 设置处理函数
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 160;
      canvas.height = 90;
      
      // 计算裁剪区域以保持比例
      let sourceWidth = img.width;
      let sourceHeight = img.height;
      let sourceX = 0;
      let sourceY = 0;
      
      if (img.width / img.height > 16 / 9) {
        sourceWidth = img.height * (16 / 9);
        sourceX = (img.width - sourceWidth) / 2;
      } else {
        sourceHeight = img.width * (9 / 16);
        sourceY = (img.height - sourceHeight) / 2;
      }
      
      ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, 160, 90);
      const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
      
      // 释放对象URL
      URL.revokeObjectURL(url);
      resolve(thumbnail);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url); // 释放对象URL，即使加载失败
      reject(new Error('生成缩略图失败'));
    };
    
    // 开始加载图像
    img.src = url;
  });
};

// 添加一个提示信息组件
const showWarningMessage = (message) => {
  // 创建提示框
  const warningBox = document.createElement('div');
  warningBox.style.position = 'fixed';
  warningBox.style.top = '20px';
  warningBox.style.left = '50%';
  warningBox.style.transform = 'translateX(-50%)';
  warningBox.style.padding = '15px 20px';
  warningBox.style.backgroundColor = '#fff3cd';
  warningBox.style.color = '#856404';
  warningBox.style.borderRadius = '4px';
  warningBox.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
  warningBox.style.zIndex = '9999';
  warningBox.style.maxWidth = '80%';
  warningBox.style.textAlign = 'center';
  warningBox.textContent = message;
  
  // 添加到文档中
  document.body.appendChild(warningBox);
  
  // 3秒后自动移除
  setTimeout(() => {
    document.body.removeChild(warningBox);
  }, 5000);
};

const removeFile = (index) => {
  selectedFiles.value.splice(index, 1);
};

const clearSelectedFiles = () => {
  selectedFiles.value = [];
};

const selectOutputDir = async () => {
  try {
    // 增强Electron环境检测
    const isElectronEnv = !!(window.electron || 
                           (window.require && window.require('electron')) || 
                           window.process?.versions?.electron);
    
    if (isElectronEnv) {
      // 确保获取electron对象
      const electron = window.electron || 
                      (window.require ? window.require('electron') : null);
      
      if (electron) {
        console.log('使用Electron API选择目录');
        // 使用Electron的对话框API
        try {
          const dialog = window.require('@electron/remote').dialog;
          const result = await dialog.showOpenDialog({
            properties: ['openDirectory'],
            title: '选择输出目录'
          });
          
          if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
            outputDir.value = result.filePaths[0];
            console.log('已选择目录:', outputDir.value);
          }
          return;
        } catch (electronErr) {
          console.error('Electron对话框错误:', electronErr);
          // 如果Electron方法失败，回退到手动输入
        }
      }
    }
    
    // 回退到手动输入方式
    console.log('使用手动输入方式');
    // 创建一个输入框
    const input = document.createElement('input');
    input.type = 'text';
    input.value = outputDir.value || '全景视频导出';
    input.style.position = 'fixed';
    input.style.left = '50%';
    input.style.top = '50%';
    input.style.transform = 'translate(-50%, -50%)';
    input.style.zIndex = '9999';
    input.style.padding = '10px';
    input.style.border = '1px solid #ccc';
    
    // 创建一个按钮
    const button = document.createElement('button');
    button.textContent = '确定';
    button.style.marginLeft = '10px';
    button.style.padding = '10px';
    
    // 创建一个容器
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.backgroundColor = 'rgba(0,0,0,0.5)';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.zIndex = '9998';
    
    const inputContainer = document.createElement('div');
    inputContainer.style.backgroundColor = 'white';
    inputContainer.style.padding = '20px';
    inputContainer.style.borderRadius = '5px';
    inputContainer.style.display = 'flex';
    inputContainer.style.flexDirection = 'column';
    inputContainer.style.gap = '10px';
    
    const label = document.createElement('div');
    label.textContent = '请输入输出目录名称:';
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.appendChild(button);
    
    inputContainer.appendChild(label);
    inputContainer.appendChild(input);
    inputContainer.appendChild(buttonContainer);
    container.appendChild(inputContainer);
    
    document.body.appendChild(container);
    
    // 聚焦到输入框
    input.focus();
    
    return new Promise((resolve) => {
      // 点击确定按钮时
      button.onclick = () => {
        const value = input.value.trim();
        if (value) {
          outputDir.value = value;
        }
        document.body.removeChild(container);
        resolve();
      };
      
      // 点击背景时关闭
      container.onclick = (e) => {
        if (e.target === container) {
          document.body.removeChild(container);
          resolve();
        }
      };
      
      // 按ESC键关闭
      window.addEventListener('keydown', function handler(e) {
        if (e.key === 'Escape') {
          document.body.removeChild(container);
          window.removeEventListener('keydown', handler);
          resolve();
        }
        if (e.key === 'Enter') {
          button.click();
          window.removeEventListener('keydown', handler);
        }
      });
    });
  } catch (error) {
    console.error('选择输出目录失败:', error);
    showWarningMessage(`选择输出目录失败: ${error.message}`);
  }
};

const startBatchExport = async () => {
  if (!canStartExport.value) return;
  
  // 检查是否有文件对象
  const hasFileObjects = selectedFiles.value.every(file => file.file instanceof File);
  if (!hasFileObjects) {
    showWarningMessage('请使用"浏览文件"按钮重新选择文件，因为当前选择的文件无法在浏览器环境中直接访问。');
    // 清空当前选择的文件
    clearSelectedFiles();
    return;
  }
  
  isExporting.value = true;
  currentTaskIndex.value = -1;
  
  // 创建任务列表 - 为每个文件和每个配置创建任务
  tasks.value = [];
  
  for (const file of selectedFiles.value) {
    for (let profileIndex = 0; profileIndex < settingProfiles.value.length; profileIndex++) {
      tasks.value.push({
        fileName: file.name,
        filePath: file.path,
        file: file.file,
        profileIndex: profileIndex,
        profile: settingProfiles.value[profileIndex],
        outputPath: '',
        progress: 0,
        status: 'pending',
        stage: '',
        currentFrame: 0,
        totalFrames: 0
      });
    }
  }
  
  // 开始处理任务
  processNextTask();
};

const processNextTask = async () => {
  currentTaskIndex.value++;
  
  if (currentTaskIndex.value >= tasks.value.length) {
    // 所有任务完成
    isExporting.value = false;
    return;
  }
  
  const currentTask = tasks.value[currentTaskIndex.value];
  currentTask.status = 'processing';
  currentTask.stage = '准备中';
  
  try {
    // 获取当前任务的配置
    const profile = currentTask.profile;
    
    // 获取分辨率
    let width, height;
    switch(profile.resolution) {
      case '4k':
        width = profile.isLandscape ? 3840 : 2160;
        height = profile.isLandscape ? 2160 : 3840;
        break;
      case '2k':
        width = profile.isLandscape ? 2560 : 1440;
        height = profile.isLandscape ? 1440 : 2560;
        break;
      default: // 1080p
        width = profile.isLandscape ? 1920 : 1080;
        height = profile.isLandscape ? 1080 : 1920;
    }
    
    // 创建文件名
    const baseName = currentTask.fileName.substring(0, currentTask.fileName.lastIndexOf('.')) || currentTask.fileName;
    // 配置后缀，如果有多个配置则添加配置编号
    const configSuffix = settingProfiles.value.length > 1 ? `_配置${currentTask.profileIndex + 1}` : '';
    const outputFileName = `${baseName}${configSuffix}_${width}x${height}_${profile.duration}s.mp4`;
    
    // 确定输出目录和文件名
    let folderName = createSubDirs.value ? baseName : '';
    currentTask.outputPath = folderName ? `${folderName}/${outputFileName}` : outputFileName;
    
    currentTask.stage = '加载图像';
    
    // 从File对象创建纹理
    const texture = await new Promise((resolve, reject) => {
      // 创建一个图像对象
      const img = new Image();
      
      // 从File对象创建URL
      const objectUrl = URL.createObjectURL(currentTask.file);
      
      // 设置处理函数
      img.onload = () => {
        // 创建Three.js纹理
        const texture = new THREE.Texture(img);
        texture.needsUpdate = true;
        URL.revokeObjectURL(objectUrl); // 释放对象URL
        resolve(texture);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl); // 释放对象URL，即使加载失败
        reject(new Error(`无法加载图片: ${currentTask.fileName}`));
      };
      
      // 开始加载图像
      img.src = objectUrl;
    });
    
    currentTask.stage = '设置场景';
    
    // 创建视频生成器
    const generator = new PanoramaVideoGenerator(width, height);
    await generator.setupScene(texture);
    
    // 处理水印
    const watermarkOptions = prepareWatermarkOptions(profile, width);
    
    // 如果有图片水印，加载图片
    if (watermarkOptions.image && watermarkOptions.image.enabled && profile.watermark.image.file) {
      try {
        await generator.setImageWatermark({
          imageUrl: profile.watermark.image.preview,
          position: watermarkOptions.image.position,
          width: watermarkOptions.image.width,
          opacity: watermarkOptions.image.opacity
        });
      } catch (error) {
        console.error('设置图片水印失败:', error);
        // 继续处理，即使设置图片水印失败
      }
    }
    
    // 设置文字水印
    if (watermarkOptions.text && watermarkOptions.text.enabled) {
      generator.setTextWatermark(watermarkOptions.text);
    }
    
    // 设置进度回调
    generator.setProgressCallback(({ progress, currentFrame, totalFrames, stage }) => {
      currentTask.progress = progress;
      currentTask.stage = stage || '渲染中';
      currentTask.currentFrame = currentFrame;
      currentTask.totalFrames = totalFrames;
      // 动态更新任务状态
      tasks.value = [...tasks.value];
    });
    
    currentTask.stage = '开始录制';
    
    // 开始录制
    const videoBlob = await generator.startRecording({
      duration: profile.duration,
      fps: profile.fps,
      startLon: 0,
      endLon: 360 * profile.rotations,
      startLat: 0,
      endLat: 0,
      width,
      height,
      smoothness: profile.smoothness,
      rotations: profile.rotations,
      watermarkOptions
    });
    
    currentTask.stage = '保存视频';
    
    // 使用浏览器的下载API保存视频
    const url = URL.createObjectURL(videoBlob);
    
    // 创建下载链接
    const a = document.createElement('a');
    a.href = url;
    a.download = currentTask.outputPath; // 使用之前构建的路径作为文件名
    document.body.appendChild(a);
    a.click();
    
    // 清理
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    
    // 更新任务状态
    currentTask.status = 'completed';
    currentTask.progress = 1;
    currentTask.stage = '已完成';
    tasks.value = [...tasks.value];
    
    // 处理下一个任务
    processNextTask();
  } catch (error) {
    console.error('处理任务失败:', error);
    currentTask.status = 'error';
    currentTask.error = error.message;
    currentTask.stage = '出错';
    tasks.value = [...tasks.value];
    
    // 继续处理下一个任务
    processNextTask();
  }
};

// 准备水印选项
const prepareWatermarkOptions = (profile, videoWidth) => {
  const options = {
    text: null,
    image: null
  };
  
  // 处理文字水印
  if (profile.watermark.text.enabled) {
    // 根据选择的字体大小，计算实际像素值
    let fontSize;
    switch (profile.watermark.text.fontSize) {
      case 'small':
        fontSize = Math.max(16, videoWidth / 60);
        break;
      case 'large':
        fontSize = Math.max(32, videoWidth / 30);
        break;
      case 'medium':
      default:
        fontSize = Math.max(24, videoWidth / 45);
    }
    
    options.text = {
      enabled: true,
      text: profile.watermark.text.text,
      position: profile.watermark.text.position,
      font: `${Math.round(fontSize)}px ${profile.watermark.text.fontFamily}`,
      color: profile.watermark.text.color
    };
  }
  
  // 处理图片水印
  if (profile.watermark.image.enabled && profile.watermark.image.preview) {
    options.image = {
      enabled: true,
      position: profile.watermark.image.position,
      width: profile.watermark.image.size, // 使用百分比表示的尺寸
      opacity: profile.watermark.image.opacity
    };
  }
  
  return options;
};

// 更新文字水印颜色 (结合颜色选择器和透明度滑块)
const updateTextWatermarkColor = (profileIndex) => {
  const profile = settingProfiles.value[profileIndex];
  const hex = profile.watermark.text.colorHex;
  const opacity = profile.watermark.text.opacity;
  
  // 将十六进制颜色转换为RGB
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  // 生成rgba颜色字符串
  profile.watermark.text.color = `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// 选择水印图片
const selectWatermarkImage = (profileIndex) => {
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
      settingProfiles.value[profileIndex].watermark.image.file = file;
      settingProfiles.value[profileIndex].watermark.image.preview = preview;
    }
  };
  
  // 触发文件选择
  fileInput.click();
};

const getTaskStatusText = (task) => {
  switch (task.status) {
    case 'pending':
      return '等待中';
    case 'processing':
      if (task.stage) {
        return `${task.stage}...`;
      }
      return '处理中...';
    case 'completed':
      return '已完成';
    case 'error':
      return `错误: ${task.error || '未知错误'}`;
    default:
      return '未知状态';
  }
};

onMounted(() => {
  console.log('批量导出器组件已挂载');
  
  // 扩展 PanoramaVideoGenerator
  if (PanoramaVideoGenerator.prototype) {
    // 扩展渲染单帧的方法
    PanoramaVideoGenerator.prototype.renderFrame = async function(options) {
      const { lon, lat, width, height } = options;
      
      // 设置相机位置
      this.camera.position.set(0, 0, 0);
      this.camera.rotation.set(0, 0, 0);
      
      // 旋转相机到指定经纬度
      this.camera.rotateY(THREE.MathUtils.degToRad(lon));
      this.camera.rotateX(THREE.MathUtils.degToRad(lat));
      
      // 创建渲染器并确保抗锯齿和透明度支持
      if (!this.renderer) {
        this.renderer = new THREE.WebGLRenderer({ 
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true
        });
        this.renderer.setSize(width || this.width, height || this.height);
        this.renderer.setClearColor(0x000000, 0);
      }
      
      // 确保水印层在场景中并可见
      if (this.watermarkText) {
        this.watermarkText.visible = true;
        this.watermarkText.renderOrder = 999;
        if (!this.scene.getObjectById(this.watermarkText.id)) {
          this.scene.add(this.watermarkText);
        }
      }
      
      if (this.watermarkImage) {
        this.watermarkImage.visible = true;
        this.watermarkImage.renderOrder = 999;
        if (!this.scene.getObjectById(this.watermarkImage.id)) {
          this.scene.add(this.watermarkImage);
        }
      }
      
      // 渲染场景
      this.renderer.render(this.scene, this.camera);
      
      // 返回Canvas元素
      return this.renderer.domElement;
    };
    
    // 检查并扩展设置文字水印的方法
    if (PanoramaVideoGenerator.prototype.setTextWatermark) {
      const originalSetTextWatermark = PanoramaVideoGenerator.prototype.setTextWatermark;
      PanoramaVideoGenerator.prototype.setTextWatermark = function(options) {
        console.log('增强的setTextWatermark被调用', options);
        // 调用原始方法
        const result = originalSetTextWatermark.call(this, options);
        
        // 确保文字水印是可见的
        if (this.watermarkText) {
          this.watermarkText.visible = true;
          this.watermarkText.renderOrder = 999;
          console.log('文字水印已设置为可见');
        } else {
          console.warn('文字水印未创建');
        }
        
        return result;
      };
    }
    
    // 添加资源释放方法
    if (!PanoramaVideoGenerator.prototype.dispose) {
      PanoramaVideoGenerator.prototype.dispose = function() {
        if (this.renderer) {
          this.renderer.dispose();
          this.renderer = null;
        }
        
        // 清理场景中的对象
        if (this.scene) {
          while(this.scene.children.length > 0) { 
            this.scene.remove(this.scene.children[0]); 
          }
        }
        
        // 清理纹理
        if (this.panoramaTexture) {
          this.panoramaTexture.dispose();
          this.panoramaTexture = null;
        }
        
        this.camera = null;
        this.scene = null;
        this.watermarkText = null;
        this.watermarkImage = null;
      };
    }
  }
  
  // 加载系统字体
  loadSystemFonts();
  
  // 设置事件监听器
  setupEventListeners();
});

onUnmounted(() => {
  // 清理预览器缓存
  Object.values(previewerCache.value).forEach(item => {
    if (item.previewer && item.previewer.dispose) {
      item.previewer.dispose();
    }
  });
  previewerCache.value = {};
  
  // 清理事件监听器
  cleanupEventListeners();
});
</script>

<style scoped>
.batch-exporter-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--cc-theme-background);
  color: var(--cc-theme-on-background);
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid var(--cc-border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section {
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

.header-actions, .panel-actions {
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

.action-btn.primary {
  background: var(--cc-theme-primary);
  color: white;
  border-color: var(--cc-theme-primary);
}

.action-btn.primary:hover {
  background: var(--cc-theme-primary-hover);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.settings-profiles-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.setting-profile {
  border: 1px solid var(--cc-border-color);
  border-radius: 4px;
  overflow: hidden;
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

.output-path-selector {
  display: flex;
  gap: 8px;
}

.output-path-selector input {
  flex: 1;
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.range-value {
  text-align: center;
  font-size: 12px;
  color: var(--cc-theme-on-surface-variant);
}

.tasks-container {
  padding: 16px;
  max-height: 300px;
  overflow-y: auto;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-item {
  padding: 12px;
  border-radius: 4px;
  background: var(--cc-theme-surface-light);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-item.task-completed {
  border-left: 3px solid var(--cc-theme-success);
}

.task-item.task-error {
  border-left: 3px solid var(--cc-theme-error);
}

.task-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-name {
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}

.profile-badge {
  font-size: 12px;
  padding: 2px 6px;
  background-color: var(--cc-theme-secondary);
  color: white;
  border-radius: 10px;
}

.task-status {
  font-size: 12px;
  color: var(--cc-theme-on-surface-variant);
}

.progress-bar {
  height: 8px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: var(--cc-theme-primary);
  border-radius: 4px;
  transition: width 0.3s linear;
}

.task-progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-details {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.progress-value {
  font-weight: 500;
}

.stage-info {
  color: var(--cc-theme-on-surface-variant);
}

.overall-progress {
  padding: 16px;
  border-top: 1px solid var(--cc-border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.icon {
  display: inline-block;
  width: 20px;
  text-align: center;
}

.refresh-btn {
  padding: 4px 8px;
}

/* 添加水印设置样式 */
.watermark-settings {
  border-top: 1px solid var(--cc-border-color);
  margin-top: 16px;
  padding-top: 8px;
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

/* 响应式调整 */
@media (max-width: 768px) {
  .watermark-layout {
    flex-direction: column;
  }
  
  .watermark-preview-column,
  .watermark-options-column {
    width: 100%;
  }
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
</style> 