<template>
  <div class="siyuan-ai-config-node">
    <div class="node-header">
      <h3>思源AI配置</h3>
      <div class="status-indicator" :class="{ 'ready': isConfigLoaded, 'error': hasError }">
        {{ statusText }}
      </div>
    </div>
    
    <div class="config-summary">
      <div class="config-item">
        <span class="label">模型:</span>
        <span class="value">{{ displayConfig.model || '未设置' }}</span>
      </div>
      
      <div class="config-item">
        <span class="label">API地址:</span>
        <span class="value ellipsis">{{ displayConfig.endpoint || '未设置' }}</span>
      </div>
      
      <div class="config-item">
        <span class="label">提供商:</span>
        <span class="value">{{ displayConfig.provider || '未设置' }}</span>
      </div>
    </div>
    
    <div v-if="customConfigActive" class="custom-config-badge">
      <span>使用自定义配置</span>
    </div>
    
    <div class="action-buttons">
      <button @click="refreshConfig" :disabled="isLoading">
        刷新配置
      </button>
    </div>

  </div>
</template>

<script nodeDefine>
import { ref, reactive, computed,onMounted } from 'vue';
import { getLocalSiyuanAIConfig } from '../../../../../../src/toolBox/useAge/forSiyuan/forAI/fromLocalSiyuanAI.js';

// 使用导出变量，便于在setup中访问
export const nodeDataState = {
  isConfigLoaded: ref(false),
  isLoading: ref(false),
  hasError: ref(false),
  errorMessage: ref(''),
  customConfigActive: ref(false),
  
  // 配置数据
  configData: reactive({
    apiConfig: {
      model: '',
      endpoint: '',
      temperature: 1.0,
      maxTokens: 1024,
      provider: 'OpenAI',
      headers: {},
      apiKey: '',
      timeout: 30000
    },
    targetLang: 'zh_CN',
    rawConfig: {}
  })
};


// 状态文本
export const statusText = computed(() => {
  if (nodeDataState.hasError.value) return '配置错误';
  if (nodeDataState.isLoading.value) return '加载中...';
  if (nodeDataState.isConfigLoaded.value) return '已就绪';
  return '等待初始化';
});

// 初始化配置
export const initConfig = async (force = false) => {
  nodeDataState.isLoading.value = true;
  nodeDataState.hasError.value = false;
  nodeDataState.errorMessage.value = '';
  
  try {
    // 从思源获取配置
    const siyuanConfig = getLocalSiyuanAIConfig({ force });
    
    if (!siyuanConfig || !siyuanConfig.apiConfig) {
      throw new Error('无法获取思源AI配置');
    }
    
    // 更新本地配置数据
    Object.assign(nodeDataState.configData, siyuanConfig);
    nodeDataState.isConfigLoaded.value = true;
    nodeDataState.customConfigActive.value = false;
    
    console.log('思源AI配置已加载:', nodeDataState.configData);
    return nodeDataState.configData;
  } catch (error) {
    console.error('加载思源AI配置失败:', error);
    nodeDataState.hasError.value = true;
    nodeDataState.errorMessage.value = error.message || '未知错误';
    throw error;
  } finally {
    nodeDataState.isLoading.value = false;
  }
};

// 合并自定义配置
export const mergeCustomConfig = (customConfig) => {
  if (!customConfig) return nodeDataState.configData;
  
  nodeDataState.customConfigActive.value = true;
  
  // 创建基于原始配置的深拷贝
  const mergedConfig = JSON.parse(JSON.stringify(nodeDataState.configData));
  
  // 合并自定义API配置
  if (customConfig.apiConfig) {
    mergedConfig.apiConfig = {
      ...mergedConfig.apiConfig,
      ...customConfig.apiConfig
    };
    
    // 特殊处理headers
    if (customConfig.apiConfig.headers) {
      mergedConfig.apiConfig.headers = {
        ...mergedConfig.apiConfig.headers,
        ...customConfig.apiConfig.headers
      };
    }
  }
  
  // 合并其他顶级属性
  if (customConfig.targetLang) {
    mergedConfig.targetLang = customConfig.targetLang;
  }
  
  console.log('合并自定义配置后:', mergedConfig);
  return mergedConfig;
};

