<template>
  <div class="ai-color-changer" :style="{ backgroundColor: backgroundColor }">
    <div class="content-wrapper">
      <h2>AI颜色控制面板</h2>
      
      <div class="controls">
        <div class="input-section">
          <input 
            v-model="userInput" 
            placeholder="输入颜色名称或命令，例如：'将背景改为蓝色'" 
            @keyup.enter="processInput"
          />
          <button @click="processInput">应用</button>
        </div>
        
        <div class="speech-section">
          <button 
            @click="toggleSpeechRecognition" 
            :class="{ 'recording': isListening }"
          >
            {{ isListening ? '停止语音输入' : '开始语音输入' }}
          </button>
          <div class="status-indicator" v-if="isListening">正在聆听...</div>
        </div>
      </div>
      
      <div class="ai-status">
        <div class="status-info">
          <span class="status-label">AI状态:</span>
          <span class="status-value">{{ aiStatusText }}</span>
        </div>
      </div>
      
      <div class="color-display">
        <div class="current-color">
          <span>当前颜色:</span>
          <div class="color-preview" :style="{ backgroundColor: backgroundColor }"></div>
          <span>{{ colorName || backgroundColor }}</span>
        </div>
      </div>
      
      <div class="history">
        <h3>颜色变更历史</h3>
        <ul>
          <li v-for="(item, index) in colorHistory" :key="index">
            <span class="timestamp">{{ formatTime(item.timestamp) }}</span>
            <span class="color-sample" :style="{ backgroundColor: item.color }"></span>
            <span>{{ item.name || item.color }}</span>
            <span class="source">(通过{{ item.source }})</span>
          </li>
        </ul>
      </div>
      
      <div class="message" v-if="message" :class="{ 'error': isErrorMessage }">{{ message }}</div>
      
      <div class="loading-indicator" v-if="isLoading">
        <span class="loading-spinner"></span>
        <span>正在处理...</span>
      </div>
      
      <!-- 添加模型选择器和工具执行面板 -->
      <div class="tool-panel-section">
        <h3>AI工具面板</h3>
        <div v-if="showToolPanel">
          <ToolExecutionPanel />
        </div>
        <div v-else class="tool-placeholder">
          <p>工具执行组件加载中或出现错误，请检查控制台信息。</p>
          <button class="retry-btn" @click="initToolPanel">重试加载</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { setupAIProcessor } from './setupModels.js';
import ToolExecutionPanel from './ToolExecutionPanel.vue';
// 状态
const userInput = ref('');
const backgroundColor = ref('#f0f0f0');  // 默认背景色
const colorName = ref('');
const isListening = ref(false);
const message = ref('');
const colorHistory = ref([]);
const recognition = ref(null);
const isErrorMessage = ref(false);
const isLoading = ref(false);
const originalOnError = ref(null);
// AI处理器状态
const localAIProcessor = ref(null);
const aiStatus = ref('initializing');

// 颜色映射表
const colorMap = {
  '红': '#ff0000',
  '红色': '#ff0000',
  '暗红': '#8b0000',
  '粉红': '#ffc0cb',
  '粉色': '#ffc0cb',
  '橙': '#ffa500',
  '橙色': '#ffa500',
  '黄': '#ffff00',
  '黄色': '#ffff00',
  '绿': '#008000',
  '绿色': '#008000',
  '青': '#00ffff',
  '青色': '#00ffff',
  '蓝': '#0000ff',
  '蓝色': '#0000ff',
  '天蓝': '#87ceeb',
  '天蓝色': '#87ceeb',
  '紫': '#800080',
  '紫色': '#800080',
  '白': '#ffffff',
  '白色': '#ffffff',
  '黑': '#000000',
  '黑色': '#000000',
  '灰': '#808080',
  '灰色': '#808080'
};

// 计算属性
const aiStatusText = computed(() => {
  switch (aiStatus.value) {
    case 'ready':
      return '已就绪';
    case 'initializing':
      return '正在初始化...';
    case 'error':
      return '服务异常';
    default:
      return '状态未知';
  }
});

// 处理用户输入
const processInput = async () => {
  if (!userInput.value.trim()) return;
  
  const input = userInput.value.trim();
  await updateColorFromInput(input, '文本输入');
  userInput.value = '';
};

