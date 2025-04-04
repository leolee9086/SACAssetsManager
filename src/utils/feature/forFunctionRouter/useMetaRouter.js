/**
 * 元路由功能 - 提供API文档和测试功能
 * 
 * 此模块注册元路由，用于查看所有路由文档并提供测试功能
 */

/**
 * 添加元路由到路由器
 * @param {Object} router - 路由器实例
 * @param {Object} options - 配置选项
 * @param {String} options.prefix - API前缀，默认为'/meta'
 * @param {Boolean} options.enabled - 是否启用元路由，默认为true
 * @param {Boolean} options.requireAuth - 是否需要认证，默认为false
 * @param {Function} options.authHandler - 认证处理函数
 * @returns {Object} 路由器实例
 */
export function setupMetaRouter(router, options = {}) {
  if (!router) {
    throw new Error('路由器实例不能为空');
  }
  
  const {
    prefix = '/meta',
    enabled = true,
    requireAuth = false,
    authHandler = defaultAuthHandler
  } = options;
  
  if (!enabled) {
    console.log('元路由功能已禁用');
    return router;
  }
  
  // 检查路由器是否具有必要的方法
  if (typeof router.get !== 'function' || typeof router.post !== 'function') {
    throw new Error('提供的路由器不支持必要的HTTP方法');
  }
  
  if (typeof router.getAllDocs !== 'function') {
    throw new Error('提供的路由器没有实现getAllDocs方法');
  }
  
  // 注册元路由端点
  
  // 1. 获取所有路由信息
  router.get(`${prefix}/routes`, {
    summary: '获取所有注册路由信息',
    description: '返回系统中所有注册的路由及其文档信息',
    response: {
      type: 'object',
      properties: {
        routes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              method: { type: 'string' },
              path: { type: 'string' },
              summary: { type: 'string' },
              description: { type: 'string' }
            }
          }
        }
      }
    }
  }, async (ctx) => {
    // 应用认证检查
    if (requireAuth && !(await authHandler(ctx))) {
      return;
    }
    
    const allDocs = router.getAllDocs();
    const routes = [];
    
    // 转换文档格式为路由列表
    for (const [key, doc] of Object.entries(allDocs)) {
      const [method, path] = key.split(':');
      routes.push({
        method,
        path,
        summary: doc.summary || '无摘要',
        description: doc.description || '无描述',
        docKey: key,
        params: doc.params || {},
        response: doc.response || { type: 'any' },
        registrationInfo: doc.registrationInfo || null
      });
    }
    
    ctx.body = { routes };
  });
  
  // 2. 获取指定路由的详细信息
  router.get(`${prefix}/routes/:docKey`, {
    summary: '获取指定路由的详细信息',
    description: '根据路由的文档键（method:path）获取详细信息',
    params: {
      docKey: {
        type: 'string',
        description: '路由文档键，格式为"HTTP方法:路径"',
        required: true
      }
    },
    response: {
      type: 'object',
      properties: {
        route: { type: 'object' }
      }
    }
  }, async (ctx) => {
    // 应用认证检查
    if (requireAuth && !(await authHandler(ctx))) {
      return;
    }
    
    const { docKey } = ctx.params;
    const allDocs = router.getAllDocs();
    
    if (!allDocs[docKey]) {
      ctx.status = 404;
      ctx.body = { error: '未找到指定路由' };
      return;
    }
    
    const doc = allDocs[docKey];
    const [method, path] = docKey.split(':');
    
    ctx.body = {
      route: {
        method,
        path,
        summary: doc.summary || '无摘要',
        description: doc.description || '无描述',
        params: doc.params || {},
        response: doc.response || { type: 'any' },
        registrationInfo: doc.registrationInfo || null
      }
    };
  });
  
  // 3. 测试指定路由
  router.post(`${prefix}/test`, {
    summary: '测试指定路由',
    description: '发送请求到指定路由并返回结果',
    params: {
      method: {
        type: 'string',
        description: 'HTTP方法',
        required: true
      },
      path: {
        type: 'string',
        description: '路由路径',
        required: true
      },
      queryParams: {
        type: 'object',
        description: 'URL查询参数'
      },
      bodyParams: {
        type: 'object',
        description: '请求体参数'
      },
      headers: {
        type: 'object',
        description: '请求头'
      }
    },
    response: {
      type: 'object',
      properties: {
        result: { type: 'any' },
        status: { type: 'number' },
        headers: { type: 'object' },
        timing: { type: 'number' }
      }
    }
  }, async (ctx) => {
    // 应用认证检查
    if (requireAuth && !(await authHandler(ctx))) {
      return;
    }
    
    const { method, path, queryParams = {}, bodyParams = {}, headers = {} } = ctx.request.body;
    
    try {
      // 构建测试请求URL
      let testUrl = path;
      const searchParams = new URLSearchParams();
      
      // 添加查询参数
      for (const [key, value] of Object.entries(queryParams)) {
        searchParams.append(key, String(value));
      }
      
      // 将查询参数添加到URL
      const queryString = searchParams.toString();
      if (queryString) {
        testUrl += `?${queryString}`;
      }
      
      // 准备请求头
      const requestHeaders = {
        'Content-Type': 'application/json',
        ...headers
      };
      
      // 记录开始时间
      const startTime = Date.now();
      
      // 发送测试请求
      const response = await fetch(testUrl, {
        method,
        headers: requestHeaders,
        body: method !== 'GET' && method !== 'HEAD' ? JSON.stringify(bodyParams) : undefined,
        redirect: 'follow'
      });
      
      // 计算响应时间
      const timing = Date.now() - startTime;
      
      // 解析响应
      let responseBody;
      try {
        responseBody = await response.json();
      } catch (e) {
        responseBody = await response.text();
      }
      
      // 获取响应头
      const responseHeaders = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      
      // 返回测试结果
      ctx.body = {
        result: responseBody,
        status: response.status,
        headers: responseHeaders,
        timing
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        error: error.message,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
      };
    }
  });
  
  // 4. 获取OpenAPI文档
  router.get(`${prefix}/openapi`, {
    summary: '获取OpenAPI文档',
    description: '返回系统的OpenAPI文档',
    response: {
      type: 'object'
    }
  }, async (ctx) => {
    // 应用认证检查
    if (requireAuth && !(await authHandler(ctx))) {
      return;
    }
    
    if (typeof router.generateOpenAPIDoc !== 'function') {
      ctx.status = 501;
      ctx.body = { error: '路由器未实现generateOpenAPIDoc方法' };
      return;
    }
    
    try {
      const openApi = router.generateOpenAPIDoc({
        title: '应用API文档',
        version: '1.0.0',
        description: '自动生成的API文档'
      });
      
      ctx.body = openApi;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  });
  
  // 5. 提供元路由UI页面
  router.get(prefix, {
    summary: '元路由UI',
    description: '提供元路由UI界面',
    response: {
      type: 'string'
    }
  }, async (ctx) => {
    // 应用认证检查
    if (requireAuth && !(await authHandler(ctx))) {
      return;
    }
    
    ctx.type = 'text/html';
    ctx.body = generateMetaRouterUI(prefix);
  });
  
  console.log(`元路由已设置，访问 ${prefix} 查看API文档和测试页面`);
  
  return router;
}

