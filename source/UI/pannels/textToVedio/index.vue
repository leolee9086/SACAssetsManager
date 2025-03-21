<template>
    <div class="text-to-video-container">
      <h2>文本转视频测试</h2>
      
      <div class="layout-container">
        <!-- 左侧输入区域 -->
        <div class="left-panel">
          <div class="input-area">
            <textarea 
              v-model="textInput" 
              placeholder="请输入要转换为视频的文本，每句用'；'分隔" 
              rows="12"
            ></textarea>
          </div>
          
          <div class="controls">
            <button 
              @click="generateVideo" 
              :disabled="isGenerating || !textInput" 
              class="primary-btn"
            >
              {{ isGenerating ? '生成中...' : '生成视频' }}
            </button>
            
            <div class="options">
              <label>
                每句显示时间(秒): 
                <input type="number" v-model.number="durationPerText" min="1" max="10" step="0.5" />
              </label>
            </div>
          </div>
        </div>
        
        <!-- 右侧预览区域 -->
        <div class="right-panel">
          <div v-if="generationProgress > 0 && generationProgress < 100" class="progress">
            <div class="progress-bar" :style="{width: `${generationProgress}%`}"></div>
            <span>{{Math.floor(generationProgress)}}%</span>
          </div>
          
          <div v-if="videoUrl" class="result">
            <video controls :src="videoUrl" class="video-preview"></video>
            <div class="download-area">
              <button @click="downloadVideo" class="download-btn">下载视频</button>
              <span class="filename">{{ videoFilename }}</span>
            </div>
          </div>
          
          <div v-if="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref,onUnmounted } from 'vue';
  import { createTextVideo } from './textToVideo.js';
  
  // 响应式状态
  const textInput = ref('');
  const isGenerating = ref(false);
  const videoUrl = ref('');
  const errorMessage = ref('');
  const durationPerText = ref(2);
  const generationProgress = ref(0);
  const videoFilename = ref('文本视频.mp4');
  
  // 处理文本分割
  const processText = (text) => {
    if (!text) return [];
    return text.split('\n\n').filter(line => line.trim());
  };
  
  // 生成视频处理函数
  const generateVideo = async () => {
    try {
      errorMessage.value = '';
      isGenerating.value = true;
      generationProgress.value = 0;
      
      if (!textInput.value.trim()) {
        throw new Error('请输入文本内容');
      }
      
      // 修改视频文件名基于文本内容
      const firstLine = processText(textInput.value)[0]
      videoFilename.value = `${firstLine || '文本视频'}.mp4`;
      
      // 进度更新函数
      const updateProgress = (current, total) => {
        generationProgress.value = (current / total) * 100;
      };
      
      // 处理文本并生成视频
      const processedText = processText(textInput.value);
      const videoBlob = await createTextVideo(processedText, {
        durationPerText: durationPerText.value,
        onProgress: updateProgress
      });
      
      // 创建视频URL
      if (videoUrl.value) {
        URL.revokeObjectURL(videoUrl.value);
      }
      videoUrl.value = URL.createObjectURL(videoBlob);
      generationProgress.value = 100;
    } catch (error) {
      console.error('视频生成失败：', error);
      errorMessage.value = `生成失败: ${error.message}`;
    } finally {
      isGenerating.value = false;
    }
  };
  
  // 下载视频
  const downloadVideo = () => {
    if (!videoUrl.value) return;
    
    const a = document.createElement('a');
    a.href = videoUrl.value;
    a.download = videoFilename.value;
    a.click();
  };
  
  // 组件销毁时清理资源
  const cleanup = () => {
    if (videoUrl.value) {
      URL.revokeObjectURL(videoUrl.value);
    }
  };
  
  // 生命周期钩子
  onUnmounted(cleanup);
  </script>
  
  <style scoped>
  .text-to-video-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
  }
  
  .layout-container {
    display: flex;
    gap: 20px;
    margin-top: 20px;
  }
  
  .left-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  
  .right-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  
  .input-area {
    margin-bottom: 20px;
  }
  
  .input-area textarea {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    resize: vertical;
    font-size: 16px;
    height: 100%;
    min-height: 200px;
  }
  
  .controls {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  
  .primary-btn {
    padding: 10px 20px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
  }
  
  .primary-btn:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
  
  .options {
    display: flex;
    align-items: center;
  }
  
  .options input {
    width: 60px;
    margin-left: 5px;
    padding: 5px;
  }
  
  .progress {
    height: 20px;
    background-color: #f3f3f3;
    border-radius: 10px;
    margin-bottom: 20px;
    position: relative;
    overflow: hidden;
  }
  
  .progress-bar {
    height: 100%;
    background-color: #4CAF50;
    transition: width 0.2s;
  }
  
  .progress span {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    line-height: 20px;
    color: white;
    text-shadow: 0 0 2px rgba(0,0,0,0.5);
  }
  
  .result {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  
  .video-preview {
    width: 100%;
    height: 100%;
    min-height: 300px;
    border-radius: 4px;
    background-color: black;
    object-fit: contain;
  }
  
  .download-area {
    margin-top: 10px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .download-btn {
    padding: 8px 16px;
    background-color: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .error-message {
    margin-top: 20px;
    padding: 10px;
    background-color: #ffebee;
    color: #c62828;
    border-radius: 4px;
  }
  </style>