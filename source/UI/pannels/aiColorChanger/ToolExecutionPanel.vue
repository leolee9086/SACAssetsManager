<template>
  <div class="tool-execution-panel">
    <h2>AI工具指令面板</h2>
    
    <div class="input-section">
      <textarea 
        v-model="userInput" 
        placeholder="输入指令，例如：把这段话扩充一下记到日记里：今天学习了AI工具调用"
        rows="3"
        :disabled="isProcessing"
      ></textarea>
      <div class="button-row">
        <button class="execute-btn" @click="executeCommand" :disabled="isProcessing || !userInput.trim()">
          {{ isProcessing ? '处理中...' : '执行' }}
        </button>
        <button class="clear-btn" @click="clearAll" :disabled="isProcessing">
          清除全部
        </button>
      </div>
    </div>
    
    <div class="model-settings">
      <div class="settings-header" @click="toggleSettingsPanel">
        <h3>高级选项 <span class="toggle-icon">{{ isSettingsPanelOpen ? '▼' : '▶' }}</span></h3>
      </div>
      
      <div class="settings-content" v-if="isSettingsPanelOpen">
        <ModelSelector @config-changed="handleModelConfigChange" />
      </div>
    </div>
    
    <div class="examples-section">
      <h3>示例指令</h3>
      <div class="example-commands">
        <div class="example-command" @click="fillExample('把这段话扩充一下：今天学习了如何使用AI工具')">
          扩充内容：今天学习了如何使用AI工具
        </div>
        <div class="example-command" @click="fillExample('记到日记里：尝试了新的工作方法，效率提高了')">
          写入日记：尝试了新的工作方法，效率提高了
        </div>
      </div>
    </div>
    
    <div class="result-section" v-if="result || isStreaming || historyItems.length > 0">
      <h3>执行历史 <span v-if="isStreaming" class="streaming-indicator">实时生成中...</span></h3>
      
      <div class="chat-history">
        <div v-for="(item, index) in historyItems" :key="index" class="history-item">
          <div class="user-message">
            <div class="message-avatar">用户</div>
            <div class="message-content">{{ item.input }}</div>
          </div>
          <div class="assistant-message">
            <div class="message-avatar">AI</div>
            <div class="message-content" v-html="formatMessage(item.output)"></div>
          </div>
        </div>
        
        <div v-if="isStreaming || (result && !hasAddedToHistory)" class="current-interaction">
          <div class="user-message">
            <div class="message-avatar">用户</div>
            <div class="message-content">{{ userInput }}</div>
          </div>
          <div class="assistant-message">
            <div class="message-avatar">AI</div>
            <div class="message-content" v-html="formattedResult"></div>
            <div v-if="isStreaming" class="streaming-cursor"></div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="status-message" :class="{ error: isErrorMessage }" v-if="statusMessage">
      {{ statusMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { processToolCommand, toolManager } from './toolCommandProcessor.js';
import ModelSelector from './ModelSelector.vue';

const userInput = ref('');
const isProcessing = ref(false);
const result = ref(null);
const streamingResult = ref('');
const isStreaming = ref(false);
const statusMessage = ref('');
const isErrorMessage = ref(false);
const isSettingsPanelOpen = ref(false);
const historyItems = ref([]);
const hasAddedToHistory = ref(true);

// 格式化结果，支持流式内容
const formattedResult = computed(() => {
  // 如果正在流式生成，显示流式内容
  if (isStreaming.value) {
    return streamingResult.value.replace(/\n/g, '<br>');
  }
  
  // 否则显示最终结果
  if (!result.value) return '';
  return result.value.replace(/\n/g, '<br>');
});

// 处理流式响应进度
const handleProgress = (progress) => {
  if (!isStreaming.value) {
    isStreaming.value = true;
    streamingResult.value = ''; // 重置流式内容
  }
  
  if (progress.type === 'progress' || progress.type === 'query-progress') {
    // 直接设置流式内容，而不是累加
    streamingResult.value = progress.content;
  }
};

// 格式化消息，支持流式内容
const formatMessage = (message) => {
  if (!message) return '';
  return message.replace(/\n/g, '<br>');
};

// 执行命令
const executeCommand = async () => {
  if (!userInput.value.trim()) {
    statusMessage.value = '请输入指令';
    isErrorMessage.value = true;
    setTimeout(() => { statusMessage.value = ''; }, 3000);
    return;
  }
  
  isProcessing.value = true;
  isStreaming.value = false;
  streamingResult.value = '';
  statusMessage.value = '正在处理您的请求...';
  isErrorMessage.value = false;
  hasAddedToHistory.value = false;
  
  try {
    // 传入进度回调以支持流式响应
    const response = await processToolCommand(userInput.value, handleProgress);
    
    // 流式生成完成后
    isStreaming.value = false;
    
    if (response.type === 'tool-execution') {
      if (response.result.success) {
        result.value = response.result.message;
        statusMessage.value = `${getToolDisplayName(response.toolName)}执行成功`;
      } else {
        result.value = response.result.message;
        statusMessage.value = `执行失败: ${response.result.message}`;
        isErrorMessage.value = true;
      }
    } else {
      result.value = response.content;
      statusMessage.value = '查询处理完成';
    }
    
    // 添加到历史
    historyItems.value.push({
      input: userInput.value,
      output: result.value
    });
    hasAddedToHistory.value = true;
    
    // 清空输入
    userInput.value = '';
  } catch (error) {
    console.error('命令执行错误:', error);
    isStreaming.value = false;
    statusMessage.value = `执行错误: ${error.message}`;
    isErrorMessage.value = true;
  } finally {
    isProcessing.value = false;
    setTimeout(() => {
      if (!isErrorMessage.value) statusMessage.value = '';
    }, 3000);
  }
};

// 获取工具显示名称
const getToolDisplayName = (toolName) => {
  const toolNames = {
    'writeToJournal': '写入日记',
    'expandText': '扩充内容'
  };
  
  return toolNames[toolName] || toolName;
};

// 清除结果
const clearResult = () => {
  result.value = null;
  streamingResult.value = '';
  isStreaming.value = false;
  statusMessage.value = '';
};

// 清除所有内容
const clearAll = () => {
  clearResult();
  historyItems.value = [];
  userInput.value = '';
};

// 填充示例
const fillExample = (example) => {
  userInput.value = example;
};

// 切换设置面板的显示/隐藏
const toggleSettingsPanel = () => {
  isSettingsPanelOpen.value = !isSettingsPanelOpen.value;
};

// 组件挂载时初始化
onMounted(() => {
  console.log('ToolExecutionPanel组件挂载，初始化模型配置');
  
  // 初始化模型配置为全局模型
  if (toolManager && typeof toolManager.setModelConfig === 'function') {
    try {
      // 默认使用全局模型设置
      const initialConfig = { useGlobal: true, temperature: 0.7, maxContexts: 1 };
      console.log('设置初始模型配置:', initialConfig);
      
      // 设置初始模型配置
      toolManager.setModelConfig(initialConfig);
      
      // 验证配置是否正确应用
      const appliedConfig = toolManager.getModelConfig ? toolManager.getModelConfig() : null;
      console.log('初始化后的模型配置:', appliedConfig);
      
      // 如果配置与期望不符，发出警告
      if (!appliedConfig || appliedConfig.useGlobal !== true) {
        console.warn('初始模型配置可能未正确应用');
      }
    } catch (error) {
      console.error('初始化模型配置失败:', error);
    }
  } else {
    console.error('toolManager未定义或setModelConfig方法不存在');
  }
});

// 处理模型配置变更
const handleModelConfigChange = (config) => {
  console.log('模型配置变更:', config);
  
  if (toolManager && typeof toolManager.setModelConfig === 'function') {
    try {
      // 在设置前确保配置对象的完整性
      const fullConfig = {
        // 基础设置
        useGlobal: Boolean(config.useGlobal),
        temperature: Number(config.temperature || 0.7),
        maxContexts: Number(config.maxContexts || 1),
        
        // 自定义API设置
        useCustomApiSettings: Boolean(config.useCustomApiSettings),
        
        // 仅当相关字段存在时才添加
        ...(config.customApiEndpoint ? { customApiEndpoint: config.customApiEndpoint } : {}),
        ...(config.customApiKey ? { customApiKey: config.customApiKey } : {}),
        ...(config.customModelName ? { customModelName: config.customModelName } : {}),
        
        // 模型特定设置
        ...(config.model ? { model: config.model } : {}),
        ...(config.providerId ? { providerId: config.providerId } : {}),
        ...(config.modelId ? { modelId: config.modelId } : {})
      };
      
      console.log('处理后的完整配置:', fullConfig);
      
      // 应用配置
      toolManager.setModelConfig(fullConfig);
      
      // 设置完成后打印当前配置进行验证
      const currentConfig = toolManager.getModelConfig ? toolManager.getModelConfig() : 'getModelConfig不可用';
      console.log('当前模型配置:', currentConfig);
      
      // 判断配置是否正确应用
      const configApplied = 
        (currentConfig.useGlobal === fullConfig.useGlobal) && 
        (currentConfig.temperature === fullConfig.temperature) &&
        (currentConfig.useCustomApiSettings === fullConfig.useCustomApiSettings);
      
      console.log('配置是否正确应用:', configApplied);
      
      // 提示用户
      if (config.useCustomApiSettings) {
        statusMessage.value = `已设置自定义API: ${config.customApiEndpoint ? '✓端点 ' : ''}${config.customApiKey ? '✓密钥 ' : ''}${config.customModelName ? '✓模型' : ''}`;
      } else if (!config.useGlobal) {
        statusMessage.value = `已选择模型: ${config.model || '未知模型'}`;
      } else {
        statusMessage.value = '已切换至全局模型';
      }
      setTimeout(() => { statusMessage.value = ''; }, 3000);
    } catch (error) {
      console.error('设置模型配置失败:', error);
      statusMessage.value = `模型配置变更失败：${error.message}`;
      isErrorMessage.value = true;
      setTimeout(() => { statusMessage.value = ''; }, 3000);
    }
  } else {
    console.error('toolManager未定义或setModelConfig方法不存在');
    statusMessage.value = '模型配置变更失败：toolManager未正确初始化';
    isErrorMessage.value = true;
    setTimeout(() => { statusMessage.value = ''; }, 3000);
  }
};
</script>

<style scoped>
.tool-execution-panel {
  padding: 20px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  max-width: 800px;
  margin: 0 auto;
}

h2 {
  margin-top: 0;
  color: #333;
  text-align: center;
  margin-bottom: 20px;
}

h3 {
  color: #555;
  margin: 15px 0 10px;
  font-size: 16px;
  display: flex;
  align-items: center;
}

.streaming-indicator {
  font-size: 14px;
  color: #4285f4;
  margin-left: 10px;
  font-weight: normal;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}

.input-section {
  margin-bottom: 20px;
}

textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
  font-size: 14px;
  min-height: 80px;
  margin-bottom: 10px;
  box-sizing: border-box;
  transition: border-color 0.3s;
}

textarea:focus {
  border-color: #4285f4;
  outline: none;
}

.button-row {
  display: flex;
  gap: 10px;
}

button {
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.execute-btn {
  background-color: #4285f4;
  color: white;
  flex: 1;
}

.execute-btn:hover:not(:disabled) {
  background-color: #3367d6;
}

.clear-btn {
  background-color: #f5f5f5;
  color: #555;
  width: 80px;
}

.clear-btn:hover:not(:disabled) {
  background-color: #e8e8e8;
}

.model-settings {
  margin-bottom: 20px;
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
}

.settings-header {
  padding: 10px 16px;
  background-color: #f9f9f9;
  cursor: pointer;
  user-select: none;
}

.settings-header h3 {
  margin: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toggle-icon {
  font-size: 12px;
  color: #666;
}

.settings-content {
  padding: 16px;
  border-top: 1px solid #eee;
}

.examples-section {
  margin-bottom: 20px;
  background-color: #f9f9f9;
  padding: 12px;
  border-radius: 4px;
}

.example-commands {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.example-command {
  background-color: #e8f0fe;
  color: #4285f4;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.example-command:hover {
  background-color: #d2e3fc;
}

.result-section {
  margin-top: 20px;
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 8px;
  max-height: 400px;
  overflow-y: auto;
  position: relative;
}

.chat-history {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.history-item, .current-interaction {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-message, .assistant-message {
  display: flex;
  gap: 10px;
  padding: 8px 0;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}

.user-message .message-avatar {
  background-color: #e1f5fe;
  color: #0277bd;
}

.assistant-message .message-avatar {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.message-content {
  flex: 1;
  padding: 10px 14px;
  border-radius: 8px;
  line-height: 1.5;
  font-size: 14px;
  white-space: pre-wrap;
}

.user-message .message-content {
  background-color: #e8eaf6;
  color: #3949ab;
}

.assistant-message .message-content {
  background-color: #ffffff;
  color: #333;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

textarea:disabled {
  background-color: #f9f9f9;
  cursor: not-allowed;
}

@keyframes blink {
  from, to { opacity: 0; }
  50% { opacity: 1; }
}

.streaming-cursor {
  display: inline-block;
  width: 2px;
  height: 16px;
  background-color: #4285f4;
  margin-left: 2px;
  vertical-align: middle;
  animation: blink 1s step-end infinite;
}

.status-message {
  margin-top: 15px;
  padding: 10px;
  background-color: #e6f4ea;
  color: #137333;
  border-radius: 4px;
  font-size: 14px;
  text-align: center;
}

.status-message.error {
  background-color: #fce8e6;
  color: #c5221f;
}
</style> 