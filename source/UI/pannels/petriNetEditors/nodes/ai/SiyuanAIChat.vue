<template>
  <div class="siyuan-ai-chat-node">
    <div class="chat-header">
      <h3>思源AI聊天</h3>
      <div class="status-indicator" :class="{ 
        'ready': !isLoading && !hasError, 
        'loading': isLoading,
        'error': hasError 
      }">
        {{ statusText }}
      </div>
    </div>
    
    <div class="chat-body">
      <div class="system-prompt">
        <div class="prompt-label">系统提示词：</div>
        <div class="prompt-value">{{ systemPrompt || '(无系统提示词)' }}</div>
      </div>
      
      <div class="message-list">
        <div v-if="chatHistory.length === 0" class="empty-history">
          等待输入...
        </div>
        <div v-else class="history-container">
          <div 
            v-for="(message, index) in chatHistory" 
            :key="index" 
            :class="['message', message.role]"
          >
            <div class="message-role">{{ getRoleName(message.role) }}</div>
            <div class="message-content">{{ message.content }}</div>
          </div>
        </div>
      </div>
      
      <div v-if="activeRequest" class="active-request">
        <div class="request-prompt">
          <div class="prompt-label">当前请求：</div>
          <div class="prompt-value">{{ activeRequest }}</div>
        </div>
        <div class="timer" v-if="isLoading">
          处理中 {{ elapsedTime }}s
        </div>
      </div>
    </div>
    
    <div class="chat-footer">
      <button 
        @click="clearChat" 
        class="clear-button"
        :disabled="isLoading || chatHistory.length === 0"
      >
        清空对话
      </button>
    </div>
  </div>
</template>

<script nodeDefine>
import { ref, reactive, computed,onMounted,onBeforeUnmount } from 'vue';
import { getLocalSiyuanAIConfig } from '../../../../../../src/toolBox/useAge/forSiyuan/forAI/fromLocalSiyuanAI.js';
import { computeNormalAIChat } from '../../../../../../src/toolBox/useAge/forSiyuan/forAI/forNormalChat.js';

// 节点状态
export const nodeDataState = {
  // 状态标志
  isLoading: ref(false),
  hasError: ref(false),
  errorMessage: ref(''),
  
  // 聊天相关
  chatHistory: reactive([]),
  systemPrompt: ref(''),
  activeRequest: ref(''),
  aiConfig: ref(null),
  
  // 计时器相关
  startTime: ref(0),
  elapsedTime: ref(0),
  timer: ref(null),
  
  // 处理中的请求
  pendingPromise: ref(null)
};

// 计算属性
export const statusText = computed(() => {
  if (nodeDataState.hasError.value) return '错误：' + nodeDataState.errorMessage.value;
  if (nodeDataState.isLoading.value) return '处理中...';
  return '就绪';
});

// 获取角色名称
export const getRoleName = (role) => {
  switch (role) {
    case 'system': return '系统';
    case 'user': return '用户';
    case 'assistant': return 'AI';
    default: return role;
  }
};

// 移除think标签
export const removeThinkTags = (text) => {
  if (!text) return '';
  return text.replace(/<think>([\s\S]*?)<\/think>/g, '');
};

// 启动计时器
export const startTimer = () => {
  // 清除可能存在的旧计时器
  if (nodeDataState.timer.value) {
    clearInterval(nodeDataState.timer.value);
  }
  
  nodeDataState.startTime.value = Date.now();
  nodeDataState.elapsedTime.value = 0;
  
  nodeDataState.timer.value = setInterval(() => {
    nodeDataState.elapsedTime.value = ((Date.now() - nodeDataState.startTime.value) / 1000).toFixed(1);
  }, 100);
};

// 停止计时器
export const stopTimer = () => {
  if (nodeDataState.timer.value) {
    clearInterval(nodeDataState.timer.value);
    nodeDataState.timer.value = null;
  }
};

