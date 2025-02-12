<template>
  <div class="container">
    <h1>Transformers.js 管线测试</h1>
    <div class="form-group">
      <label for="task">选择任务:</label>
      <select id="task" v-model="selectedTask">
        <option v-for="task in tasks" :key="task" :value="task">{{ task }}</option>
      </select>
    </div>
    <div class="form-group">
      <label for="input">输入:</label>
      <textarea v-if="isTextTask" id="input" v-model="inputText" placeholder="请输入文本或URL"></textarea>
      <input v-else type="file" id="input" @change="handleFileUpload" accept="image/*" />
    </div>
    <div class="form-group">
      <label for="model">模型:</label>
      <input id="model" v-model="modelName" placeholder="请输入模型名称（可选）" />
    </div>
    <button @click="runPipeline">运行管线</button>
    <div v-if="result" class="result">
      <h2>结果:</h2>
      <pre>{{ result }}</pre>
    </div>
    <div v-if="progress.total > 0" class="progress-container">
      <div class="progress-bar" :style="{width: progress.percentage + '%'}"></div>
      <div class="progress-stats">
        已处理: {{ progress.processed }} / {{ progress.total }} 
        失败: {{ progress.failed }}
        剩余: {{ progress.remaining }}
        <div class="speed-stats">处理速度: {{ progress.charactersPerSecond || 0 }} 字/秒</div>
      </div>
    </div>
    <div class="embedding-section">
      <button 
        @click="startEmbedding" 
        :disabled="isProcessing"
        class="embedding-button"
      >
        {{ isProcessing ? '处理中...' : '开始嵌入处理' }}
      </button>
    </div>
    <div v-if="hasFirstEmbedding || hasEmbeddings" class="query-section">
      <h2>向量查询</h2>
      <div class="form-group">
        <textarea 
          v-model="queryText" 
          placeholder="请输入查询文本"
          class="query-input"
        ></textarea>
        <button 
          @click="performQuery" 
          :disabled="isQuerying"
          class="query-button"
        >
          {{ isQuerying ? '查询中...' : '搜索相似内容' }}
        </button>
      </div>
      
      <div v-if="queryResults.length > 0" class="query-results">
        <h3>查询结果：</h3>
        <div v-for="(item, index) in queryResults" :key="index" class="result-item">
          <div class="result-score">相似度：{{ (item.score * 100).toFixed(2) }}%</div>
          <div class="result-content">{{ item.content }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { tasks, runPipeline as executePipeline } from './pipelineManager.js';
import { createEmbeddingIterator, queryEmbeddings } from './glob.js';
import kernelApi from '../../../polyfills/kernelApi.js'
import { enrichResultsWithContent } from './blockUtils.js';

const ORT_SYMBOL = Symbol.for('onnxruntime');
globalThis[ORT_SYMBOL] = window.require('D:/思源主库/data/plugins/SACAssetsManager/node_modules/onnxruntime-node');
console.log( globalThis[ORT_SYMBOL])

// 状态定义
const selectedTask = ref('image-classification');
const inputText = ref('');
const inputFile = ref(null);
const modelName = ref('');
const result = ref(null);
const transformedContent = ref('');
const progress = ref({
  total: 0,
  processed: 0,
  failed: 0,
  remaining: 0,
  percentage: 0
});
const isProcessing = ref(false);
const hasEmbeddings = ref(false);
const hasFirstEmbedding = ref(false);
const queryText = ref('');
const queryResults = ref([]);
const isQuerying = ref(false);

// 计算属性
const isTextTask = computed(() => {
  return !selectedTask.value.startsWith('image') && 
         !selectedTask.value.startsWith('video') &&
         !selectedTask.value.startsWith('document');
});

// 方法定义
const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      inputFile.value = e.target.result; // 存储为 base64 URL
    };
    reader.readAsDataURL(file);
  }
};

const runPipeline = async () => {
  try {
    const input = isTextTask.value ? inputText.value : inputFile.value;
    result.value = await executePipeline(
      selectedTask.value,
      modelName.value,
      input
    );
  } catch (error) {
    console.error(error)
    result.value = error.message;
  }
};

const startEmbedding = async () => {
  isProcessing.value = true;
  progress.value = {
    total: 0,
    processed: 0,
    failed: 0,
    remaining: 0,
    percentage: 0
  };

  try {
    const iterator = createEmbeddingIterator();
    progress.value.total = iterator.progress.total;

    // 监听第一个嵌入完成事件
    iterator.on('firstEmbeddingComplete', () => {
      hasFirstEmbedding.value = true;
    });

    for await (const currentProgress of iterator) {
      progress.value = currentProgress;
    }
    
    hasEmbeddings.value = true;
  } catch (error) {
    console.error('嵌入处理出错:', error);
  } finally {
    isProcessing.value = false;
  }
};

const performQuery = async () => {
  if (!queryText.value.trim()) return;
  
  isQuerying.value = true;
  try {
    const results = await queryEmbeddings(queryText.value);
    // 使用工具函数获取完整内容
    queryResults.value = await enrichResultsWithContent(results);
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    isQuerying.value = false;
  }
};

</script>

<style>
.container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
}

select, textarea, input {
  width: 100%;
  padding: 8px;
  margin-bottom: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

button {
  padding: 10px 15px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #0056b3;
}

.result {
  margin-top: 20px;
  padding: 10px;
  background-color: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 4px;
}

pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}

.progress-container {
  margin-top: 20px;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar {
  height: 20px;
  background-color: #007bff;
  transition: width 0.3s ease;
}

.progress-stats {
  padding: 10px;
  background-color: #f9f9f9;
  font-size: 0.9em;
  color: #666;
}

.speed-stats {
  margin-top: 5px;
  color: #28a745;
  font-weight: bold;
}

.embedding-section {
  margin-top: 30px;
  padding: 20px;
  border: 1px solid #eee;
  border-radius: 8px;
}

.embedding-button {
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.embedding-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.embedding-button:hover:not(:disabled) {
  background-color: #0056b3;
}

.query-section {
  margin-top: 30px;
  padding: 20px;
  border: 1px solid #eee;
  border-radius: 8px;
}

.query-input {
  width: 100%;
  min-height: 100px;
  margin-bottom: 10px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
}

.query-button {
  width: 100%;
  margin-bottom: 20px;
}

.query-results {
  margin-top: 20px;
}

.result-item {
  margin-bottom: 15px;
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 4px;
  background-color: #f9f9f9;
}

.result-score {
  font-weight: bold;
  color: #007bff;
  margin-bottom: 5px;
}

.result-content {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
