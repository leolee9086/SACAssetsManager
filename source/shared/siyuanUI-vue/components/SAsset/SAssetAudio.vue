<template>
  <div 
    :data-node-id="nodeId" 
    data-type="NodeAudio" 
    class="s-asset-audio" 
    :updated="updatedTime"
    :data-status="audioPlayer.status"
  >
    <div class="s-asset-audio__content">
      <!-- 基本音频播放器 -->
      <audio 
        controls="controls" 
        :src="audioPlayer.processedSrc" 
        :data-src="src"
        preload="metadata"
        ref="audioElementRef"
        :class="{
          's-asset-audio--loading': audioPlayer.status === 'loading', 
          's-asset-audio--error': audioPlayer.status === 'error'
        }"
      ></audio>
      
      <!-- 高级播放控制UI (当启用advancedControls时显示) -->
      <div v-if="advancedControls" class="s-asset-audio__custom-controls">
        <div class="s-asset-audio__progress-container">
          <div class="s-asset-audio__buffer-bar" :style="{width: `${audioPlayer.bufferedPercent}%`}"></div>
          <div class="s-asset-audio__progress-bar" :style="{width: `${audioPlayer.progressPercent}%`}"></div>
          <input 
            type="range" 
            min="0" 
            max="100" 
            step="0.1" 
            class="s-asset-audio__progress-input"
            :value="audioPlayer.progressPercent"
            @input="handleSeek"
          >
        </div>
        
        <div class="s-asset-audio__controls-row">
          <button class="s-asset-audio__control-btn" @click="audioPlayer.togglePlay">
            {{ audioPlayer.status === 'playing' ? '暂停' : '播放' }}
          </button>
          
          <div class="s-asset-audio__time-display">
            {{ audioPlayer.formattedCurrentTime }} / {{ audioPlayer.formattedDuration }}
          </div>
          
          <div class="s-asset-audio__volume-control">
            <button class="s-asset-audio__control-btn" @click="audioPlayer.toggleMute">
              {{ audioPlayer.isMuted ? '取消静音' : '静音' }}
            </button>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05" 
              class="s-asset-audio__volume-slider"
              :value="audioPlayer.volume"
              @input="handleVolumeChange"
            >
          </div>
          
          <div class="s-asset-audio__speed-control">
            <select v-model="currentPlaybackRate" @change="handlePlaybackRateChange">
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
          </div>
        </div>
      </div>
      
      <!-- 错误状态显示 -->
      <div v-if="audioPlayer.status === 'error'" class="s-asset-audio__error">
        <span class="s-asset-audio__error-message">音频加载失败</span>
        <button class="s-asset-audio__retry-btn" @click="audioPlayer.retryLoading">重试</button>
      </div>
      
      <!-- 加载状态显示 -->
      <div v-if="audioPlayer.status === 'loading'" class="s-asset-audio__loading-indicator">
        正在加载音频...
      </div>
      {{ zwsp }}
    </div>
    <div class="protyle-attr" contenteditable="false">{{ zwsp }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useAudioPlayer } from '../../composables/useAudioPlayer.js';
/**
 * 生成唯一ID
 * @param {string} prefix - ID前缀
 * @returns {string} 格式为 "prefix-timestamp-randomString" 的唯一ID
 */
  function generateUniqueId(prefix = '') {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 10);
  return `${prefix}-${timestamp}-${randomStr}`;
}

