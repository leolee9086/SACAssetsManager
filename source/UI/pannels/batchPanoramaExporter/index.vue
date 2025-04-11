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
import { ref, computed, onMounted, onUnmounted, defineProps } from 'vue';
import { PanoramaVideoGenerator, saveVideoBlob } from '../pannoViewer/panoramaToVideo.js';
import * as THREE from '../../../../static/three/three.mjs';
import { clientApi, plugin } from '../../../asyncModules.js'

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
    smoothness: 0.8
  }
]);
const outputDir = ref('');
const createSubDirs = ref(true);

const tasks = ref([]);
const isExporting = ref(false);
const currentTaskIndex = ref(-1);

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

// 添加配置文件
const addSettingProfile = () => {
  // 复制第一个配置作为模板
  const newProfile = { ...settingProfiles.value[0] };
  settingProfiles.value.push(newProfile);
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
    // 判断是否在Electron环境中
    if (window.electron) {
      // 使用Electron的对话框API
      const result = await window.electron.showOpenDialog({
        properties: ['openDirectory'],
        title: '选择输出目录'
      });
      
      if (result && !result.canceled && result.filePaths.length > 0) {
        outputDir.value = result.filePaths[0];
      }
    } else if (window.showDirectoryPicker) {
      // 使用File System Access API (仅在支持的浏览器上可用)
      try {
        const directoryHandle = await window.showDirectoryPicker();
        outputDir.value = directoryHandle.name;
        // 存储directoryHandle以供后续使用
        outputDir._directoryHandle = directoryHandle;
      } catch (e) {
        if (e.name !== 'AbortError') {
          throw e;
        }
      }
    } else {
      // 回退方案：使用输入框让用户手动输入路径
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
    }
  } catch (error) {
    console.error('选择输出目录失败:', error);
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
      rotations: profile.rotations
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
  
  // 直接调用设置事件监听器
  setupEventListeners();
});

onUnmounted(() => {
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
</style> 