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
        <FileSelector 
          :selectedFiles="selectedFiles"
          :isExporting="isExporting"
          @add-files="addFile"
          @remove-file="removeFile"
          @clear-files="clearSelectedFiles"
        />
  
        <!-- 导出设置 -->
        <SettingsManager
          v-model:settingProfiles="settingProfiles"
          v-model:outputDir="outputDir"
          v-model:createSubDirs="createSubDirs"
          :availableFonts="availableFonts"
          :canGeneratePreview="canGeneratePreview"
          @generate-preview="generateWatermarkPreview"
        />
  
        <!-- 批处理任务 -->
        <TaskList
          :tasks="tasks"
          :isExporting="isExporting"
          :canStartExport="canStartExport"
          @start-export="startBatchExport"
        />
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
  import { kernelApi, plugin } from '../../../asyncModules.js';
  import * as THREE from '../../../../static/three/three.mjs';
  
  // 导入组件
  import FileSelector from './components/FileSelector.vue';
  import SettingsManager from './components/SettingsManager.vue';
  import TaskList from './components/TaskList.vue';
  
  // 导入工具函数
  import { debounce, getDefaultProfile } from './utils/common.js';
  import { generateThumbnailFromPath, generateThumbnailFromUrl, showWarningMessage } from './utils/fileUtils.js';
  import { generateWatermarkPreview as genWatermarkPreview, clearPreviewCache } from './utils/previewUtils.js';
  import { prepareExportTasks, processExportTask } from './utils/exportUtils.js';
  
  // 定义props，接收对话框传递的数据
  const props = defineProps({
    sourceType: String,
    currentImage: Object,
    settings: Object
  });
  
  // 状态管理
  const selectedFiles = ref([]);
  const settingProfiles = ref([getDefaultProfile()]);
  const outputDir = ref('');
  const createSubDirs = ref(true);
  
  const tasks = ref([]);
  const isExporting = ref(false);
  const currentTaskIndex = ref(-1);
  
  // 添加字体相关的状态
  const availableFonts = ref([]);
  
  // 计算属性
  const canStartExport = computed(() => {
    const result = selectedFiles.value.length > 0 && 
           outputDir.value && 
           !isExporting.value;
    
    // 调试日志
    console.log('canStartExport计算:', {
      hasFiles: selectedFiles.value.length > 0,
      hasOutputDir: !!outputDir.value,
      notExporting: !isExporting.value,
      result
    });
    
    return result;
  });
  
  // 判断是否可以生成预览
  const canGeneratePreview = computed(() => {
    return selectedFiles.value.length > 0;
  });
  
  // 监听水印设置变化，自动更新预览 - 优化防抖
  const updatePreviewDebounced = debounce((profileIndex, forceRegenerate = false) => {
    if (canGeneratePreview.value) {
      console.log(`更新预览，${forceRegenerate ? '强制重新生成底图' : '仅更新水印'}`);
      generateWatermarkPreview(profileIndex, forceRegenerate);
    }
  }, 300); // 300ms防抖延迟
  
  // 获取系统字体
  const loadSystemFonts = async () => {
    try {
      console.log('开始加载系统字体...');
      const fonts = await kernelApi.getSysFonts();
      
      if (Array.isArray(fonts) && fonts.length > 0) {
        availableFonts.value = fonts;
        console.log(`成功加载 ${availableFonts.value.length} 个系统字体`);
      } else {
        console.warn('系统字体列表为空或格式错误，使用默认字体列表');
        setDefaultFonts();
      }
    } catch (error) {
      console.error('获取系统字体失败:', error);
      setDefaultFonts();
    }
  };
  
  // 设置默认字体列表
  const setDefaultFonts = () => {
    availableFonts.value = [
      'Arial', 'Verdana', 'Helvetica', 'Times New Roman', 'Courier New', 
      'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Tahoma', 'Trebuchet MS',
      '宋体', '黑体', '微软雅黑', '楷体', '仿宋', '思源黑体', '思源宋体'
    ];
    console.log('使用默认字体列表，共', availableFonts.value.length, '个字体');
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
      }
    }
  };
  
  // 方法
  const refreshFileList = () => {
    // 重新加载已选文件的缩略图和信息
    selectedFiles.value.forEach(async (file, index) => {
      try {
        if (file.file) {
          // 如果是File对象，重新生成缩略图
          try {
            const objectUrl = URL.createObjectURL(file.file);
            const thumbnail = await generateThumbnailFromUrl(objectUrl);
            selectedFiles.value[index].thumbnail = thumbnail;
          } catch (error) {
            console.error('刷新文件缩略图失败:', error);
          }
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
  
  // 添加文件
  const addFile = (file) => {
    selectedFiles.value.push(file);
  };
  
  // 移除文件
  const removeFile = (index) => {
    selectedFiles.value.splice(index, 1);
  };
  
  // 清空文件列表
  const clearSelectedFiles = () => {
    selectedFiles.value = [];
  };
  
  // 生成水印预览 - 传递是否重新生成底图的参数
  const generateWatermarkPreview = async (profileIndex, forceRegenerate = false) => {
    if (!canGeneratePreview.value) return;
    
    const profile = settingProfiles.value[profileIndex];
    await genWatermarkPreview(profile, selectedFiles.value, forceRegenerate);
  };
  
  // 开始批量导出
  const startBatchExport = async () => {
    if (!canStartExport.value) {
      console.warn('无法开始导出:', {
        文件数: selectedFiles.value.length,
        输出目录: outputDir.value || '(未设置)',
        正在导出: isExporting.value
      });
      
      if (!outputDir.value) {
        showWarningMessage('请先选择输出目录');
      } else if (selectedFiles.value.length === 0) {
        showWarningMessage('请先选择要导出的文件');
      }
      return;
    }
    
    console.log('开始批量导出，输出目录:', outputDir.value);
    
    // 调试当前配置
    settingProfiles.value.forEach((profile, index) => {
      console.log(`配置 #${index + 1} 参数:`, {
        resolution: profile.resolution,
        fps: profile.fps,
        duration: profile.duration,
        rotations: profile.rotations,
        audioSettings: profile.audio?.enabled ? {
          adaptMode: profile.audio.adaptMode,
          rotationsForAudio: profile.audio.rotationsForAudio,
          volume: profile.audio.volume
        } : 'disabled'
      });
    });
    
    // 创建任务列表
    const newTasks = prepareExportTasks(
      selectedFiles.value, 
      settingProfiles.value, 
      outputDir.value, 
      createSubDirs.value
    );
    console.log(settingProfiles.value)
    if (newTasks.length === 0) {
      console.warn('没有创建任何任务');
      return;
    }
    
    console.log(`创建了 ${newTasks.length} 个任务，输出目录: ${outputDir.value}`);
    
    tasks.value = newTasks;
    isExporting.value = true;
    currentTaskIndex.value = -1;
    
    // 开始处理任务
    processNextTask();
  };
  
  // 处理下一个任务
  const processNextTask = async () => {
    currentTaskIndex.value++;
    
    if (currentTaskIndex.value >= tasks.value.length) {
      // 所有任务完成
      console.log('所有任务已完成');
      isExporting.value = false;
      return;
    }
    
    console.log(`开始处理任务 ${currentTaskIndex.value + 1}/${tasks.value.length}`);
    const currentTask = tasks.value[currentTaskIndex.value];
    
    // 更新任务状态的函数
    const updateTask = (updatedTask) => {
      Object.assign(tasks.value[currentTaskIndex.value], updatedTask);
      tasks.value = [...tasks.value]; // 触发响应式更新
    };
    
    // 处理当前任务
    try {
      await processExportTask(currentTask, updateTask);
      // 处理下一个任务
      processNextTask();
    } catch (error) {
      console.error('处理任务出错:', error);
      updateTask({
        status: 'error',
        error: error.message,
        stage: '处理出错',
        progress: 0
      });
      // 继续处理下一个任务
      processNextTask();
    }
  };
  
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
  
  onMounted(() => {
    console.log('批量导出器组件已挂载');
    
    // 加载系统字体
    loadSystemFonts().then(() => {
      // 确保即使在异步加载完成后，字体列表也能正确传递给子组件
      if (availableFonts.value.length === 0) {
        console.warn('字体列表加载后仍然为空，设置默认字体');
        setDefaultFonts();
      } else {
        console.log('成功初始化字体列表，准备传递给字体选择器');
      }
    });
    
    // 设置事件监听器
    setupEventListeners();
    
    // 调试日志
    console.log('初始状态:', {
      selectedFiles: selectedFiles.value,
      outputDir: outputDir.value,
      canStartExport: canStartExport.value,
      availableFonts: availableFonts.value.length
    });
  });
  
  onUnmounted(() => {
    // 清理资源
  });
  
  // 文件列表变化时执行清理
  watch(selectedFiles, () => {
    // 清除所有预览图和底图缓存
    clearPreviewCache();
    settingProfiles.value.forEach(profile => {
      profile.previewImage = null;
    });
  }, { deep: true });
  
  // 分离底图相关设置和水印相关设置的监听
  // 监听底图相关设置变化（需要重新生成底图）
  watch(
    () => settingProfiles.value.map(profile => ({
      isLandscape: profile.isLandscape,
      resolution: profile.resolution
    })),
    (newVal, oldVal) => {
      // 找出哪个配置发生了变化
      for (let i = 0; i < newVal.length; i++) {
        if (oldVal && oldVal[i] && JSON.stringify(newVal[i]) !== JSON.stringify(oldVal[i])) {
          console.log('底图相关设置已更改，需要重新生成预览底图');
          // 强制重新生成底图
          updatePreviewDebounced(i, true);
          break;
        }
      }
    },
    { deep: true }
  );
  
  // 监听水印相关设置变化（仅更新水印层）
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
      imageOpacity: profile.watermark.image.opacity
    })),
    (newVal, oldVal) => {
      // 找出哪个配置发生了变化
      for (let i = 0; i < newVal.length; i++) {
        if (oldVal && oldVal[i] && JSON.stringify(newVal[i]) !== JSON.stringify(oldVal[i])) {
          console.log('水印设置已更改，仅更新水印层');
          // 不重新生成底图，只更新水印
          updatePreviewDebounced(i, false);
          break;
        }
      }
    },
    { deep: true }
  );
  
  // 监听配置变化中的音频相关设置
  watch(
    () => settingProfiles.value.map(profile => ({
      audioEnabled: profile.audio?.enabled,
      adaptMode: profile.audio?.adaptMode,
      rotationsForAudio: profile.audio?.rotationsForAudio,
      duration: profile.duration,
      rotations: profile.rotations
    })),
    (newVal, oldVal) => {
      if (!oldVal) return;
      
      // 检查哪个配置发生了变化
      for (let i = 0; i < newVal.length; i++) {
        if (JSON.stringify(newVal[i]) !== JSON.stringify(oldVal[i])) {
          console.log(`检测到配置#${i+1}的音频相关设置变化:`, {
            旧值: oldVal[i],
            新值: newVal[i]
          });
        }
      }
    },
    { deep: true }
  );
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
  
  .panel-actions {
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
  
  .action-btn.refresh-btn {
    padding: 4px 8px;
  }
  
  .icon {
    display: inline-block;
    width: 20px;
    text-align: center;
  }
  </style> 