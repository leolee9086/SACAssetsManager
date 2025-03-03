<template>
  <div class="test-container">
    <h2>音频组件测试</h2>
    
    <div class="test-controls">
      <h3>配置选项</h3>
      <div class="option-row">
        <label>
          <input type="checkbox" v-model="config.advancedControls">
          高级控制
        </label>
        
        <label>
          <input type="checkbox" v-model="config.autoplay">
          自动播放
        </label>
        
        <label>
          <input type="checkbox" v-model="config.autoRetry">
          自动重试
        </label>
        
        <label>
          <input type="checkbox" v-model="config.rememberPosition">
          记住位置
        </label>
      </div>
      
      <div class="option-row">
        <label>
          最大重试次数：
          <input type="number" v-model.number="config.maxRetries" min="1" max="10">
        </label>
        
        <label>
          重试间隔(毫秒)：
          <input type="number" v-model.number="config.retryInterval" min="1000" step="1000">
        </label>
      </div>
      
      <div class="option-row">
        <label>
          音频源：
          <select v-model="selectedAudioSrc">
            <option v-for="(audio, index) in audioSources" :key="index" :value="audio.src">
              {{ audio.name }}
            </option>
          </select>
        </label>
        
        <div class="local-audio-input">
          <label for="local-audio-file">打开本地音频:</label>
          <input 
            type="file" 
            id="local-audio-file" 
            accept="audio/*" 
            @change="handleLocalAudio"
          />
        </div>
        
        <button @click="reloadComponent">重新加载组件</button>
      </div>
    </div>
    
    <div class="component-container">
      <h3>组件实例</h3>
      <SAssetAudio
        v-if="showComponent"
        ref="audioComponentRef"
        :src="selectedAudioSrc"
        :advanced-controls="config.advancedControls"
        :autoplay="config.autoplay"
        :auto-retry="config.autoRetry"
        :max-retries="config.maxRetries"
        :retry-interval="config.retryInterval"
        :remember-position="config.rememberPosition"
        @status-change="onStatusChange"
        @time-update="onTimeUpdate"
        @duration-change="onDurationChange"
      />
    </div>
    
    <div class="api-test-panel">
      <h3>API 测试</h3>
      <div class="api-buttons">
        <button @click="callPlay">播放</button>
        <button @click="callPause">暂停</button>
        <button @click="callReset">重置</button>
        <button @click="callSeek">跳转到指定位置</button>
        <input 
          type="number" 
          v-model.number="seekPosition" 
          placeholder="跳转位置(秒)" 
          min="0"
          :max="duration"
          step="1"
        >
      </div>
      
      <div class="status-display">
        <div>播放状态: <span :class="'status-' + status">{{ status }}</span></div>
        <div>当前时间: {{ formatTime(currentTime) }}</div>
        <div>总时长: {{ formatTime(duration) }}</div>
      </div>
    </div>
    
    <div class="event-log">
      <h3>事件日志</h3>
      <div class="log-container">
        <div v-for="(log, index) in eventLogs" :key="index" class="log-entry">
          <span class="log-time">{{ log.time }}</span>
          <span class="log-type" :class="'log-type-' + log.type">{{ log.type }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
      <button @click="clearLogs">清除日志</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, onBeforeUnmount } from 'vue';
import SAssetAudio from '../../../shared/siyuanUI-vue/components/SAsset/SAssetAudio.vue';

// 音频源
const audioSources = [
  { name: 'NASA地球声音', src: 'https://www.nasa.gov/wp-content/uploads/2015/01/soundsofearth.mp3' },
  { name: 'NASA太空行走音效', src: 'https://www.nasa.gov/wp-content/uploads/2016/01/eva_sounds.mp3' },
  { name: '无效音频链接', src: 'https://invalid-url/audio.mp3' }
];

// 本地音频对象URL
const localAudioUrl = ref(null);

// 配置项
const config = reactive({
  advancedControls: true,
  autoplay: false,
  autoRetry: true,
  maxRetries: 3,
  retryInterval: 3000,
  rememberPosition: true
});

// 状态
const selectedAudioSrc = ref(audioSources[0].src);
const status = ref('idle');
const currentTime = ref(0);
const duration = ref(0);
const showComponent = ref(true);
const seekPosition = ref(0);
const eventLogs = ref([]);
const audioComponentRef = ref(null);

// 方法
function reloadComponent() {
  showComponent.value = false;
  setTimeout(() => {
    showComponent.value = true;
  }, 100);
  
  addLog('用户操作', '组件已重新加载');
}

function callPlay() {
  if (audioComponentRef.value) {
    audioComponentRef.value.play();
    addLog('用户操作', '调用 play() 方法');
  }
}