/**
 * 生成当前时间的时间戳
 * @returns {string} ISO格式的时间戳字符串
 */
 function generateTimestamp() {
  return new Date().toISOString();
}
const props = defineProps({
  src: {
    type: String,
    required: true
  },
  autoRetry: {
    type: Boolean,
    default: true
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  retryInterval: {
    type: Number,
    default: 3000
  },
  rememberPosition: {
    type: Boolean,
    default: true
  },
  advancedControls: {
    type: Boolean,
    default: false
  },
  autoplay: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['statusChange', 'timeUpdate', 'durationChange']);

// 基础状态
const nodeId = ref('');
const updatedTime = ref('');
const zwsp = '\u200b'; // 零宽空格
const audioElementRef = ref(null);
const currentPlaybackRate = ref('1');

// 使用音频播放器hook
const audioPlayer = useAudioPlayer({
  src: props.src,
  autoRetry: props.autoRetry,
  maxRetries: props.maxRetries,
  retryInterval: props.retryInterval,
  rememberPosition: props.rememberPosition,
  onStatusChange: (status) => emit('statusChange', status)
});

// 进度条操作
function handleSeek(event) {
  audioPlayer.seekByPercent(parseFloat(event.target.value));
}

// 音量控制
function handleVolumeChange(event) {
  audioPlayer.setVolume(parseFloat(event.target.value));
}

// 播放速率控制
function handlePlaybackRateChange() {
  audioPlayer.setPlaybackRate(parseFloat(currentPlaybackRate.value));
}

// 更新metadata事件
function updateMetadata() {
  emit('durationChange', audioPlayer.audioDuration);
}

// 监听src变化
watch(() => props.src, (newSrc) => {
  // 重置组件ID和时间戳
  nodeId.value = generateUniqueId('audio');
  updatedTime.value = generateTimestamp();
});

// 暴露方法给父组件
defineExpose({
  play: audioPlayer.play,
  pause: audioPlayer.pause,
  seek: audioPlayer.seek,
  reset: audioPlayer.reset,
  getStatus: () => audioPlayer.status,
  getDuration: () => audioPlayer.audioDuration,
  getCurrentTime: () => audioPlayer.audioCurrentTime
});

// 监听播放事件
watch(() => audioPlayer.audioCurrentTime, (newTime) => {
  emit('timeUpdate', newTime);
});

watch(() => audioPlayer.audioDuration, updateMetadata);

onMounted(() => {
  nodeId.value = generateUniqueId('audio');
  updatedTime.value = generateTimestamp();
  
  // 设置音频引用
  if (audioElementRef.value) {
    audioPlayer.setAudioRef(audioElementRef.value);
  }
  
  // 如果需要自动播放
  if (props.autoplay) {
    setTimeout(() => {
      audioPlayer.play();
    }, 100);
  }
});
</script>

<style scoped>
.s-asset-audio {
  position: relative;
  margin: 8px 0;
  border-radius: 4px;
  overflow: hidden;
}

.s-asset-audio__content {
  position: relative;
  width: 100%;
}

.s-asset-audio--loading {
  opacity: 0.7;
  filter: grayscale(0.3);
}

.s-asset-audio--error {
  opacity: 0.5;
  filter: grayscale(0.5);
}

.s-asset-audio__error {
  color: #e53935;
  font-size: 0.9em;
  margin-top: 5px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.s-asset-audio__retry-btn {
  background-color: transparent;
  border: 1px solid #e53935;
  color: #e53935;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 0.8em;
  cursor: pointer;
  transition: all 0.2s ease;
}

.s-asset-audio__retry-btn:hover {
  background-color: rgba(229, 57, 53, 0.1);
}

.s-asset-audio__loading-indicator {
  color: #666;
  font-size: 0.85em;
  margin-top: 4px;
}

/* 基本音频样式 */
audio {
  width: 100%;
  outline: none;
  transition: all 0.3s ease;
}

/* 高级控制UI样式 */
.s-asset-audio__custom-controls {
  margin-top: 8px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  padding: 8px;
}

.s-asset-audio__progress-container {
  position: relative;
  height: 8px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  margin-bottom: 8px;
  overflow: hidden;
}

.s-asset-audio__buffer-bar {
  position: absolute;
  height: 100%;
  background: rgba(255, 255, 255, 0.5);
  z-index: 1;
}

.s-asset-audio__progress-bar {
  position: absolute;
  height: 100%;
  background: #4285f4;
  z-index: 2;
}

.s-asset-audio__progress-input {
  position: absolute;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
  z-index: 3;
}

.s-asset-audio__controls-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.9em;
}

.s-asset-audio__control-btn {
  background-color: #4285f4;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 0.9em;
  cursor: pointer;
  transition: background-color 0.2s;
}

.s-asset-audio__control-btn:hover {
  background-color: #3367d6;
}

.s-asset-audio__time-display {
  font-family: monospace;
  flex-grow: 1;
}

.s-asset-audio__volume-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.s-asset-audio__volume-slider {
  width: 60px;
}

.s-asset-audio__speed-control select {
  padding: 2px 4px;
  border-radius: 4px;
  border: 1px solid #ccc;
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .s-asset-audio__error {
    color: #ff6b6b;
  }
  
  .s-asset-audio__retry-btn {
    border-color: #ff6b6b;
    color: #ff6b6b;
  }
  
  .s-asset-audio__loading-indicator {
    color: #aaa;
  }
  
  .s-asset-audio__custom-controls {
    background: rgba(255, 255, 255, 0.1);
  }
  
  .s-asset-audio__progress-container {
    background: rgba(255, 255, 255, 0.15);
  }
  
  .s-asset-audio__buffer-bar {
    background: rgba(255, 255, 255, 0.3);
  }
  
  .s-asset-audio__control-btn {
    background-color: #5c9eff;
  }
  
  .s-asset-audio__control-btn:hover {
    background-color: #80b3ff;
  }
  
  .s-asset-audio__speed-control select {
    background: #333;
    color: #eee;
    border-color: #555;
  }
}
</style> 