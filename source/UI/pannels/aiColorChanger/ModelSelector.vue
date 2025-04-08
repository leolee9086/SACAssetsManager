<template>
  <div class="model-selector">
    <div class="selector-row">
      <label>提供商：</label>
      <select v-model="selectedProviderId" class="provider-select">
        <option value="global">
          全局模型 
          <template v-if="detectedGlobalProvider">
            ({{ globalProviderName ? globalProviderName + ' - ' : '' }}{{ globalModelName }})
          </template>
          <template v-else>
            ({{ globalModelName }})
          </template>
        </option>
        <option v-for="provider in providers" :key="provider.id" :value="provider.id">
          {{ provider.name }}
        </option>
      </select>
    </div>
    
    <div v-if="selectedProviderId !== 'global' && selectedProviderId">
      <div class="provider-info" v-if="selectedProvider">
        <div class="provider-description">{{ selectedProvider.description }}</div>
        <div class="provider-services">
          <span class="service-tag" v-for="service in selectedProvider.services" :key="service">{{ service }}</span>
        </div>
      </div>
      
      <div class="selector-row" v-if="modelTypes.length > 1">
        <label>模型类型：</label>
        <select v-model="selectedModelType" class="model-type-select">
          <option value="all">全部类型</option>
          <option v-for="type in modelTypes" :key="type" :value="type">
            {{ type }}
          </option>
        </select>
      </div>
      
      <div class="selector-row">
        <label>模型：</label>
        <select v-model="selectedModelId" class="model-select" :disabled="isLoading">
          <option v-if="isLoading" value="">加载中...</option>
          <option v-else-if="filteredModels.length === 0" value="" disabled>无可用模型</option>
          <option v-for="model in filteredModels" :key="model.id" :value="model.id">
            {{ model.name }}
          </option>
        </select>
      </div>
      
      <div v-if="isLoading" class="loading-indicator">
        <span class="spinner"></span> 正在加载模型列表...
      </div>
      
      <div v-if="selectedModel" class="model-detail">
        <div class="model-description">{{ selectedModel.description }}</div>
        <div class="model-tags">
          <span class="model-tag" v-for="tag in selectedModel.tags" :key="tag">{{ tag }}</span>
        </div>
      </div>
    </div>
    
    <div class="model-params">
      <div class="param-row">
        <label>温度：</label>
        <input 
          type="range" 
          v-model.number="temperature" 
          min="0" 
          max="2" 
          step="0.1" 
          class="param-slider"
        />
        <span class="param-value">{{ temperature.toFixed(1) }}</span>
      </div>
      
      <div class="param-row">
        <label>上下文：</label>
        <select v-model="maxContexts" class="param-select">
          <option value="1">单轮对话</option>
          <option value="3">短上下文 (3轮)</option>
          <option value="5">中等上下文 (5轮)</option>
          <option value="10">长上下文 (10轮)</option>
        </select>
      </div>
    </div>
    
    <!-- 自定义API设置 -->
    <div class="custom-api-section">
      <div class="custom-api-header" @click="useCustomApiSettings = !useCustomApiSettings">
        <h4>自定义API设置 <span class="toggle-icon">{{ useCustomApiSettings ? '▼' : '▶' }}</span></h4>
      </div>
      
      <div v-if="useCustomApiSettings" class="custom-api-content">
        <div class="custom-field">
          <label>API端点：</label>
          <input type="text" v-model="customApiEndpoint" placeholder="例如: https://api.siliconflow.cn/v1" />
        </div>
        
        <div class="custom-field">
          <label>API密钥：</label>
          <input type="password" v-model="customApiKey" placeholder="输入API密钥" />
        </div>
        
        <div class="custom-field">
          <label>模型名称：</label>
          <input type="text" v-model="customModelName" :placeholder="selectedModel ? selectedModel.name : '例如: deepseek-ai/DeepSeek-R1'" />
        </div>
        
        <div v-if="customApiError" class="custom-api-error">{{ customApiError }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { providerList } from '/plugins/SACAssetsManager/assets/modelProviders/index.js';

// 属性传递
const props = defineProps({
  initialModel: {
    type: String,
    default: ''
  }
});

// 事件
const emit = defineEmits(['update:model', 'config-changed']);

// 状态
const providers = ref(providerList || []);
const selectedProviderId = ref('global');
const selectedModelId = ref('');
const selectedModelType = ref('all');
const models = ref([]);
const isLoading = ref(false);
const temperature = ref(0.7);
const maxContexts = ref(1);
const globalModelName = ref('思源默认');
const detectedGlobalProvider = ref('');
const globalProviderName = ref('');
const globalApiBaseURL = ref('');
const hasGlobalApiKey = ref(false);

// 自定义API设置
const useCustomApiSettings = ref(false);
const customApiEndpoint = ref('');
const customApiKey = ref('');
const customModelName = ref('');
const customApiError = ref('');

// 计算属性：当前选中的提供商
const selectedProvider = computed(() => {
  if (selectedProviderId.value === 'global') return null;
  return providers.value.find(p => p.id === selectedProviderId.value);
});

// 计算属性：当前选中的模型
const selectedModel = computed(() => {
  if (!selectedModelId.value || !models.value.length) return null;
  return models.value.find(m => m.id === selectedModelId.value);
});

// 应用自定义API设置
const applyCustomApiSettings = () => {
  // 仅当自定义API选项被启用时才应用
  if (!useCustomApiSettings.value) return;
  
  // 验证自定义设置
  if (!customApiEndpoint.value) {
    customApiError.value = '请输入API端点地址';
    return;
  }
  
  // 更新配置
  const updatedConfig = {
    ...currentConfig.value,
    useCustomApiSettings: true,
    customApiEndpoint: customApiEndpoint.value,
    customApiKey: customApiKey.value,
    customModelName: customModelName.value
  };
  
  // 发送更新后的配置
  emit('config-changed', updatedConfig);
  customApiError.value = '';
};

// 获取当前全局模型名称和供应商
const fetchGlobalModelInfo = () => {
  if (window?.siyuan?.config?.ai?.openAI) {
    const aiConfig = window.siyuan.config.ai.openAI;
    
    // 获取模型名称
    const apiModel = aiConfig.apiModel || aiConfig.model || 'gpt-3.5-turbo';
    globalModelName.value = apiModel;
    
    // 保存API端点和密钥，用于自定义设置的初始化
    if (aiConfig.apiBaseURL) {
      globalApiBaseURL.value = aiConfig.apiBaseURL;
    }
    
    if (aiConfig.apiKey) {
      // 不直接存储apiKey，仅记录有无
      hasGlobalApiKey.value = Boolean(aiConfig.apiKey);
    }
    
    // 根据端点URL识别供应商
    if (aiConfig.apiBaseURL) {
      const url = aiConfig.apiBaseURL.toLowerCase();
      
      // 匹配供应商
      let detectedProvider = null;
      if (url.includes('siliconflow.cn')) {
        detectedProvider = 'siliconflow';
      } else if (url.includes('volcengine') || url.includes('volccdn')) {
        detectedProvider = 'volcengine';
      } else if (url.includes('baidu') || url.includes('wenxin')) {
        detectedProvider = 'baidu';
      } else if (url.includes('dashscope') || url.includes('aliyun')) {
        detectedProvider = 'dashscope';
      } else if (url.includes('zhipu') || url.includes('chatglm')) {
        detectedProvider = 'zhipu';
      } else if (url.includes('minimax')) {
        detectedProvider = 'minimax';
      } else if (url.includes('openai')) {
        detectedProvider = 'openai';
      }
      
      if (detectedProvider) {
        detectedGlobalProvider.value = detectedProvider;
        console.log(`根据端点 ${url} 检测到供应商: ${detectedProvider}`);
      }
    }
  }
};

// 初始化自定义API设置字段
const initCustomApiFields = () => {
  // 如果已经选择了模型，优先使用模型信息
  if (selectedModel.value) {
    customModelName.value = selectedModel.value.name;
  } else if (globalModelName.value) {
    customModelName.value = globalModelName.value;
  }
  
  // 如果已经选择了提供商，尝试自动填充API端点
  if (selectedProvider.value && selectedProvider.value.links && selectedProvider.value.links.homepage) {
    const url = selectedProvider.value.links.homepage;
    if (url.includes('siliconflow')) {
      customApiEndpoint.value = 'https://api.siliconflow.cn/v1';
    } else if (url.includes('openai')) {
      customApiEndpoint.value = 'https://api.openai.com/v1';
    } else {
      customApiEndpoint.value = globalApiBaseURL.value || '';
    }
  } else {
    customApiEndpoint.value = globalApiBaseURL.value || '';
  }
  
  // 不复制API Key，需要用户自行输入
};

// 获取过滤后的模型列表
const filteredModels = computed(() => {
  // 基本过滤
  if (!models.value || models.value.length === 0) {
    return [];
  }
  
  // 按照类型过滤
  if (selectedModelType.value && selectedModelType.value !== 'all') {
    return models.value.filter(model => model.type === selectedModelType.value);
  }
  
  return models.value;
});

// 获取模型类型列表
const modelTypes = computed(() => {
  if (!models.value || models.value.length === 0) {
    return [];
  }
  
  // 提取所有不同的类型
  const types = new Set();
  models.value.forEach(model => {
    if (model.type) {
      types.add(model.type);
    }
  });
  
  return Array.from(types);
});

// 获取当前模型配置
const currentConfig = computed(() => {
  // 首先确定是否使用全局设置
  const isGlobal = selectedProviderId.value === 'global' && !useCustomApiSettings.value;
  
  // 基本配置
  let config = {
    useGlobal: isGlobal,
    temperature: Number(temperature.value) || 0.7,
    maxContexts: parseInt(maxContexts.value) || 1,
  };
  
  console.log('构建模型配置 - 基础设置:', {
    useGlobal: config.useGlobal,
    temperature: config.temperature,
    maxContexts: config.maxContexts
  });
  
  // 如果启用了自定义API设置，这是最高优先级
  if (useCustomApiSettings.value) {
    console.log('检测到自定义API设置被启用');
    
    // 验证输入的有效性
    const endpoint = customApiEndpoint.value?.trim() || '';
    const apiKey = customApiKey.value?.trim() || '';
    const modelName = customModelName.value?.trim() || '';
    
    // 确保端点格式正确
    let validEndpoint = endpoint;
    if (endpoint && !endpoint.startsWith('http')) {
      validEndpoint = `https://${endpoint}`;
      console.warn('自动修正API端点格式:', validEndpoint);
    }
    
    config.useGlobal = false; // 强制不使用全局设置
    config.useCustomApiSettings = true;
    config.customApiEndpoint = validEndpoint;
    config.customApiKey = apiKey;
    config.customModelName = modelName || (selectedModel.value?.name || globalModelName.value);
    
    console.log('应用自定义API设置:', {
      endpoint: validEndpoint ? '已设置' : '未设置',
      hasKey: Boolean(apiKey),
      model: config.customModelName || '未设置'
    });
    
    return config;
  }
  
  // 如果选择了特定供应商和模型，这是第二优先级
  if (!isGlobal && selectedProviderId.value && selectedModelId.value) {
    console.log('检测到选择了特定模型:', selectedModelId.value);
    
    const currentModel = models.value.find(m => m.id === selectedModelId.value);
    if (currentModel) {
      config.model = currentModel.name;
      config.providerId = selectedProviderId.value;
      config.modelId = selectedModelId.value;
      
      // 如果模型有标签，添加到配置
      if (currentModel.tags && currentModel.tags.length) {
        config.modelTags = [...currentModel.tags];
      }
      
      // 添加模型类型
      if (currentModel.type) {
        config.modelType = currentModel.type;
      }
      
      // 添加模型上下文窗口大小（如果有）
      if (currentModel.contextWindow) {
        config.contextWindow = currentModel.contextWindow;
      }
      
      console.log('应用特定模型设置:', {
        provider: config.providerId,
        model: config.model,
        modelId: config.modelId,
        type: config.modelType || '未指定'
      });
    } else {
      console.warn('未找到选定的模型:', selectedModelId.value);
    }
  } else if (isGlobal) {
    console.log('使用全局模型配置');
  }
  
  return config;
});

// 加载模型列表
const loadModels = async () => {
  if (selectedProviderId.value === 'global') {
    models.value = [];
    return;
  }
  
  const provider = providers.value.find(p => p.id === selectedProviderId.value);
  if (!provider || !provider.modelList) {
    models.value = [];
    return;
  }
  
  isLoading.value = true;
  selectedModelId.value = ''; // 清空当前选择的模型
  
  try {
    // 动态导入对应供应商的模型列表
    const modulePath = `/plugins/SACAssetsManager/assets/modelProviders/${provider.modelList}`;
    const module = await import(modulePath);
    models.value = module.modelList || [];
    
    // 如果有模型，默认选择第一个
    if (models.value.length > 0) {
      selectedModelId.value = models.value[0].id;
    }
    
    console.log(`加载了${provider.name}的${models.value.length}个模型`);
  } catch (err) {
    console.error('加载模型列表失败:', err, '路径:', `/plugins/SACAssetsManager/assets/modelProviders/${provider.modelList}`);
    // 回退到硬编码的火山模型
    try {
      const fallbackModule = await import('/plugins/SACAssetsManager/assets/modelProviders/modelCards/火山方舟.js');
      models.value = fallbackModule.modelList || [];
      console.log('使用火山方舟模型作为回退选项');
      if (models.value.length > 0) {
        selectedModelId.value = models.value[0].id;
      }
    } catch (fallbackErr) {
      console.error('加载回退模型列表也失败:', fallbackErr);
      models.value = [];
    }
  } finally {
    isLoading.value = false;
  }
};

// 当提供商变化时加载模型
watch(selectedProviderId, () => {
  // 重置模型类型选择
  selectedModelType.value = 'all';
  
  // 加载模型列表
  loadModels();
  
  // 重置自定义API设置
  useCustomApiSettings.value = false;
  customApiEndpoint.value = '';
  customApiKey.value = '';
  customModelName.value = '';
  
  emit('config-changed', currentConfig.value);
});

// 当选择的模型变化时
watch(selectedModelId, (newId) => {
  // 如果启用了自定义API，并且选择了新的模型，更新模型名称
  if (useCustomApiSettings.value && newId) {
    const model = models.value.find(m => m.id === newId);
    if (model) {
      customModelName.value = model.name;
    }
  }
});

// 监听自定义API设置的变化
watch([useCustomApiSettings, customApiEndpoint, customApiKey, customModelName], () => {
  if (useCustomApiSettings.value) {
    // 验证自定义设置
    let hasError = false;
    
    if (!customApiEndpoint.value) {
      customApiError.value = '请输入API端点地址';
      hasError = true;
    } else if (!customApiKey.value) {
      customApiError.value = '请输入API密钥';
      hasError = true;
    } else if (!customModelName.value) {
      customApiError.value = '请输入模型名称';
      hasError = true;
    } else {
      customApiError.value = '';
    }
    
    if (!hasError) {
      console.log('自定义API设置已更新，发送配置变更事件');
      emit('config-changed', currentConfig.value);
    }
  } else {
    customApiError.value = '';
    emit('config-changed', currentConfig.value);
  }
});

// 当模型相关设置变化时触发更新
watch([selectedModelId, temperature, maxContexts, selectedModelType], () => {
  const config = currentConfig.value;
  console.log('模型设置已更新:', {
    provider: selectedProviderId.value,
    modelId: selectedModelId.value,
    temperature: temperature.value,
    maxContexts: maxContexts.value
  });
  emit('config-changed', config);
});

// 当自定义API设置被启用时，自动初始化字段
watch(useCustomApiSettings, (newVal) => {
  if (newVal) {
    initCustomApiFields();
  }
});

// 初始化
onMounted(async () => {
  // 获取全局模型信息
  fetchGlobalModelInfo();
  
  // 如果检测到了全局供应商，添加一个特殊的选项
  if (detectedGlobalProvider.value) {
    const matchedProvider = providers.value.find(p => p.id === detectedGlobalProvider.value);
    if (matchedProvider) {
      globalProviderName.value = matchedProvider.name;
    }
  }
  
  // 如果有初始模型，尝试找到对应的提供商和模型
  if (props.initialModel) {
    // 查找包含此模型的提供商
    let modelFound = false;
    for (const provider of providers.value) {
      try {
        if (provider.modelList) {
          const module = await import(`/plugins/SACAssetsManager/assets/modelProviders/${provider.modelList}`);
          const model = module.modelList.find(m => m.name === props.initialModel);
          if (model) {
            selectedProviderId.value = provider.id;
            await loadModels();
            selectedModelId.value = model.id;
            modelFound = true;
            break;
          }
        }
      } catch (e) {
        console.error(`查找初始模型时加载 ${provider.name} 的模型列表失败:`, e);
      }
    }
    
    // 如果未找到模型但指定了初始模型，使用自定义API设置
    if (!modelFound && props.initialModel) {
      useCustomApiSettings.value = true;
      customModelName.value = props.initialModel;
      // 延迟初始化其他自定义字段
      setTimeout(() => {
        initCustomApiFields();
      }, 100);
    }
  } else if (detectedGlobalProvider.value) {
    // 如果没有初始模型但检测到全局供应商，自动选择该供应商
    selectedProviderId.value = detectedGlobalProvider.value;
  }
  
  // 发出初始配置变更事件
  setTimeout(() => {
    emit('config-changed', currentConfig.value);
  }, 200);
});
</script>

<style scoped>
.model-selector {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
}

.selector-row {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.selector-row label {
  width: 80px;
  font-size: 14px;
  color: #555;
}

.provider-select,
.model-select,
.model-type-select,
.param-select {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  font-size: 14px;
  outline: none;
}

.provider-select:focus,
.model-select:focus,
.model-type-select:focus,
.param-select:focus {
  border-color: #4285f4;
}

.provider-info {
  margin: 10px 0 15px;
  padding: 10px;
  background-color: #f0f0f0;
  border-radius: 6px;
}

.provider-description {
  font-size: 13px;
  color: #444;
  margin-bottom: 8px;
  line-height: 1.4;
}

.provider-services {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.service-tag {
  background-color: #e0e0e0;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #555;
}

.model-detail {
  margin: 10px 0;
  padding: 10px;
  background-color: #f0f0f0;
  border-radius: 6px;
}

.model-description {
  font-size: 13px;
  color: #444;
  margin-bottom: 8px;
  line-height: 1.4;
}

.model-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.model-tag {
  background-color: #e0e0e0;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #555;
}

.model-params {
  border-top: 1px solid #eee;
  padding-top: 12px;
  margin-top: 12px;
}

.param-row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.param-row label {
  width: 80px;
  font-size: 14px;
  color: #555;
}

.param-slider {
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: #ddd;
  border-radius: 3px;
  outline: none;
}

.param-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #4285f4;
  cursor: pointer;
}

.param-value {
  width: 40px;
  text-align: right;
  font-size: 14px;
  color: #555;
  margin-left: 10px;
}

.param-select {
  flex: 1;
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  font-size: 14px;
  color: #666;
}

.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #4285f4;
  animation: spin 1s ease-in-out infinite;
  margin-right: 8px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.custom-api-section {
  margin-top: 16px;
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
}

.custom-api-header {
  padding: 10px 16px;
  background-color: #f9f9f9;
  cursor: pointer;
  user-select: none;
}

.custom-api-header h4 {
  margin: 0;
  font-size: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #555;
}

.toggle-icon {
  font-size: 12px;
  color: #666;
}

.custom-api-content {
  padding: 12px;
  border-top: 1px solid #eee;
}

.custom-field {
  margin-bottom: 12px;
}

.custom-field label {
  display: block;
  font-size: 14px;
  color: #555;
  margin-bottom: 5px;
}

.custom-field input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.custom-field input:focus {
  border-color: #4285f4;
  outline: none;
}

.custom-api-error {
  color: #d93025;
  font-size: 12px;
  margin-top: 8px;
}
</style> 