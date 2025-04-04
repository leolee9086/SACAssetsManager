<template>
  <div class="function-router-demo">
    <header class="demo-header">
      <h1>函数路由器测试</h1>
    </header>
    
    <div class="section config-section">
      <h2 class="section-title">路由配置示例</h2>
      <div class="code-container">
        <pre>{{ routerConfigExample }}</pre>
      </div>
      
      <div class="actions">
        <button @click="initRouter" class="primary-button">
          <span class="icon">⚙️</span> 初始化路由器
        </button>
        <span v-if="routerInitialized" class="success-indicator">
          <span class="check-icon">✓</span> 路由器已初始化
        </span>
      </div>
    </div>
    
    <div class="section test-section">
      <h2 class="section-title">API 测试</h2>
      
      <div class="card api-selection">
        <div class="endpoint-selector">
          <label>选择端点：</label>
          <select v-model="selectedEndpoint" class="select-control">
            <option v-for="(endpoint, index) in endpoints" :key="index" :value="endpoint">
              <span class="method-tag" :class="endpoint.method.toLowerCase()">{{ endpoint.method }}</span> 
              {{ endpoint.path }}
            </option>
          </select>
        </div>
      </div>
      
      <div v-if="selectedEndpoint && selectedEndpointDoc && selectedEndpointDoc.params" 
           class="card endpoint-params">
        <h3 class="card-title">参数</h3>
        <div class="params-grid">
          <div v-for="(param, name) in selectedEndpointDoc.params" :key="name" class="param-input">
            <label class="param-label">{{ name }}:</label>
            <div class="input-group">
              <input v-model="requestParams[name]" 
                    :placeholder="param.description || name"
                    class="text-input">
              <small v-if="param.required" class="required-badge">必填</small>
            </div>
            <small v-if="param.description" class="param-description">
              {{ param.description }}
            </small>
          </div>
        </div>
        
        <div class="action-bar">
          <button @click="testEndpoint" class="test-button">
            <span class="icon">🚀</span> 测试请求
          </button>
        </div>
      </div>
      <div v-else-if="selectedEndpoint" class="card warning-card">
        <p class="warning-text">未找到该端点的参数信息</p>
      </div>
      
      <div v-if="selectedEndpoint && selectedEndpointDoc && selectedEndpointDoc.registrationInfo" 
           class="card endpoint-info">
        <h3 class="card-title">端点信息</h3>
        <div class="info-grid">
          <div class="info-item">
            <strong>摘要：</strong> 
            <span>{{ selectedEndpointDoc.summary }}</span>
          </div>
          <div class="info-item">
            <strong>描述：</strong> 
            <span>{{ selectedEndpointDoc.description }}</span>
          </div>
          <div class="info-item registration-point">
            <strong>注册位置：</strong> 
            <a 
              :href="`vscode://file/${selectedEndpointDoc.registrationInfo.filePath}:${selectedEndpointDoc.registrationInfo.lineNumber}:${selectedEndpointDoc.registrationInfo.columnNumber}`"
              class="file-link"
              @click="openFile(selectedEndpointDoc.registrationInfo)"
            >
              <span class="file-icon">📄</span>
              {{ selectedEndpointDoc.registrationInfo.filePath }}:{{ selectedEndpointDoc.registrationInfo.lineNumber }}
            </a>
            <div class="stack-trace">
              <small>{{ selectedEndpointDoc.registrationInfo.fullStack }}</small>
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="response" class="card response-display">
        <h3 class="card-title">响应结果</h3>
        <div class="response-content">
          <pre>{{ JSON.stringify(response, null, 2) }}</pre>
        </div>
      </div>
    </div>
    
    <div class="section docs-section">
      <h2 class="section-title">生成的 OpenAPI 文档</h2>
      <div class="action-bar">
        <button @click="generateDocs" class="primary-button">
          <span class="icon">📋</span> 生成 OpenAPI 文档
        </button>
      </div>
      
      <div v-if="openApiDocs" class="card docs-preview">
        <div class="tabs">
          <button class="tab active">JSON</button>
          <button class="tab">YAML</button>
        </div>
        <div class="code-container with-line-numbers">
          <pre>{{ JSON.stringify(openApiDocs, null, 2) }}</pre>
        </div>
      </div>
    </div>
    
    <div class="section debug-section" v-if="routerInitialized">
      <h2 class="section-title collapsible" @click="showDebug = !showDebug">
        调试信息 <span class="toggle-icon">{{ showDebug ? '▼' : '▶' }}</span>
      </h2>
      <div v-if="showDebug && selectedEndpoint" class="card debug-card">
        <p>选中的端点: <code>{{ selectedEndpoint.method }} {{ selectedEndpoint.path }}</code></p>
        
        <div v-if="selectedEndpointDoc">
          <p>文档来源: <span class="source-badge">{{ selectedEndpointDoc.registrationInfo ? '路由器' : '模拟数据' }}</span></p>
          <div class="code-container debug-code">
            <pre>{{ JSON.stringify(selectedEndpointDoc, null, 2) }}</pre>
          </div>
        </div>
        <p v-else class="warning-text">未找到文档</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { createFunctionRouter } from '../../../../src/utils/feature/forFunctionEndpoints.js';

