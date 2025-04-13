<template>
  <div class="audio-settings-section">
    <div class="section-header">
      <div class="section-title">背景音乐</div>
      <div class="section-toggle">
        <input 
          type="checkbox" 
          :id="`audioEnabled-${profileIndex}`" 
          v-model="audioSettings.enabled" 
        />
        <label :for="`audioEnabled-${profileIndex}`">启用</label>
      </div>
    </div>
    
    <div class="audio-options" v-if="audioSettings.enabled">
      <!-- 音频文件选择 -->
      <div class="setting-item">
        <label>音频文件</label>
        <div class="audio-selector">
          <button class="action-btn" @click="selectAudioFile">
            <i class="icon">🎵</i>
            选择音频
          </button>
          <div v-if="audioFileName" class="audio-file-info">
            {{ audioFileName }}
          </div>
        </div>
      </div>
      
      <!-- 音频预览播放器 -->
      <div class="setting-item" v-if="audioSettings.preview">
        <div class="audio-player">
          <audio ref="audioPlayer" controls :src="audioSettings.preview"></audio>
        </div>
      </div>
      
      <!-- 适配模式 -->
      <div class="setting-item">
        <label>适配模式</label>
        <select v-model="audioSettings.adaptMode">
          <option value="fitVideo">适配视频时长 (截断/循环音频)</option>
          <option value="fitAudio">适配音频时长 (调整视频旋转速度)</option>
        </select>
        
        <!-- 音频时长提示 -->
        <div class="audio-info" v-if="audioDuration > 0">
          <div class="audio-duration-hint">
            <i class="icon">⏱️</i> 音频时长: <span class="duration-value">{{ formatDuration(audioDuration) }}</span>
          </div>
          
          <div v-if="audioSettings.adaptMode === 'fitAudio'" class="video-duration-preview">
            <i class="icon">🎬</i> 预计视频时长: <span class="duration-value">{{ formatDuration(Math.ceil(audioDuration)) }}</span>
          </div>
        </div>
      </div>
      
      <!-- 适配音频时的旋转圈数 -->
      <div class="setting-item" v-if="audioSettings.adaptMode === 'fitAudio'">
        <label>旋转圈数</label>
        <select v-model="audioSettings.rotationsForAudio">
          <option :value="1">1圈</option>
          <option :value="2">2圈</option>
          <option :value="3">3圈</option>
          <option :value="4">4圈</option>
        </select>
        
        <!-- 旋转圈数预览 -->
        <div class="rotation-preview" v-if="audioDuration > 0">
          <div class="rotation-info">
            <i class="icon">🔄</i> 每圈时长: <span class="value">{{ formatDuration(audioDuration / audioSettings.rotationsForAudio) }}</span>
          </div>
          <div class="rotation-speed-indicator">
            <span class="speed-label">旋转速度:</span>
            <div class="speed-meter">
              <div class="speed-value" :style="{ width: getSpeedIndicatorWidth() }"></div>
            </div>
            <span class="speed-text">{{ getSpeedDescription() }}</span>
          </div>
        </div>
      </div>
      
      <!-- 音量控制 -->
      <div class="setting-item">
        <label>音量</label>
        <div class="range-with-value">
          <input 
            type="range" 
            v-model="audioSettings.volume" 
            min="0" 
            max="1" 
            step="0.1" 
          />
          <div class="range-value">{{ parseFloat(audioSettings.volume).toFixed(1) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, computed, ref, watch } from 'vue';
import { showWarningMessage } from '../utils/fileUtils.js';

const props = defineProps({
  profile: {
    type: Object,
    required: true
  },
  profileIndex: {
    type: Number,
    required: true
  }
});

const emit = defineEmits(['update:profile']);

// 从profile中提取音频设置
const audioSettings = computed({
  get: () => props.profile.audio || {
    enabled: false,
    file: null,
    filePath: null,
    fileName: null,
    preview: null,
    adaptMode: 'fitVideo',
    rotationsForAudio: 2,
    volume: 0.8
  },
  set: (value) => {
    // 当切换到适配音频模式时，确保rotationsForAudio设置了值
    if (value.adaptMode === 'fitAudio' && !value.rotationsForAudio) {
      value.rotationsForAudio = 2;
    }
    
    const updatedProfile = {
      ...props.profile,
      audio: value
    };
    emit('update:profile', updatedProfile);
  }
});

// 音频文件名显示
const audioFileName = computed(() => {
  if (audioSettings.value.fileName) {
    return audioSettings.value.fileName;
  } else if (audioSettings.value.filePath) {
    // 从文件路径提取文件名
    const parts = audioSettings.value.filePath.split(/[\/\\]/);
    return parts[parts.length - 1];
  }
  return null;
});

// 音频播放器引用
const audioPlayer = ref(null);
// 音频时长
const audioDuration = ref(0);

// 格式化时长显示
function formatDuration(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = Math.round(seconds % 60);
  return `${min}分${sec}秒`;
}

// 选择音频文件
const selectAudioFile = async () => {
  try {
    // 创建文件选择器
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.mp3,.wav,.m4a,.ogg,.flac';
    
    // 处理文件选择
    fileInput.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      try {
        // 创建对象URL用于预览
        const objectUrl = URL.createObjectURL(file);
        console.log(file)
        // 更新音频设置
        audioSettings.value = {
          ...audioSettings.value,
          file: file,
          fileName: file.name,
          preview: objectUrl
        };
        
        console.log('已选择音频文件:', file.name);
        
        // 获取音频时长
        audioDuration.value = 0; // 重置时长
        setTimeout(() => {
          loadAudioDuration(objectUrl);
        }, 100);
      } catch (error) {
        console.error('处理音频文件失败:', error);
        showWarningMessage('处理音频文件失败: ' + error.message);
      }
    };
    
    // 触发文件选择对话框
    fileInput.click();
  } catch (error) {
    console.error('选择音频文件失败:', error);
    showWarningMessage('选择音频文件失败: ' + error.message);
  }
};

