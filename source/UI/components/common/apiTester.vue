<template>
    <div class="api-tester">
      <div class="request-section">
        <div class="method-url-row">
          <select v-model="method" class="method-select">
            <option v-for="m in methods" :key="m" :value="m">{{ m }}</option>
          </select>
          <input v-model="url" class="url-input" placeholder="输入请求URL" @input="validateUrl" />
          <button @click="sendRequest" :disabled="!isUrlValid" class="send-button">发送请求</button>
        </div>
        
        <div class="tabs">
          <button 
            v-for="tab in tabs" 
            :key="tab" 
            @click="activeTab = tab"
            :class="{ active: activeTab === tab }"
          >
            {{ tab }}
          </button>
        </div>
        
        <div v-if="activeTab === '参数'" class="params-section">
          <div v-for="(param, index) in params" :key="index" class="param-row">
            <input v-model="param.key" placeholder="参数名" />
            <input v-model="param.value" placeholder="参数值" />
            <button @click="removeParam(index)" class="remove-button">-</button>
          </div>
          <button @click="addParam" class="add-button">添加参数</button>
        </div>
        
        <div v-if="activeTab === '请求头'" class="headers-section">
          <div v-for="(header, index) in headers" :key="index" class="header-row">
            <input v-model="header.key" placeholder="Header名" />
            <input v-model="header.value" placeholder="Header值" />
            <button @click="removeHeader(index)" class="remove-button">-</button>
          </div>
          <button @click="addHeader" class="add-button">添加Header</button>
        </div>
        
        <div v-if="activeTab === '请求体'" class="body-section">
          <textarea v-model="requestBody" placeholder="输入请求体 (JSON 格式)"></textarea>
        </div>
      </div>
      
      <div class="response-section">
        <h3>响应</h3>
        <div class="response-info">
          <span>状态: {{ responseStatus }}</span>
          <span>时间: {{ responseTime }}ms</span>
        </div>
        <pre class="response-body">{{ formattedResponse }}</pre>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed } from 'vue';
  import axios from 'axios';
  
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  const tabs = ['参数', '请求头', '请求体'];
  
  const method = ref('GET');
  const url = ref('');
  const isUrlValid = ref(false);
  const activeTab = ref('参数');
  const params = ref([{ key: '', value: '' }]);
  const headers = ref([{ key: '', value: '' }]);
  const requestBody = ref('');
  
  const responseStatus = ref('');
  const responseTime = ref(0);
  const responseBody = ref('');
  
  const validateUrl = () => {
    try {
      new URL(url.value);
      isUrlValid.value = true;
    } catch {
      isUrlValid.value = false;
    }
  };
  
  const addParam = () => params.value.push({ key: '', value: '' });
  const removeParam = (index) => params.value.splice(index, 1);
  
  const addHeader = () => headers.value.push({ key: '', value: '' });
  const removeHeader = (index) => headers.value.splice(index, 1);
  
  const formattedResponse = computed(() => {
    try {
      return JSON.stringify(JSON.parse(responseBody.value), null, 2);
    } catch {
      return responseBody.value;
    }
  });
  
  const sendRequest = async () => {
    const config = {
      method: method.value,
      url: url.value,
      headers: headers.value.reduce((acc, header) => {
        if (header.key && header.value) {
          acc[header.key] = header.value;
        }
        return acc;
      }, {}),
      params: params.value.reduce((acc, param) => {
        if (param.key && param.value) {
          acc[param.key] = param.value;
        }
        return acc;
      }, {}),
      data: requestBody.value ? JSON.parse(requestBody.value) : null
    };
  
    const startTime = Date.now();
    try {
      const response = await axios(config);
      responseStatus.value = response.status;
      responseBody.value = JSON.stringify(response.data);
    } catch (error) {
      responseStatus.value = error.response ? error.response.status : 'Error';
      responseBody.value = error.message;
    }
    responseTime.value = Date.now() - startTime;
  };
  </script>
  
  <style scoped>
  .api-tester {
    font-family: Arial, sans-serif;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }
  
  .method-url-row {
    display: flex;
    margin-bottom: 10px;
  }
  
  .method-select {
    width: 100px;
  }
  
  .url-input {
    flex-grow: 1;
    margin: 0 10px;
  }
  
  .send-button {
    width: 100px;
  }
  
  .tabs {
    display: flex;
    margin-bottom: 10px;
  }
  
  .tabs button {
    padding: 5px 10px;
    border: none;
    background-color: #f0f0f0;
    cursor: pointer;
  }
  
  .tabs button.active {
    background-color: #e0e0e0;
  }
  
  .params-section, .headers-section {
    margin-bottom: 10px;
  }
  
  .param-row, .header-row {
    display: flex;
    margin-bottom: 5px;
  }
  
  .param-row input, .header-row input {
    flex-grow: 1;
    margin-right: 5px;
  }
  
  .remove-button, .add-button {
    width: 30px;
  }
  
  .body-section textarea {
    width: 100%;
    height: 100px;
  }
  
  .response-section {
    margin-top: 20px;
    border-top: 1px solid #ccc;
    padding-top: 20px;
  }
  
  .response-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  
  .response-body {
    background-color: #f0f0f0;
    padding: 10px;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  </style>