function callPause() {
  if (audioComponentRef.value) {
    audioComponentRef.value.pause();
    addLog('用户操作', '调用 pause() 方法');
  }
}

function callReset() {
  if (audioComponentRef.value) {
    audioComponentRef.value.reset();
    addLog('用户操作', '调用 reset() 方法');
  }
}

function callSeek() {
  if (audioComponentRef.value && seekPosition.value >= 0) {
    audioComponentRef.value.seek(seekPosition.value);
    addLog('用户操作', `调用 seek(${seekPosition.value}) 方法`);
  }
}

// 事件处理
function onStatusChange(newStatus) {
  status.value = newStatus;
  addLog('事件', `状态变更为: ${newStatus}`);
}

function onTimeUpdate(time) {
  currentTime.value = time;
}

function onDurationChange(totalDuration) {
  duration.value = totalDuration;
  addLog('事件', `音频时长: ${formatTime(totalDuration)}`);
}

// 工具函数
function formatTime(seconds) {
  if (!seconds) return '00:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function addLog(type, message) {
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  
  eventLogs.value.unshift({
    time: timeStr,
    type,
    message
  });
  
  // 限制日志数量
  if (eventLogs.value.length > 100) {
    eventLogs.value = eventLogs.value.slice(0, 100);
  }
}

function clearLogs() {
  eventLogs.value = [];
}

// 处理本地音频文件
function handleLocalAudio(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // 释放之前的对象URL（如果有）
  if (localAudioUrl.value) {
    URL.revokeObjectURL(localAudioUrl.value);
  }
  
  // 创建新的对象URL
  localAudioUrl.value = URL.createObjectURL(file);
  selectedAudioSrc.value = localAudioUrl.value;
  
  // 重新加载组件
  reloadComponent();
  
  addLog('用户操作', `加载本地音频: ${file.name}`);
}

onMounted(() => {
  addLog('系统', '测试组件已加载');
});

// 组件销毁前清理对象URL
onBeforeUnmount(() => {
  if (localAudioUrl.value) {
    URL.revokeObjectURL(localAudioUrl.value);
  }
});
</script>

<style scoped>
.test-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

h2, h3 {
  margin-top: 0;
  color: #333;
}

.test-controls, .component-container, .api-test-panel, .event-log {
  margin-bottom: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  background-color: #f9f9f9;
}

.option-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 10px;
}

label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

input[type="number"] {
  width: 80px;
}

.api-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
}

button {
  padding: 6px 12px;
  background-color: #4285f4;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover {
  background-color: #3367d6;
}

.status-display {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 10px;
}

.status-playing { color: #2e7d32; }
.status-paused { color: #f57c00; }
.status-loading { color: #0288d1; }
.status-error { color: #d32f2f; }
.status-idle { color: #757575; }

.log-container {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #fff;
  padding: 10px;
  margin-bottom: 10px;
}

.log-entry {
  font-family: monospace;
  padding: 4px 0;
  border-bottom: 1px solid #eee;
}

.log-time {
  color: #666;
  margin-right: 8px;
}

.log-type {
  display: inline-block;
  min-width: 60px;
  margin-right: 8px;
  padding: 2px 5px;
  border-radius: 3px;
  text-align: center;
  font-size: 0.9em;
}

.log-type-事件 { background-color: #e3f2fd; color: #0d47a1; }
.log-type-用户操作 { background-color: #e8f5e9; color: #1b5e20; }
.log-type-系统 { background-color: #fff3e0; color: #e65100; }

/* 响应式设计 */
@media (max-width: 600px) {
  .option-row {
    flex-direction: column;
    gap: 8px;
  }
  
  .status-display {
    grid-template-columns: 1fr;
  }
}

/* 暗黑模式 */
@media (prefers-color-scheme: dark) {
  .test-container {
    color: #eee;
    background-color: #333;
  }
  
  h2, h3 {
    color: #fff;
  }
  
  .test-controls, .component-container, .api-test-panel, .event-log {
    background-color: #424242;
    border-color: #555;
  }
  
  .log-container {
    background-color: #333;
    border-color: #444;
  }
  
  .log-entry {
    border-bottom-color: #444;
  }
  
  .log-time {
    color: #aaa;
  }
  
  .log-type-事件 { background-color: #0d47a1; color: #e3f2fd; }
  .log-type-用户操作 { background-color: #1b5e20; color: #e8f5e9; }
  .log-type-系统 { background-color: #e65100; color: #fff3e0; }
  
  button {
    background-color: #5c9eff;
  }
  
  button:hover {
    background-color: #80b3ff;
  }
}

.local-audio-input {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

input[type="file"] {
  max-width: 220px;
}
</style>