// 发送聊天请求
export const sendChatRequest = async (prompt, systemPrompt = '', aiConfig = null) => {
  // 如果有未完成的请求，则返回该Promise
  if (nodeDataState.pendingPromise.value) {
    return nodeDataState.pendingPromise.value;
  }
  
  try {
    nodeDataState.isLoading.value = true;
    nodeDataState.hasError.value = false;
    nodeDataState.errorMessage.value = '';
    nodeDataState.activeRequest.value = prompt;
    
    // 启动计时器
    startTimer();
    
    // 构建消息数组
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    // 添加历史消息
    nodeDataState.chatHistory.forEach(msg => {
      messages.push(msg);
    });
    
    // 添加当前用户消息
    messages.push({ role: 'user', content: prompt });
    
    // 更新聊天历史
    nodeDataState.chatHistory.push({ role: 'user', content: prompt });
    
    // 创建请求Promise
    const promise = new Promise(async (resolve, reject) => {
      try {
        // 使用思源AI发送请求
        const response = await computeNormalAIChat(
          messages,
          aiConfig?.apiConfig || {},
          { force: true }
        );
        
        // 添加助手回复到历史
        const assistantMessage = { role: 'assistant', content: response };
        nodeDataState.chatHistory.push(assistantMessage);
        
        // 返回结果
        resolve({
          fullText: response,
          cleanText: removeThinkTags(response),
          chatHistory: [...nodeDataState.chatHistory],
          aiConfig: nodeDataState.aiConfig.value
        });
      } catch (error) {
        nodeDataState.hasError.value = true;
        nodeDataState.errorMessage.value = error.message || '请求失败';
        reject(error);
      } finally {
        nodeDataState.isLoading.value = false;
        nodeDataState.activeRequest.value = '';
        stopTimer();
        nodeDataState.pendingPromise.value = null;
      }
    });
    
    // 存储当前Promise
    nodeDataState.pendingPromise.value = promise;
    
    return promise;
  } catch (error) {
    nodeDataState.hasError.value = true;
    nodeDataState.errorMessage.value = error.message || '请求失败';
    stopTimer();
    nodeDataState.pendingPromise.value = null;
    throw error;
  }
};

// 清空聊天历史
export const clearChat = () => {
  nodeDataState.chatHistory.length = 0;
  nodeDataState.activeRequest.value = '';
};

// 定义节点
export const nodeDefine = {
  flowType: "provider",
  inputs: {
    prompt: {
      type: 'string',
      label: '用户输入',
      required: true,
      description: '用户的提问或指令'
    },
    systemPrompt: {
      type: 'string',
      label: '系统提示词',
      required: false,
      description: '系统提示词，用于指导AI回答'
    },
    aiConfig: {
      type: 'object',
      label: 'AI配置',
      required: false,
      description: 'AI配置对象，可以从SiyuanAIConfig节点获取'
    }
  },
  outputs: {
    fullText: {
      type: 'string',
      label: '完整文本',
      description: 'AI回复的完整文本内容'
    },
    cleanText: {
      type: 'string',
      label: '清理后文本',
      description: '去除think标签后的文本'
    },
    chatHistory: {
      type: 'array',
      label: '对话历史',
      description: '完整的对话历史记录'
    },
    aiConfig: {
      type: 'object',
      label: 'AI配置',
      description: '使用的AI配置对象'
    },
    responsePromise: {
      type: 'promise',
      label: '响应Promise',
      description: '表示请求进度的Promise对象'
    }
  },
  
  async process(inputs) {
    try {
      // 获取输入
      const prompt = inputs.prompt?.value || inputs.prompt;
      const systemPrompt = inputs.systemPrompt?.value || inputs.systemPrompt || nodeDataState.systemPrompt.value;
      const aiConfig = inputs.aiConfig?.value || inputs.aiConfig;
      
      // 保存系统提示词和AI配置
      nodeDataState.systemPrompt.value = systemPrompt;
      nodeDataState.aiConfig.value = aiConfig;
      
      // 如果没有提示词，返回空结果
      if (!prompt || typeof prompt !== 'string') {
        return {
          fullText: '',
          cleanText: '',
          chatHistory: [...nodeDataState.chatHistory],
          aiConfig: nodeDataState.aiConfig.value,
          responsePromise: Promise.resolve(null)
        };
      }
      
      // 发送请求
      const responsePromise = sendChatRequest(prompt, systemPrompt, aiConfig);
      
      // 直接返回Promise对象，让调用者决定是否等待
      return {
        responsePromise,
        // 初始值
        fullText: '',
        cleanText: '',
        chatHistory: [...nodeDataState.chatHistory],
        aiConfig: nodeDataState.aiConfig.value
      };
    } catch (error) {
      console.error('AI聊天处理失败:', error);
      nodeDataState.hasError.value = true;
      nodeDataState.errorMessage.value = error.message || '未知错误';
      
      // 返回错误Promise
      return {
        fullText: '',
        cleanText: '',
        chatHistory: [...nodeDataState.chatHistory],
        aiConfig: nodeDataState.aiConfig.value,
        responsePromise: Promise.reject(error)
      };
    }
  }
};