// 加载音频时长
const loadAudioDuration = (audioUrl) => {
  const audio = new Audio();
  audio.src = audioUrl;
  
  audio.onloadedmetadata = () => {
    audioDuration.value = audio.duration;
    console.log('音频时长:', audioDuration.value, '秒');
  };
  
  audio.onerror = (e) => {
    console.error('获取音频时长失败:', e);
  };
};

// 当音频预览变化时加载时长
watch(() => audioSettings.value.preview, (newPreview) => {
  if (newPreview) {
    loadAudioDuration(newPreview);
  } else {
    audioDuration.value = 0;
  }
});

// 音频时长改变时更新相关设置
watch(() => audioDuration.value, (newDuration) => {
  if (newDuration > 0 && audioSettings.value.adaptMode === 'fitAudio') {
    updateVideoParametersForAudio();
  }
});

// 更新视频参数以适配音频时长
const updateVideoParametersForAudio = () => {
  if (audioDuration.value <= 0 || !audioSettings.value.enabled || audioSettings.value.adaptMode !== 'fitAudio') {
    return;
  }
  
  const newDuration = Math.ceil(audioDuration.value);
  const rotationsForAudio = audioSettings.value.rotationsForAudio || 2;
  
  console.log('根据音频更新视频参数:', {
    audioDuration: audioDuration.value,
    newVideoDuration: newDuration,
    rotationsForAudio
  });
  
  // 创建新的profile对象以确保更改被检测到
  const updatedProfile = {
    ...props.profile,
    duration: newDuration,
    rotations: rotationsForAudio
  };
  
  // 通知父组件
  emit('update:profile', updatedProfile);
};

// 监听设置变化
watch(() => props.profile, (newProfile) => {
  // 仅在音频设置发生变化时，触发UI更新
  if (JSON.stringify(newProfile.audio) !== JSON.stringify(audioSettings.value)) {
    audioSettings.value = newProfile.audio;
  }
}, { deep: true });

// 监听适配模式变化
watch(() => audioSettings.value.adaptMode, (newMode) => {
  if (newMode === 'fitAudio') {
    // 适配音频模式下确保设置了旋转圈数
    if (!audioSettings.value.rotationsForAudio) {
      audioSettings.value = {
        ...audioSettings.value,
        rotationsForAudio: 2
      };
    }
    
    console.log('切换到适配音频时长模式，当前音频时长:', audioDuration.value);
    
    // 如果已知音频时长，立即更新视频参数
    if (audioDuration.value > 0) {
      updateVideoParametersForAudio();
    }
  }
}, { immediate: true });

// 监听旋转圈数变化
watch(() => audioSettings.value.rotationsForAudio, (newValue) => {
  if (audioSettings.value.adaptMode === 'fitAudio' && audioDuration.value > 0) {
    updateVideoParametersForAudio();
  }
});