// 根据输入更新颜色
const updateColorFromInput = async (input, source) => {
  // 直接颜色名称处理
  if (colorMap[input]) {
    applyColor(colorMap[input], input, source);
    return;
  }
  
  // 中文指令处理
  const colorRegex = /(?:将|把|改为|变成|设为|设置为|换成)(.+?)(?:色|颜色)?$/;
  const match = input.match(colorRegex);
  
  if (match && match[1]) {
    const color = match[1].trim();
    if (colorMap[color]) {
      applyColor(colorMap[color], color, source);
      return;
    }
  }
  
  // CSS颜色值处理(如#ff0000或rgb(255,0,0))
  if (input.startsWith('#') || input.startsWith('rgb')) {
    try {
      const tempEl = document.createElement('div');
      tempEl.style.color = input;
      document.body.appendChild(tempEl);
      const computedColor = getComputedStyle(tempEl).color;
      document.body.removeChild(tempEl);
      
      if (computedColor !== '') {
        applyColor(input, null, source);
        return;
      }
    } catch (e) {
      console.error('Invalid color format', e);
    }
  }
  
  // 使用本地AI处理器处理复杂颜色描述
  isLoading.value = true;
  message.value = '正在分析颜色...';
  isErrorMessage.value = false;
  
  try {
    // 使用AI处理器处理文本
    const result = await localAIProcessor.value.processText(input);
    
    isLoading.value = false;
    
    if (result.type === 'color' && result.value) {
      const confidence = Math.round(result.confidence * 100);
      const source = result.source.includes('siyuan') 
        ? `思源AI (${confidence}%可信度)`
        : `${result.source} (${confidence}%可信度)`;
      
      applyColor(result.value, result.description, source);
      return;
    } else {
      throw new Error(result.description || '无法识别颜色');
    }
  } catch (error) {
    isLoading.value = false;
    console.error('AI处理错误:', error);
    message.value = `无法识别颜色: "${input}"`;
    isErrorMessage.value = true;
    setTimeout(() => {
      message.value = '';
    }, 3000);
  }
};

// 应用颜色
const applyColor = (color, name, source) => {
  backgroundColor.value = color;
  colorName.value = name || color;
  
  colorHistory.value.unshift({
    color: color,
    name: name,
    source: source,
    timestamp: new Date()
  });
  
  // 限制历史记录长度
  if (colorHistory.value.length > 10) {
    colorHistory.value = colorHistory.value.slice(0, 10);
  }
  
  message.value = `颜色已更新为 ${name || color}`;
  isErrorMessage.value = false;
  setTimeout(() => {
    if (!isErrorMessage.value) message.value = '';
  }, 3000);
};

// 初始化本地AI处理器
const initLocalAIProcessor = () => {
  try {
    aiStatus.value = 'initializing';
    
    localAIProcessor.value = setupAIProcessor({
      useLocalModel: true
    });
    
    // 检查支持状态
    const supportStatus = localAIProcessor.value.checkSupport();
    
    // 更新AI状态
    if (supportStatus.siyuanAPI) {
      aiStatus.value = 'ready';
      message.value = '思源AI支持已启用';
      setTimeout(() => { message.value = ''; }, 3000);
    } else {
      aiStatus.value = 'ready';
      message.value = '仅使用本地规则';
      setTimeout(() => { message.value = ''; }, 3000);
    }
  } catch (error) {
    console.error('AI处理器初始化失败', error);
    aiStatus.value = 'error';
    message.value = '无法初始化AI处理器';
    isErrorMessage.value = true;
    setTimeout(() => { message.value = ''; }, 3000);
  }
};

// 语音识别相关
const setupSpeechRecognition = () => {
  try {
    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (window.SpeechRecognition) {
      recognition.value = new SpeechRecognition();
      recognition.value.continuous = false;
      recognition.value.interimResults = false;
      recognition.value.lang = 'zh-CN';
      
      recognition.value.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim();
        userInput.value = transcript;
        updateColorFromInput(transcript, '语音识别');
      };
      
      recognition.value.onend = () => {
        isListening.value = false;
      };
      
      recognition.value.onerror = (event) => {
        console.error('语音识别错误:', event.error);
        isListening.value = false;
        message.value = `语音识别错误: ${event.error}`;
        isErrorMessage.value = true;
        setTimeout(() => {
          message.value = '';
        }, 3000);
      };
    } else {
      message.value = '您的浏览器不支持语音识别';
      isErrorMessage.value = true;
      setTimeout(() => {
        message.value = '';
      }, 3000);
    }
  } catch (e) {
    console.error('语音识别初始化失败', e);
    message.value = '语音识别初始化失败';
    isErrorMessage.value = true;
    setTimeout(() => {
      message.value = '';
    }, 3000);
  }
};

// 切换语音识别状态
const toggleSpeechRecognition = () => {
  if (recognition.value) {
    if (isListening.value) {
      recognition.value.stop();
      isListening.value = false;
    } else {
      recognition.value.start();
      isListening.value = true;
    }
  } else {
    message.value = '语音识别不可用';
    isErrorMessage.value = true;
    setTimeout(() => {
      message.value = '';
    }, 3000);
  }
};