/**
 * 默认认证处理函数
 * @param {Object} ctx - Koa上下文
 * @returns {Boolean} 认证结果
 */
async function defaultAuthHandler(ctx) {
  // 默认认证处理程序总是返回true
  return true;
}

/**
 * 生成元路由UI页面
 * @param {String} prefix - 元路由前缀
 * @returns {String} HTML页面
 */
function generateMetaRouterUI(prefix) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API 元路由</title>
  <style>
    :root {
      --primary-color: #4f46e5;
      --primary-hover: #4338ca;
      --bg-color: #f9fafb;
      --card-bg: #ffffff;
      --text-color: #1f2937;
      --text-secondary: #6b7280;
      --border-color: #e5e7eb;
      --success-color: #10b981;
      --error-color: #ef4444;
      --warning-color: #f59e0b;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      background-color: var(--bg-color);
      color: var(--text-color);
      line-height: 1.5;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    header {
      margin-bottom: 30px;
      text-align: center;
    }
    
    h1 {
      color: var(--primary-color);
      margin-bottom: 10px;
    }
    
    .subtitle {
      color: var(--text-secondary);
      font-size: 1.1rem;
    }
    
    .card {
      background-color: var(--card-bg);
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      margin-bottom: 30px;
      overflow: hidden;
    }
    
    .card-header {
      padding: 15px 20px;
      border-bottom: 1px solid var(--border-color);
    }
    
    .card-title {
      font-size: 1.3rem;
      font-weight: 600;
      display: flex;
      align-items: center;
    }
    
    .card-body {
      padding: 20px;
    }
    
    .route-list {
      list-style: none;
    }
    
    .route-item {
      padding: 12px 15px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .route-item:last-child {
      border-bottom: none;
    }
    
    .route-item:hover {
      background-color: rgba(79, 70, 229, 0.05);
    }
    
    .route-method {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
      min-width: 70px;
      text-align: center;
      margin-right: 15px;
    }
    
    .method-get {
      background-color: #dbeafe;
      color: #1e40af;
    }
    
    .method-post {
      background-color: #dcfce7;
      color: #166534;
    }
    
    .method-put {
      background-color: #fef3c7;
      color: #92400e;
    }
    
    .method-delete {
      background-color: #fee2e2;
      color: #b91c1c;
    }
    
    .method-patch {
      background-color: #e0e7ff;
      color: #3730a3;
    }
    
    .route-path {
      font-family: monospace;
      font-weight: 500;
      flex: 1;
    }
    
    .route-summary {
      color: var(--text-secondary);
      font-size: 0.9rem;
      margin-left: 20px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 300px;
    }
    
    .route-details {
      background-color: #f8fafc;
      padding: 20px;
      display: none;
    }
    
    .route-details.active {
      display: block;
    }
    
    .detail-item {
      margin-bottom: 15px;
    }
    
    .detail-label {
      display: block;
      font-weight: 600;
      margin-bottom: 5px;
    }
    
    .code-block {
      background-color: #1e293b;
      color: #e2e8f0;
      padding: 15px;
      border-radius: 6px;
      font-family: monospace;
      white-space: pre-wrap;
      overflow-x: auto;
    }
    
    .tabs {
      display: flex;
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 20px;
    }
    
    .tab {
      padding: 10px 20px;
      cursor: pointer;
      border-bottom: 2px solid transparent;
    }
    
    .tab.active {
      border-bottom-color: var(--primary-color);
      color: var(--primary-color);
      font-weight: 500;
    }
    
    .tab-content {
      display: none;
    }
    
    .tab-content.active {
      display: block;
    }
    
    .test-form {
      margin-top: 20px;
    }
    
    .form-group {
      margin-bottom: 15px;
    }
    
    .form-label {
      display: block;
      margin-bottom: 5px;
      font-weight: 500;
    }
    
    .form-input {
      width: 100%;
      padding: 8px 12px;
      border-radius: 4px;
      border: 1px solid var(--border-color);
      font-family: inherit;
      font-size: inherit;
    }
    
    textarea.form-input {
      min-height: 120px;
      font-family: monospace;
    }
    
    .btn {
      background-color: var(--primary-color);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
    }
    
    .btn:hover {
      background-color: var(--primary-hover);
    }
    
    .response-section {
      margin-top: 20px;
      display: none;
    }
    
    .response-section.visible {
      display: block;
    }
    
    .response-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    
    .status-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 500;
    }
    
    .status-success {
      background-color: #dcfce7;
      color: #166534;
    }
    
    .status-error {
      background-color: #fee2e2;
      color: #b91c1c;
    }
    
    .status-redirect {
      background-color: #eff6ff;
      color: #1e40af;
    }
    
    .timing {
      font-size: 0.8rem;
      color: #6b7280;
    }
    
    .response-body {
      background-color: #1e293b;
      color: #e2e8f0;
      padding: 15px;
      border-radius: 6px;
      font-family: monospace;
      white-space: pre-wrap;
      overflow-x: auto;
    }
    
    .loading {
      text-align: center;
      padding: 20px;
      display: none;
    }
    
    .loading.visible {
      display: block;
    }
    
    .spinner {
      border: 4px solid rgba(0, 0, 0, 0.1);
      border-radius: 50%;
      border-top: 4px solid var(--primary-color);
      width: 30px;
      height: 30px;
      animation: spin 1s linear infinite;
      margin: 0 auto 10px;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .search-box {
      padding: 10px 15px;
      margin-bottom: 20px;
      width: 100%;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      font-size: 0.9rem;
    }
    
    .route-count {
      background-color: #e0e7ff;
      color: #4338ca;
      font-size: 0.8rem;
      padding: 2px 8px;
      border-radius: 12px;
      margin-left: 10px;
    }
    
    @media (max-width: 768px) {
      .container {
        padding: 10px;
      }
      
      .route-summary {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>API 元路由</h1>
      <div class="subtitle">查看和测试API端点</div>
    </header>
    
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">
          API 端点
          <span class="route-count" id="routeCount">0</span>
        </h2>
      </div>
      <div class="card-body">
        <input type="text" class="search-box" id="searchRoutes" placeholder="搜索端点...">
        <ul class="route-list" id="routeList">
          <!-- 路由列表将在这里动态生成 -->
          <li class="loading visible">
            <div class="spinner"></div>
            <div>加载端点...</div>
          </li>
        </ul>
      </div>
    </div>
    
    <div class="card" id="routeDetailCard" style="display: none;">
      <div class="card-header">
        <h2 class="card-title" id="routeDetailTitle">路由详情</h2>
      </div>
      <div class="card-body">
        <div class="tabs">
          <div class="tab active" data-tab="details">详情</div>
          <div class="tab" data-tab="test">测试</div>
          <div class="tab" data-tab="code">代码</div>
        </div>
        
        <div class="tab-content active" id="detailsTab">
          <div class="detail-item">
            <span class="detail-label">摘要</span>
            <div id="routeSummary"></div>
          </div>
          <div class="detail-item">
            <span class="detail-label">描述</span>
            <div id="routeDescription"></div>
          </div>
          <div class="detail-item">
            <span class="detail-label">参数</span>
            <div id="routeParams"></div>
          </div>
          <div class="detail-item">
            <span class="detail-label">响应类型</span>
            <div id="routeResponse"></div>
          </div>
          <div class="detail-item" id="registrationInfoContainer">
            <span class="detail-label">注册位置</span>
            <div id="registrationInfo"></div>
          </div>
        </div>
        
        <div class="tab-content" id="testTab">
          <div class="test-form">
            <div class="form-group">
              <label class="form-label">请求方法</label>
              <input type="text" class="form-input" id="testMethod" readonly>
            </div>
            <div class="form-group">
              <label class="form-label">请求路径</label>
              <input type="text" class="form-input" id="testPath" readonly>
            </div>
            <div class="form-group">
              <label class="form-label">查询参数 (JSON 格式)</label>
              <textarea class="form-input" id="testQueryParams">{}</textarea>
            </div>
            <div class="form-group" id="testBodyParamsContainer">
              <label class="form-label">请求体 (JSON 格式)</label>
              <textarea class="form-input" id="testBodyParams">{}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">请求头 (JSON 格式)</label>
              <textarea class="form-input" id="testHeaders">{
  "Content-Type": "application/json"
}</textarea>
            </div>
            <button class="btn" id="sendTestRequest">发送请求</button>
          </div>
          
          <div class="loading" id="testLoading">
            <div class="spinner"></div>
            <div>发送请求中...</div>
          </div>
          
          <div class="response-section" id="responseSection">
            <div class="response-header">
              <span class="status-badge" id="responseStatus">200 OK</span>
              <span class="timing" id="responseTiming">0ms</span>
            </div>
            <pre class="response-body" id="responseBody"></pre>
          </div>
        </div>
        
        <div class="tab-content" id="codeTab">
          <div class="code-block" id="routeCode">// 没有可用的代码</div>
        </div>
      </div>
    </div>
  </div>
  
  <script>
    // 全局变量
    let allRoutes = [];
    let selectedRoute = null;
    
    // DOM 元素
    const routeList = document.getElementById('routeList');
    const routeCount = document.getElementById('routeCount');
    const searchBox = document.getElementById('searchRoutes');
    const routeDetailCard = document.getElementById('routeDetailCard');
    const routeDetailTitle = document.getElementById('routeDetailTitle');
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // 详情面板元素
    const routeSummary = document.getElementById('routeSummary');
    const routeDescription = document.getElementById('routeDescription');
    const routeParams = document.getElementById('routeParams');
    const routeResponse = document.getElementById('routeResponse');
    const registrationInfoContainer = document.getElementById('registrationInfoContainer');
    const registrationInfo = document.getElementById('registrationInfo');
    
    // 测试面板元素
    const testMethod = document.getElementById('testMethod');
    const testPath = document.getElementById('testPath');
    const testQueryParams = document.getElementById('testQueryParams');
    const testBodyParams = document.getElementById('testBodyParams');
    const testBodyParamsContainer = document.getElementById('testBodyParamsContainer');
    const testHeaders = document.getElementById('testHeaders');
    const sendTestRequest = document.getElementById('sendTestRequest');
    const testLoading = document.getElementById('testLoading');
    const responseSection = document.getElementById('responseSection');
    const responseStatus = document.getElementById('responseStatus');
    const responseTiming = document.getElementById('responseTiming');
    const responseBody = document.getElementById('responseBody');
    
    // 代码面板元素
    const routeCode = document.getElementById('routeCode');
    
    // 加载所有路由
    async function loadRoutes() {
      try {
        const response = await fetch('${prefix}/routes');
        const data = await response.json();
        
        allRoutes = data.routes || [];
        routeCount.textContent = allRoutes.length;
        
        renderRouteList(allRoutes);
      } catch (error) {
        console.error('加载路由失败:', error);
        routeList.innerHTML = '<li>加载路由失败</li>';
      }
    }
    
    // 渲染路由列表
    function renderRouteList(routes) {
      routeList.innerHTML = '';
      
      if (routes.length === 0) {
        routeList.innerHTML = '<li class="route-item">没有找到匹配的路由</li>';
        return;
      }
      
      routes.forEach(route => {
        const li = document.createElement('li');
        li.className = 'route-item';
        li.dataset.docKey = route.docKey;
        
        const methodSpan = document.createElement('span');
        methodSpan.className = \`route-method method-\${route.method.toLowerCase()}\`;
        methodSpan.textContent = route.method;
        
        const pathSpan = document.createElement('span');
        pathSpan.className = 'route-path';
        pathSpan.textContent = route.path;
        
        const summarySpan = document.createElement('span');
        summarySpan.className = 'route-summary';
        summarySpan.textContent = route.summary;
        
        li.appendChild(methodSpan);
        li.appendChild(pathSpan);
        li.appendChild(summarySpan);
        
        li.addEventListener('click', () => selectRoute(route));
        
        routeList.appendChild(li);
      });
    }
    
    // 选择路由
    async function selectRoute(route) {
      // 获取详细信息
      try {
        const response = await fetch(\`\${prefix}/routes/\${encodeURIComponent(route.docKey)}\`);
        const data = await response.json();
        
        if (data.route) {
          selectedRoute = data.route;
          
          // 显示详情卡片
          routeDetailCard.style.display = 'block';
          routeDetailTitle.textContent = \`\${route.method} \${route.path}\`;
          
          // 填充详情
          routeSummary.textContent = selectedRoute.summary || '无摘要';
          routeDescription.textContent = selectedRoute.description || '无描述';
          
          // 参数
          if (selectedRoute.params && Object.keys(selectedRoute.params).length > 0) {
            routeParams.innerHTML = '<div class="code-block">' + 
              JSON.stringify(selectedRoute.params, null, 2) + '</div>';
          } else {
            routeParams.textContent = '无参数';
          }
          
          // 响应
          if (selectedRoute.response) {
            routeResponse.innerHTML = '<div class="code-block">' + 
              JSON.stringify(selectedRoute.response, null, 2) + '</div>';
          } else {
            routeResponse.textContent = '未定义响应类型';
          }
          
          // 注册点信息
          if (selectedRoute.registrationInfo) {
            registrationInfoContainer.style.display = 'block';
            registrationInfo.innerHTML = \`
              <div>文件: \${selectedRoute.registrationInfo.filePath}</div>
              <div>行号: \${selectedRoute.registrationInfo.lineNumber}</div>
              <div>列号: \${selectedRoute.registrationInfo.columnNumber}</div>
            \`;
          } else {
            registrationInfoContainer.style.display = 'none';
          }
          
          // 测试信息
          testMethod.value = selectedRoute.method;
          testPath.value = selectedRoute.path;
          
          // 对于GET请求隐藏body参数
          if (selectedRoute.method === 'GET' || selectedRoute.method === 'HEAD') {
            testBodyParamsContainer.style.display = 'none';
          } else {
            testBodyParamsContainer.style.display = 'block';
          }
          
          // 代码信息
          if (selectedRoute.registrationInfo) {
            routeCode.textContent = \`// 文件: \${selectedRoute.registrationInfo.filePath}:\\n// 行号: \${selectedRoute.registrationInfo.lineNumber}\\n\\n\` +
              \`\${selectedRoute.method.toLowerCase()}('\${selectedRoute.path}', {\\n\` +
              \`  summary: '\${selectedRoute.summary}',\\n\` +
              \`  description: '\${selectedRoute.description}',\\n\` +
              \`  params: \${JSON.stringify(selectedRoute.params, null, 2)},\\n\` +
              \`  response: \${JSON.stringify(selectedRoute.response, null, 2)}\\n\` +
              \`}, async (ctx) => {\\n  // 处理逻辑\\n});\`;
          } else {
            routeCode.textContent = '// 无可用代码';
          }
          
          // 重置响应部分
          responseSection.classList.remove('visible');
          responseBody.textContent = '';
        }
      } catch (error) {
        console.error('获取路由详情失败:', error);
      }
    }
    
    // 发送测试请求
    async function sendTestRequest() {
      if (!selectedRoute) return;
      
      try {
        // 解析测试参数
        let queryParams = {};
        let bodyParams = {};
        let headers = {};
        
        try {
          queryParams = JSON.parse(testQueryParams.value);
        } catch (e) {
          alert('查询参数必须是有效的JSON格式');
          return;
        }
        
        try {
          bodyParams = JSON.parse(testBodyParams.value);
        } catch (e) {
          if (selectedRoute.method !== 'GET' && selectedRoute.method !== 'HEAD') {
            alert('请求体必须是有效的JSON格式');
            return;
          }
        }
        
        try {
          headers = JSON.parse(testHeaders.value);
        } catch (e) {
          alert('请求头必须是有效的JSON格式');
          return;
        }
        
        // 显示加载中
        testLoading.classList.add('visible');
        responseSection.classList.remove('visible');
        
        // 发送测试请求
        const response = await fetch(\`\${prefix}/test\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            method: selectedRoute.method,
            path: selectedRoute.path,
            queryParams,
            bodyParams,
            headers
          })
        });
        
        const result = await response.json();
        
        // 隐藏加载中
        testLoading.classList.remove('visible');
        
        // 显示响应
        responseSection.classList.add('visible');
        
        // 状态
        const statusCode = result.status || response.status;
        let statusClass = 'status-error';
        
        if (statusCode >= 200 && statusCode < 300) {
          statusClass = 'status-success';
        } else if (statusCode >= 300 && statusCode < 400) {
          statusClass = 'status-redirect';
        }
        
        responseStatus.textContent = \`\${statusCode} \${result.statusText || ''}\`;
        responseStatus.className = \`status-badge \${statusClass}\`;
        
        // 响应时间
        responseTiming.textContent = \`\${result.timing || 0}ms\`;
        
        // 响应体
        responseBody.textContent = JSON.stringify(result.result || result, null, 2);
      } catch (error) {
        testLoading.classList.remove('visible');
        responseSection.classList.add('visible');
        responseStatus.textContent = '错误';
        responseStatus.className = 'status-badge status-error';
        responseBody.textContent = error.message;
      }
    }
    
    // 搜索路由
    function searchRoutes(query) {
      if (!query) {
        renderRouteList(allRoutes);
        return;
      }
      
      const lowerQuery = query.toLowerCase();
      const filteredRoutes = allRoutes.filter(route => {
        return route.path.toLowerCase().includes(lowerQuery) ||
               route.method.toLowerCase().includes(lowerQuery) ||
               route.summary.toLowerCase().includes(lowerQuery) ||
               route.description.toLowerCase().includes(lowerQuery);
      });
      
      renderRouteList(filteredRoutes);
    }
    
    // 事件监听
    document.addEventListener('DOMContentLoaded', () => {
      loadRoutes();
      
      // 标签切换
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          tabs.forEach(t => t.classList.remove('active'));
          tabContents.forEach(c => c.classList.remove('active'));
          
          tab.classList.add('active');
          const tabId = tab.dataset.tab + 'Tab';
          document.getElementById(tabId).classList.add('active');
        });
      });
      
      // 搜索
      searchBox.addEventListener('input', (e) => {
        searchRoutes(e.target.value);
      });
      
      // 发送测试请求
      sendTestRequest.addEventListener('click', () => {
        window.sendTestRequest();
      });
    });
    
    // 公开函数
    window.sendTestRequest = sendTestRequest;
  </script>
</body>
</html>
  `;
}