// 组件卸载时清理资源
const cleanup = () => {
  if (audioSettings.value.preview) {
    URL.revokeObjectURL(audioSettings.value.preview);
  }
};

// 暴露给父组件的方法
defineExpose({
  cleanup
});

// 获取速度指示器宽度
const getSpeedIndicatorWidth = () => {
  if (audioDuration <= 0) return '0%';
  
  // 根据每圈时长计算速度指示器宽度 (反比例)
  const timePerRotation = audioDuration / audioSettings.value.rotationsForAudio;
  
  // 基准: 10秒/圈为中速 (50%)
  // 更慢 (更长时间每圈): <50%
  // 更快 (更短时间每圈): >50%
  
  // 将每圈时长映射到0-100%范围
  // 范围: 30秒/圈 (很慢, 10%) 到 2秒/圈 (很快, 90%)
  const minTime = 2;  // 每圈2秒是很快的
  const midTime = 10; // 每圈10秒是中等速度
  const maxTime = 30; // 每圈30秒是很慢的
  
  let percentage;
  if (timePerRotation >= maxTime) {
    percentage = 10; // 最小值
  } else if (timePerRotation <= minTime) {
    percentage = 90; // 最大值
  } else if (timePerRotation <= midTime) {
    // 中等到快速区间 (10-2秒/圈 => 50-90%)
    percentage = 50 + (midTime - timePerRotation) * (40 / (midTime - minTime));
  } else {
    // 中等到慢速区间 (10-30秒/圈 => 50-10%)
    percentage = 50 - (timePerRotation - midTime) * (40 / (maxTime - midTime));
  }
  
  return `${percentage}%`;
};

// 获取速度描述
const getSpeedDescription = () => {
  if (audioDuration <= 0) return '';
  
  const timePerRotation = audioDuration / audioSettings.value.rotationsForAudio;
  
  if (timePerRotation < 5) return '很快';
  if (timePerRotation < 10) return '较快';
  if (timePerRotation < 15) return '适中';
  if (timePerRotation < 25) return '较慢';
  return '很慢';
};
</script>

<style scoped>
.audio-settings-section {
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

.audio-options {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-item label {
  font-size: 13px;
  color: var(--cc-theme-on-surface);
}

.audio-selector {
  display: flex;
  flex-direction: column;
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
  font-size: 13px;
  width: fit-content;
}

.action-btn:hover {
  background: var(--cc-theme-surface-hover);
}

.icon {
  display: inline-block;
  width: 16px;
  text-align: center;
}

.audio-file-info {
  padding: 8px;
  background: var(--cc-theme-surface-light);
  border-radius: 4px;
  font-size: 13px;
  word-break: break-all;
}

.audio-player {
  width: 100%;
}

.audio-player audio {
  width: 100%;
  height: 36px;
}

.range-with-value {
  display: flex;
  align-items: center;
  gap: 12px;
}

.range-with-value input[type="range"] {
  flex: 1;
}

.range-value {
  width: 40px;
  text-align: right;
  font-size: 13px;
  color: var(--cc-theme-on-surface-variant);
}

select {
  padding: 8px;
  border: 1px solid var(--cc-border-color);
  border-radius: 4px;
  background: var(--cc-theme-surface);
  color: var(--cc-theme-on-surface);
}

.audio-info {
  margin-top: 8px;
  padding: 8px;
  background-color: rgba(0, 0, 0, 0.03);
  border-radius: 4px;
  border-left: 3px solid var(--cc-theme-primary, #4CAF50);
}

.audio-duration-hint,
.video-duration-preview {
  font-size: 12px;
  color: var(--cc-theme-on-surface-variant);
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}

.duration-value {
  font-weight: 500;
  color: var(--cc-theme-on-surface);
}

.rotation-preview {
  margin-top: 8px;
  padding: 8px;
  background-color: rgba(0, 0, 0, 0.03);
  border-radius: 4px;
}

.rotation-info {
  font-size: 12px;
  color: var(--cc-theme-on-surface-variant);
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}

.rotation-info .value {
  font-weight: 500;
  color: var(--cc-theme-on-surface);
}

.rotation-speed-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.speed-label {
  color: var(--cc-theme-on-surface-variant);
  white-space: nowrap;
}

.speed-meter {
  flex: 1;
  height: 6px;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.speed-value {
  height: 100%;
  background-color: var(--cc-theme-primary, #4CAF50);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.speed-text {
  font-weight: 500;
  color: var(--cc-theme-on-surface);
  width: 36px;
  text-align: right;
}
</style> 