// 格式化时间
const formatTime = (date) => {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
};

// 工具面板状态
const showToolPanel = ref(false);

// 初始化工具面板
const initToolPanel = () => {
  try {
    // 先设置为false，确保在组件完全加载前不显示
    showToolPanel.value = false;
    
    // 使用setTimeout延迟加载，避免初始化时出现问题
    setTimeout(() => {
      try {
        console.log('尝试初始化工具面板...');
        showToolPanel.value = true;
      } catch (error) {
        console.error('延迟初始化工具面板失败:', error);
        showToolPanel.value = false;
        message.value = `工具面板加载失败: ${error.message}`;
        isErrorMessage.value = true;
      }
    }, 500);
  } catch (error) {
    console.error('初始化工具面板失败:', error);
    showToolPanel.value = false;
  }
};

// 生命周期钩子
onMounted(() => {
  setupSpeechRecognition();
  initLocalAIProcessor();
  
  // 添加全局错误处理
  originalOnError.value = window.onerror;
  window.onerror = function(msg, source, lineno, colno, error) {
    if (source && source.includes('ModelSelector') || 
        source && source.includes('ToolExecutionPanel') ||
        msg && msg.includes('setModelConfig')) {
      console.error('AI工具组件错误:', msg, source, lineno, colno, error);
      showToolPanel.value = false;
      isErrorMessage.value = true;
      message.value = `AI工具加载失败: ${error?.message || msg}`;
      setTimeout(() => { message.value = ''; }, 5000);
      return true; // 阻止默认处理
    }
    // 调用原始处理函数
    return originalOnError.value ? originalOnError.value(msg, source, lineno, colno, error) : false;
  };
  
  // 延迟初始化工具面板
  setTimeout(() => {
    initToolPanel();
  }, 1000);
  
  // 添加默认颜色到历史记录
  colorHistory.value.push({
    color: backgroundColor.value,
    name: '默认',
    source: '系统',
    timestamp: new Date()
  });
});

onUnmounted(() => {
  // 恢复原始错误处理
  window.onerror = originalOnError.value;
  
  if (recognition.value && isListening.value) {
    recognition.value.stop();
  }
});
</script>

<style scoped>
.ai-color-changer {
  width: 100%;
  height: 100%;
  min-height: 400px;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: background-color 0.5s ease;
  padding: 20px;
  box-sizing: border-box;
}

.content-wrapper {
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  padding: 20px;
  width: 80%;
  max-width: 800px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

h2 {
  text-align: center;
  margin-bottom: 20px;
  color: #333;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
}

.input-section {
  display: flex;
  gap: 10px;
}

input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

button {
  padding: 10px 15px;
  background-color: #4285f4;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #3367d6;
}

button.recording {
  background-color: #ea4335;
}

.status-indicator {
  color: #ea4335;
  font-size: 14px;
  margin-top: 5px;
  animation: pulse 1.5s infinite;
}

.ai-status {
  background-color: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-label {
  font-size: 14px;
  color: #333;
}

.status-value {
  font-size: 14px;
  color: #4285f4;
  font-weight: 500;
}

.color-display {
  margin: 20px 0;
  padding: 15px;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.current-color {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-preview {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid #ddd;
}

.history {
  margin-top: 20px;
}

.history h3 {
  font-size: 16px;
  margin-bottom: 10px;
  color: #555;
}

.history ul {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
}

.history li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
  font-size: 14px;
}

.timestamp {
  color: #888;
  font-size: 12px;
}

.color-sample {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid #ddd;
}

.source {
  font-size: 12px;
  color: #888;
  margin-left: auto;
}

.message {
  margin-top: 20px;
  padding: 10px;
  text-align: center;
  background-color: #e8f0fe;
  border-radius: 4px;
  color: #1a73e8;
}

.message.error {
  background-color: #fce8e6;
  color: #ea4335;
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
  color: #666;
  font-size: 14px;
}

.loading-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #4285f4;
  animation: spin 1s ease-in-out infinite;
}

/* 添加工具面板样式 */
.tool-panel-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.tool-panel-section h3 {
  text-align: center;
  margin-bottom: 20px;
  color: #333;
}

.tool-placeholder {
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 4px;
  text-align: center;
  color: #666;
}

.tool-placeholder p {
  margin: 5px 0;
}

.retry-btn {
  padding: 10px 20px;
  background-color: #4285f4;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.retry-btn:hover {
  background-color: #3367d6;
}

@keyframes pulse {
  0% { opacity: 0.5; }
  50% { opacity: 1; }
  100% { opacity: 0.5; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style> 