// 响应式状态
const router = ref(null);
const routerInitialized = ref(false);
const selectedEndpoint = ref(null);
const requestParams = reactive({});
const response = ref(null);
const openApiDocs = ref(null);
const showDebug = ref(false);

// 示例路由配置
const routerConfigExample = ref(`
// 路由器初始化代码示例
const router = createFunctionRouter();

// 注册GET路由示例
router.get('/users/:id', {
  summary: '获取用户信息',
  description: '根据用户ID获取用户详细信息',
  params: {
    id: {
      description: '用户ID',
      type: 'string',
      required: true
    },
    include: {
      description: '包含的关联数据',
      type: 'string',
      enum: ['posts', 'comments', 'all']
    }
  },
  response: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      email: { type: 'string' }
    },
    required: ['id', 'name']
  }
}, async (ctx) => {
  // 处理函数逻辑
});
`);

// 模拟端点列表
const endpoints = ref([
  { method: 'GET', path: '/users/:id', name: 'getUser' },
  { method: 'GET', path: '/users', name: 'listUsers' },
  { method: 'POST', path: '/users', name: 'createUser' },
  { method: 'PUT', path: '/users/:id', name: 'updateUser' },
  { method: 'DELETE', path: '/users/:id', name: 'deleteUser' }
]);

// 模拟文档
const routeDocs = reactive({
  'getUser': {
    summary: '获取用户信息',
    description: '根据用户ID获取用户详细信息',
    params: {
      id: {
        description: '用户ID',
        type: 'string',
        required: true
      },
      include: {
        description: '包含的关联数据',
        type: 'string',
        enum: ['posts', 'comments', 'all']
      }
    },
    response: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' }
      },
      required: ['id', 'name']
    }
  },
  'listUsers': {
    summary: '获取用户列表',
    description: '获取所有用户的列表',
    params: {
      page: {
        description: '页码',
        type: 'integer',
        default: 1
      },
      limit: {
        description: '每页数量',
        type: 'integer',
        default: 10
      }
    },
    response: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' }
        }
      }
    }
  },
  'createUser': {
    summary: '创建用户',
    description: '创建新用户',
    params: {
      name: {
        description: '用户名',
        type: 'string',
        required: true
      },
      email: {
        description: '邮箱',
        type: 'string',
        required: true
      },
      password: {
        description: '密码',
        type: 'string',
        required: true
      }
    },
    response: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' }
      }
    }
  },
  'updateUser': {
    summary: '更新用户',
    description: '更新用户信息',
    params: {
      id: {
        description: '用户ID',
        type: 'string',
        required: true
      },
      name: {
        description: '用户名',
        type: 'string'
      },
      email: {
        description: '邮箱',
        type: 'string'
      }
    },
    response: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' },
        updated: { type: 'boolean' }
      }
    }
  },
  'deleteUser': {
    summary: '删除用户',
    description: '删除指定用户',
    params: {
      id: {
        description: '用户ID',
        type: 'string',
        required: true
      }
    },
    response: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  }
});

// 计算属性：获取当前选定端点的文档
const selectedEndpointDoc = computed(() => {
  if (!selectedEndpoint.value || !router.value) return null;
  
  // 尝试从路由器中获取文档
  const method = selectedEndpoint.value.method;
  const path = selectedEndpoint.value.path;
  const docKey = `${method}:${path}`;
  
  console.log('当前选择的端点:', docKey);
  
  // 首先尝试从路由器获取文档
  let doc = null;
  if (router.value.docs && router.value.docs[docKey]) {
    doc = router.value.docs[docKey];
  } else {
    // 如果没有找到，则使用模拟文档
    doc = routeDocs[selectedEndpoint.value.name] || null;
  }
  
  // 确保文档包含必要的字段
  if (doc && !doc.params) {
    doc.params = {};
  }
  
  return doc;
});

