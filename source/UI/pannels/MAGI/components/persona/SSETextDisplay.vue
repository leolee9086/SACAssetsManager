<template>
  <div class="sse-display">
    <div class="sse-content">
      <div class="header-container">
        <h3>{{ systemName }} 提示词生成</h3>
        <button 
          v-if="!isGenerating" 
          @click="handleGenerate" 
          class="generate-button"
          :disabled="isGenerating"
        >
          {{ textContent ? '重新生成' : '开始生成' }}
        </button>
        <div v-else class="generating-indicator">
          生成中...
        </div>
      </div>
      <div class="text-container" ref="textContainerRef">
        <template v-if="isGenerating">
          <p class="content">{{ textContent }}</p>
          <div class="generating-indicator">
            <span class="generating-dots"></span>
          </div>
        </template>
        
        <template v-else>
          <p v-if="error" class="error-message">{{ error }}</p>
          <p v-else-if="textContent" class="content">{{ textContent }}</p>
          <p v-else class="placeholder">点击"开始生成"按钮生成提示词</p>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed } from 'vue';
import { AISSEConversation } from '../../../../../../src/toolBox/feature/useOpenAI/useOpenAISSE.js';

const props = defineProps({
  systemName: {
    type: String,
    required: true
  },
  promptContent: {
    type: String,
    required: true
  },
  apiConfig: {
    type: Object,
    default: () => ({
      apiKey: 'sk-aqvyijgfetcswtdfofouewfrwdezezcpmfacweaerlhpwkeg',
      model: 'deepseek-ai/DeepSeek-V3',
      endpoint: 'https://api.siliconflow.cn/v1/',
      temperature: 0.7,
      max_tokens: 4096
    })
  }
});

const emit = defineEmits(['generationComplete']);

const textContent = ref('');
const isGenerating = ref(false);
const error = ref('');

// 添加DOM引用
const textContainerRef = ref(null);

const hasContent = computed(() => textContent.value.trim().length > 0);

const handleGenerate = async () => {
  if (isGenerating.value) return;

  try {
    isGenerating.value = true;
    textContent.value = '';
    error.value = '';

    const aiConversation = new AISSEConversation(props.apiConfig);
    const sseSource = await aiConversation.getSSECompletion({
      messages: [{ role: 'user', content: props.promptContent }]
    });

    // 使用数组存储并强制更新
    const contentChunks = [];
    for await (const chunk of sseSource) {
      if (chunk.content) {
        contentChunks.push(chunk.content);
        // 使用slice创建新数组触发响应式更新
        textContent.value = contentChunks.slice().join('');
        
        // 强制DOM更新
        await nextTick();
        
        // 使用Vue ref获取容器
        const container = textContainerRef.value;
        if (container) {
          requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight;
          });
        }
      }
    }

    emit('generationComplete', {
      system: props.systemName,
      content: textContent.value
    });

  } catch (err) {
    error.value = `生成错误: ${err.message}`;
    console.error('生成错误:', err);
  } finally {
    isGenerating.value = false;
  }
};

// 暴露属性给父组件
defineExpose({
  hasContent,
  textContent
});
</script>

<style scoped>
.sse-display {
  margin: 1rem 0;
}

.sse-content {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: rgba(20, 30, 40, 0.8);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.generate-button {
  padding: 0.5rem 1rem;
  background: linear-gradient(145deg, rgba(0, 255, 255, 0.2), rgba(0, 150, 200, 0.2));
  border: 1px solid rgba(0, 255, 255, 0.4);
  border-radius: 4px;
  color: #fff;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.generate-button:hover {
  background: linear-gradient(145deg, rgba(0, 255, 255, 0.3), rgba(0, 150, 200, 0.3));
  box-shadow: 0 4px 8px rgba(0, 255, 255, 0.2);
  transform: translateY(-1px);
}

.sse-content h3 {
  color: rgba(0, 255, 255, 0.9);
  margin-bottom: 1.5rem;
  font-size: 1.2rem;
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.3);
}

.text-container {
  min-height: 200px;
  max-height: 400px;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 255, 255, 0.1);
  border-radius: 6px;
  overflow-y: auto;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);
}

.text-container p {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.error-message {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(255, 0, 0, 0.1);
  border: 1px solid rgba(255, 0, 0, 0.3);
  border-radius: 6px;
  color: #ff4444;
}

/* 滚动条样式 */
.text-container::-webkit-scrollbar {
  width: 8px;
}

.text-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}

.text-container::-webkit-scrollbar-thumb {
  background: rgba(0, 255, 255, 0.3);
  border-radius: 4px;
}

.text-container::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 255, 255, 0.5);
}

.generating-indicator {
  position: sticky;
  bottom: 10px;
  margin-top: 1rem;
  color: rgba(0, 255, 255, 0.8);
  display: flex;
  justify-content: flex-end;
}

.generating-dots {
  display: inline-block;
  width: 60px;
  background: rgba(0, 0, 0, 0.3);
  padding: 0.3rem 0.8rem;
  border-radius: 4px;
  animation: dots 1.5s infinite;
}

@keyframes dots {
  0% { content: '.'; }
  33% { content: '..'; }
  66% { content: '...'; }
  100% { content: '.'; }
}

.content {
  white-space: pre-wrap;
  word-break: break-word;
  min-height: 1.2em; /* 保证空内容时的高度 */
}

/* 添加占位符样式 */
.placeholder {
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
  font-style: italic;
}
</style> 