// 定义节点
export const nodeDefine = {
  flowType: "provider",
  inputs: {
    customConfig: {
      type: 'object',
      label: '自定义配置',
      required: false,
      description: '可选的自定义配置，将覆盖默认配置'
    },
    forceRefresh: {
      type: 'boolean',
      label: '强制刷新',
      required: false,
      default: false,
      description: '设为true时强制刷新配置'
    }
  },
  outputs: {
    config: {
      type: 'object',
      label: 'AI配置',
      description: '完整的AI配置对象'
    },
    apiConfig: {
      type: 'object',
      label: 'API配置',
      description: 'API调用所需的配置'
    },
    model: {
      type: 'string',
      label: '模型名称',
      description: '当前使用的模型名称'
    },
    endpoint: {
      type: 'string',
      label: 'API端点',
      description: 'API请求端点URL'
    }
  },
  
  async process(inputs) {
    try {
      const customConfig = inputs.customConfig?.value || inputs.customConfig;
      const forceRefresh = inputs.forceRefresh?.value || inputs.forceRefresh;
      
      let config;
      
      // 根据输入决定是否刷新配置
      if (forceRefresh) {
        config = await initConfig(true);
      } else if (!nodeDataState.isConfigLoaded.value) {
        config = await initConfig();
      } else {
        config = nodeDataState.configData;
      }
      
      // 如果有自定义配置，则合并
      const finalConfig = customConfig ? mergeCustomConfig(customConfig) : config;
      
      // 返回配置
      return {
        config: finalConfig,
        apiConfig: finalConfig.apiConfig,
        model: finalConfig.apiConfig.model,
        endpoint: finalConfig.apiConfig.endpoint
      };
    } catch (error) {
      console.error('处理AI配置失败:', error);
      nodeDataState.hasError.value = true;
      nodeDataState.errorMessage.value = error.message || '未知错误';
      throw error;
    }
  }
};

// 默认输入
export const getDefaultInput = () => ({
  customConfig: null,
  forceRefresh: false
});
</script>

<script setup>
const { isConfigLoaded, isLoading, hasError, customConfigActive, configData } = nodeDataState;
// 显示用的配置（安全处理后）
 const displayConfig = computed(() => {
  return {
    model: nodeDataState.configData.apiConfig.model || '默认',
    endpoint: nodeDataState.configData.apiConfig.endpoint || '默认',
    provider: nodeDataState.configData.apiConfig.provider || '默认',
    temperature: nodeDataState.configData.apiConfig.temperature || 1.0,
    maxTokens: nodeDataState.configData.apiConfig.maxTokens || 0,
    timeout: Math.floor((nodeDataState.configData.apiConfig.timeout || 30000) / 1000) + '秒',
    targetLang: nodeDataState.configData.targetLang || 'zh_CN'
  };
});

// 刷新配置
const refreshConfig = async () => {
  try {
    isLoading.value = true;
    await initConfig(true);
    isConfigLoaded.value = true;
  } catch (error) {
    console.error('刷新配置失败:', error);
  } finally {
    isLoading.value = false;
  }
};

// 初始化 - 组件挂载时加载配置
onMounted(async () => {
  try {
    await refreshConfig();
  } catch (error) {
    console.error('初始化配置失败:', error);
  }
});
</script>

<style scoped>
.siyuan-ai-config-node {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(30, 35, 45, 0.9);
  border-radius: 8px;
  overflow: hidden;
  padding: 12px;
  border: 1px solid rgba(20, 140, 220, 0.3);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  font-family: system-ui, -apple-system, sans-serif;
  color: #d8e1ef;
}

.node-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(70, 130, 200, 0.3);
}

.node-header h3 {
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

.status-indicator.error {
  background: rgba(150, 0, 0, 0.3);
  color: #ff6b6b;
}

.config-summary {
  background: rgba(40, 45, 60, 0.5);
  border-radius: 6px;
  padding: 8px 10px;
  margin-bottom: 12px;
  flex-grow: 1;
}

.config-item {
  display: flex;
  margin-bottom: 6px;
  font-size: 13px;
  align-items: center;
}

.config-item .label {
  width: 70px;
  color: rgba(150, 200, 255, 0.7);
  flex-shrink: 0;
}

.config-item .value {
  color: rgba(255, 255, 255, 0.9);
  flex-grow: 1;
  overflow: hidden;
}

.ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.custom-config-badge {
  background: rgba(255, 160, 0, 0.15);
  border: 1px solid rgba(255, 160, 0, 0.3);
  color: rgba(255, 200, 0, 0.9);
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 12px;
  text-align: center;
  margin-bottom: 10px;
}

.action-buttons {
  display: flex;
  justify-content: center;
}

.action-buttons button {
  background: rgba(60, 100, 150, 0.4);
  color: rgba(200, 220, 255, 0.9);
  border: 1px solid rgba(70, 130, 200, 0.4);
  border-radius: 4px;
  padding: 5px 12px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-buttons button:hover:not(:disabled) {
  background: rgba(60, 120, 180, 0.5);
  transform: translateY(-1px);
}

.action-buttons button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style> 