// 方法：初始化路由器
function initRouter() {
  console.log('开始初始化路由器');
  router.value = createFunctionRouter();
  
  // 注册路由
  endpoints.value.forEach(endpoint => {
    const doc = routeDocs[endpoint.name];
    if (doc) {
      console.log('注册端点:', endpoint.method, endpoint.path);
      // 确保文档对象包含必要的字段
      const safeDoc = { ...doc };
      if (!safeDoc.params) safeDoc.params = {};
      if (!safeDoc.response) safeDoc.response = { type: 'any' };
      
      // 使用已验证的文档对象
      if (endpoint.method === 'GET') {
        router.value.get(endpoint.path, safeDoc, mockHandler);
      } else if (endpoint.method === 'POST') {
        router.value.post(endpoint.path, safeDoc, mockHandler);
      } else if (endpoint.method === 'PUT') {
        router.value.put(endpoint.path, safeDoc, mockHandler);
      } else if (endpoint.method === 'DELETE') {
        router.value.delete(endpoint.path, safeDoc, mockHandler);
      }
    }
  });
  
  routerInitialized.value = true;
  
  // 检查路由器中存储的文档
  const routerDocs = router.value.getAllDocs();
  console.log('所有路由文档:', routerDocs);
}

// 模拟请求处理函数
function mockHandler(ctx) {
  // 在实际应用中，这里会处理请求
  return { success: true, message: '请求已处理' };
}

// 测试端点
async function testEndpoint() {
  if (!selectedEndpoint.value) return;
  
  try {
    // 构造模拟响应
    const mockResponse = {
      method: selectedEndpoint.value.method,
      path: selectedEndpoint.value.path,
      params: requestParams,
      response: {
        status: 200,
        data: {
          success: true,
          message: `${selectedEndpoint.value.method} ${selectedEndpoint.value.path} 请求成功`,
          timestamp: new Date().toISOString()
        }
      }
    };
    
    await new Promise(resolve => setTimeout(resolve, 500));
    response.value = mockResponse;
  } catch (error) {
    response.value = { error: error.message };
  }
}

// 生成OpenAPI文档
function generateDocs() {
  if (!router.value) {
    initRouter();
  }
  
  openApiDocs.value = router.value.generateOpenAPIDoc({
    title: '函数路由器API文档',
    version: '1.0.0',
    description: '函数路由器测试组件生成的API文档'
  });
}

// 添加打开文件的方法
function openFile(registrationInfo) {
  // 这里可以添加自定义逻辑，如果vscode://协议不起作用
  console.log('打开文件:', registrationInfo.filePath, '行:', registrationInfo.lineNumber);
  
  // 对于不同的编辑器可能需要不同的协议
  // VS Code: vscode://file/path/to/file:line:column
  // WebStorm: webstorm://open?file=path/to/file&line=lineNumber
  // 可以根据需要调整此方法
}

// 组件挂载时自动初始化
onMounted(() => {
  // 默认选择第一个端点
  if (endpoints.value.length > 0) {
    selectedEndpoint.value = endpoints.value[0];
  }
});
</script>

<style scoped>
/* 基础样式 */
.function-router-demo {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  color: #2c3e50;
  line-height: 1.6;
  background-color: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.05);
}

.demo-header {
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e9ecef;
}

h1 {
  font-size: 2.2rem;
  color: #1a365d;
  margin-top: 0;
}