// 默认输入
export const getDefaultInput = () => ({
  prompt: '',
  systemPrompt: nodeDataState.systemPrompt.value,
  aiConfig: nodeDataState.aiConfig.value
});
</script>

<script setup>

// 解构状态变量，便于模板使用
const { 
  isLoading, 
  hasError,
  chatHistory, 
  systemPrompt,
  activeRequest,
  elapsedTime
} = nodeDataState;

// 在组件卸载前清理计时器
onBeforeUnmount(() => {
  if (nodeDataState.timer.value) {
    clearInterval(nodeDataState.timer.value);
    nodeDataState.timer.value = null;
  }
});

// 初始化默认AI配置
onMounted(async () => {
  try {
    const config = getLocalSiyuanAIConfig();
    if (config && config.apiConfig) {
      nodeDataState.aiConfig.value = config;
    }
  } catch (error) {
    console.error('初始化AI配置失败:', error);
  }
});
</script>

<style scoped>
.siyuan-ai-chat-node {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(30, 35, 45, 0.9);
  border-radius: 8px;
  overflow: hidden;
  padding: 12px;
  font-family: system-ui, -apple-system, sans-serif;
  color: #d8e1ef;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(70, 130, 200, 0.3);
}

.chat-header h3 {
  margin: 0;
  color: rgba(70, 180, 255, 0.9);
  font-size: 16px;
  font-weight: 500;
}

.status-indicator {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  background: rgba(70, 70, 70, 0.4);
  color: #aaaaaa;
}

.status-indicator.ready {
  background: rgba(0, 100, 0, 0.2);
  color: #8eff8e;
}

.status-indicator.loading {
  background: rgba(255, 180, 0, 0.2);
  color: #ffd280;
}

.status-indicator.error {
  background: rgba(150, 0, 0, 0.3);
  color: #ff6b6b;
}

.chat-body {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}

.system-prompt {
  background: rgba(45, 50, 65, 0.5);
  border-radius: 6px;
  padding: 8px;
  font-size: 13px;
}

.prompt-label {
  font-weight: 500;
  color: rgba(150, 200, 255, 0.7);
  margin-bottom: 4px;
}

.prompt-value {
  color: rgba(210, 230, 255, 0.9);
  font-style: italic;
  white-space: pre-wrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-height: 60px;
}

.message-list {
  flex-grow: 1;
  overflow-y: auto;
  background: rgba(40, 45, 60, 0.4);
  border-radius: 6px;
  padding: 8px;
  max-height: 140px;
}

.empty-history {
  color: #888;
  font-style: italic;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.history-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message {
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 13px;
}

.message.user {
  background: rgba(60, 80, 120, 0.3);
  align-self: flex-end;
  margin-left: 20%;
}

.message.assistant {
  background: rgba(50, 70, 50, 0.3);
  align-self: flex-start;
  margin-right: 20%;
}

.message.system {
  background: rgba(80, 60, 100, 0.3);
  font-style: italic;
}

.message-role {
  font-size: 11px;
  margin-bottom: 3px;
  color: rgba(180, 200, 220, 0.7);
  font-weight: 500;
}

.message-content {
  white-space: pre-wrap;
  word-break: break-word;
}

.active-request {
  background: rgba(50, 60, 80, 0.4);
  border-radius: 6px;
  padding: 8px;
  margin-top: 8px;
}

.timer {
  margin-top: 6px;
  text-align: right;
  font-size: 12px;
  color: #ffd280;
}

.chat-footer {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}

.clear-button {
  background: rgba(80, 50, 50, 0.4);
  color: rgba(255, 200, 200, 0.9);
  border: 1px solid rgba(150, 60, 60, 0.4);
  border-radius: 4px;
  padding: 5px 12px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-button:hover:not(:disabled) {
  background: rgba(100, 50, 50, 0.5);
}

.clear-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style> 