.section {
  margin-bottom: 2.5rem;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.section-title {
  font-size: 1.5rem;
  margin: 0;
  padding: 1rem 1.5rem;
  background-color: #f1f5f9;
  color: #2d3748;
  border-bottom: 1px solid #e2e8f0;
}

.collapsible {
  cursor: pointer;
  user-select: none;
}

.toggle-icon {
  font-size: 0.8rem;
  margin-left: 0.5rem;
}

.card {
  background-color: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin: 1rem;
  padding: 1.25rem;
  overflow: hidden;
}

.card-title {
  font-size: 1.2rem;
  color: #2d3748;
  margin-top: 0;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #edf2f7;
}

/* 代码区域 */
.code-container {
  background: #f8fafc;
  padding: 1rem;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
  margin: 1rem;
}

pre {
  margin: 0;
  font-family: 'JetBrains Mono', 'Fira Code', Monaco, Consolas, monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  overflow-x: auto;
}

.with-line-numbers {
  counter-reset: line;
  position: relative;
}

/* 按钮和控件 */
.actions, .action-bar {
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.6rem 1.2rem;
  border-radius: 4px;
  font-weight: 500;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.primary-button {
  background-color: #4f46e5;
  color: white;
}

.primary-button:hover {
  background-color: #4338ca;
  transform: translateY(-1px);
}

.test-button {
  background-color: #2563eb;
  color: white;
}

.test-button:hover {
  background-color: #1d4ed8;
}

.icon {
  margin-right: 0.5rem;
  font-size: 1rem;
}

.select-control {
  padding: 0.6rem;
  border-radius: 4px;
  border: 1px solid #cbd5e0;
  width: 100%;
  font-size: 0.95rem;
  background-color: white;
}

.text-input {
  padding: 0.6rem;
  border-radius: 4px;
  border: 1px solid #cbd5e0;
  width: 100%;
  font-size: 0.95rem;
}

.input-group {
  display: flex;
  align-items: center;
}

/* 参数和信息显示 */
.params-grid, .info-grid {
  display: grid;
  gap: 1rem;
}

.param-input {
  display: grid;
  gap: 0.25rem;
}

.param-label {
  font-weight: 600;
  color: #4a5568;
}

.param-description {
  color: #718096;
}

.required-badge {
  background-color: #f56565;
  color: white;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  margin-left: 0.5rem;
  font-size: 0.7rem;
}

.info-item {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 0.5rem;
  align-items: baseline;
  padding: 0.5rem 0;
  border-bottom: 1px solid #edf2f7;
}

.registration-point {
  grid-template-columns: 100px 1fr;
}

.file-link {
  color: #3182ce;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  font-family: monospace;
  background-color: #ebf8ff;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.file-link:hover {
  background-color: #bee3f8;
  text-decoration: underline;
}

.file-icon {
  margin-right: 0.5rem;
}

.stack-trace {
  grid-column: 1 / -1;
  margin-top: 0.5rem;
  font-family: monospace;
  white-space: pre-wrap;
  color: #718096;
  font-size: 0.75rem;
  background-color: #f7fafc;
  padding: 0.5rem;
  border-radius: 4px;
  border-left: 3px solid #cbd5e0;
}

/* 状态指示器 */
.success-indicator {
  display: inline-flex;
  align-items: center;
  color: #38a169;
  background-color: #f0fff4;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  font-weight: 500;
}

.check-icon {
  margin-right: 0.5rem;
  font-weight: bold;
}

.warning-card {
  background-color: #fffaf0;
  border-left: 4px solid #ed8936;
}

.warning-text {
  color: #c05621;
  margin: 0;
}

.source-badge {
  background-color: #4299e1;
  color: white;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

/* HTTP方法标签 */
.method-tag {
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: bold;
  text-transform: uppercase;
}

.get {
  background-color: #48bb78;
  color: white;
}

.post {
  background-color: #4299e1;
  color: white;
}

.put {
  background-color: #ed8936;
  color: white;
}

.delete {
  background-color: #f56565;
  color: white;
}

/* 调试区域 */
.debug-section {
  border: 1px dashed #ecc94b;
}

.debug-card {
  background-color: #fffbeb;
}

.debug-code {
  max-height: 500px;
  overflow: auto;
}

/* 响应和文档区域 */
.response-content {
  max-height: 400px;
  overflow: auto;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 0.5rem;
}

.tab {
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 500;
}

.tab.active {
  border-bottom: 2px solid #4f46e5;
  color: #4f46e5;
}

/* 响应式调整 */
@media (min-width: 768px) {
  .params-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .endpoint-selector {
    display: flex;
    align-items: center;
  }
  
  .endpoint-selector label {
    width: 100px;
    flex-shrink: 0;
  }
}

@media (max-width: 767px) {
  .function-router-demo {
    padding: 1rem;
  }
  
  .section-title {
    font-size: 1.3rem;
  }
  
  .card {
    padding: 1rem;
    margin: 0.75rem;
  }
  
  .info-item {
    grid-template-columns: 1fr;
  }
}
</style>
