import {createKoaRouter} from "../useDeps/useRadix3/forKoaLikeRouter.js";

/**
 * 文档验证器
 * @param {Object} doc 路由文档
 * @returns {Boolean} 是否有效
 */
function validateDoc(doc) {
  if (!doc || typeof doc !== 'object') {
    return false;
  }
  
  // 必需字段检查
  const requiredFields = ['summary', 'description', 'params', 'response'];
  return requiredFields.every(field => field in doc);
}

class FunctionRouter {
  constructor(opts = {}) {
    // 使用现有的 Koa 风格路由器作为基础
    this.koaRouter = createKoaRouter(opts);
    
    // 存储路由文档
    this.docs = {};
    
    // 配置选项
    this.opts = {
      enforceDocumentation: true, // 是否强制要求文档
      ...opts
    };
  }

  /**
   * 注册路由处理函数，强制要求文档
   * @param {String|String[]} methods - HTTP方法
   * @param {String} path - 路由路径
   * @param {Object} doc - 路由文档
   * @param {Function|Function[]} handler - 处理函数
   */
  register(methods, path, doc, handler) {
    // 如果文档是函数，说明没有传文档，调整参数
    if (typeof doc === 'function' || Array.isArray(doc)) {
      if (this.opts.enforceDocumentation) {
        throw new Error(`路由 [${methods}] ${path} 缺少文档`);
      }
      handler = doc;
      doc = { 
        summary: '未提供文档',
        description: '未提供详细描述',
        params: {},
        response: { type: 'any' }
      };
    } else if (doc && typeof doc === 'object') {
      // 确保文档对象包含所有必要字段
      doc.summary = doc.summary || '未提供摘要';
      doc.description = doc.description || '未提供描述';
      doc.params = doc.params || {};
      doc.response = doc.response || { type: 'any' };
    }
    
    // 验证文档
    if (this.opts.enforceDocumentation && !validateDoc(doc)) {
      throw new Error(`路由 [${methods}] ${path} 文档不完整`);
    }
    
    // 存储文档
    const docKey = Array.isArray(methods) ? methods.join(',') : methods;
    this.docs[`${docKey}:${path}`] = doc;
    
    console.log(`已保存路由文档: ${docKey}:${path}`, doc);
    
    // 将路由注册到底层 Koa 路由器
    return this.koaRouter.register(methods, path, handler);
  }

  /**
   * 获取指定路由的文档
   * @param {String} method - HTTP方法
   * @param {String} path - 路由路径
   * @returns {Object} 路由文档
   */
  getRouteDoc(method, path) {
    return this.docs[`${method}:${path}`] || null;
  }

  /**
   * 获取所有路由文档
   * @returns {Object} 所有路由文档
   */
  getAllDocs() {
    return this.docs;
  }

  // 通用的 HTTP 方法实现
  get(path, doc, ...middleware) {
    // 捕获调用栈，以获取实际调用 router.get() 的位置
    const registrationInfo = this._captureCallerInfo();
    
    // 添加注册信息到文档
    if (typeof doc === 'object' && doc !== null) {
      doc.registrationInfo = registrationInfo;
    }
    
    return this.register('GET', path, doc, middleware);
  }

  post(path, doc, ...middleware) {
    const registrationInfo = this._captureCallerInfo();
    
    if (typeof doc === 'object' && doc !== null) {
      doc.registrationInfo = registrationInfo;
    }
    
    return this.register('POST', path, doc, middleware);
  }

  put(path, doc, ...middleware) {
    const registrationInfo = this._captureCallerInfo();
    
    if (typeof doc === 'object' && doc !== null) {
      doc.registrationInfo = registrationInfo;
    }
    
    return this.register('PUT', path, doc, middleware);
  }

  delete(path, doc, ...middleware) {
    const registrationInfo = this._captureCallerInfo();
    
    if (typeof doc === 'object' && doc !== null) {
      doc.registrationInfo = registrationInfo;
    }
    
    return this.register('DELETE', path, doc, middleware);
  }

  patch(path, doc, ...middleware) {
    return this.register('PATCH', path, doc, middleware);
  }

  head(path, doc, ...middleware) {
    return this.register('HEAD', path, doc, middleware);
  }

  options(path, doc, ...middleware) {
    return this.register('OPTIONS', path, doc, middleware);
  }

  all(path, doc, ...middleware) {
    return this.register(this.koaRouter.methods, path, doc, middleware);
  }

  /**
   * 设置路由前缀或处理嵌套路由
   */
  use(prefix, ...middleware) {
    return this.koaRouter.use(prefix, ...middleware);
  }

  /**
   * 创建路由分组
   */
  group(opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = {};
    }
    
    const prefix = opts.prefix || '';
    const router = new FunctionRouter({
      ...this.opts,
      prefix: this.koaRouter.prefix + prefix
    });
    
    callback(router);
    this.use(router.koaRouter);
    
    // 合并文档
    Object.assign(this.docs, router.docs);
    
    return this;
  }

  /**
   * 生成路由处理中间件，完全兼容 Koa
   */
  routes() {
    return this.koaRouter.routes();
  }

  /**
   * 生成处理OPTIONS请求和405/501状态的中间件
   */
  allowedMethods(options = {}) {
    return this.koaRouter.allowedMethods(options);
  }

  /**
   * 根据命名路由和参数生成URL
   */
  url(name, params, options) {
    return this.koaRouter.url(name, params, options);
  }

  /**
   * 重定向方法
   */
  redirect(source, destination, code = 302) {
    return this.koaRouter.redirect(source, destination, code);
  }

  /**
   * 生成 OpenAPI/Swagger 格式的 API 文档
   * @returns {Object} OpenAPI 文档对象
   */
  generateOpenAPIDoc(info = {}) {
    const paths = {};
    
    // 遍历所有路由文档，生成 OpenAPI 路径
    Object.keys(this.docs).forEach(key => {
      const [method, ...pathParts] = key.split(':');
      const path = pathParts.join(':'); // 处理路径中可能包含冒号的情况
      const doc = this.docs[key];
      
      if (!paths[path]) {
        paths[path] = {};
      }
      
      const methods = method.split(',');
      methods.forEach(m => {
        paths[path][m.toLowerCase()] = {
          summary: doc.summary,
          description: doc.description,
          parameters: this._convertParams(doc.params, path),
          responses: this._convertResponse(doc.response)
        };
      });
    });
    
    return {
      openapi: '3.0.0',
      info: {
        title: 'API 文档',
        version: '1.0.0',
        ...info
      },
      paths
    };
  }

  /**
   * 转换参数格式为 OpenAPI 格式
   * @private
   */
  _convertParams(params, path) {
    if (!params) return [];
    
    // 从路径中提取参数
    const pathParams = [];
    const pathRegex = /:([^/]+)/g;
    let match;
    
    while ((match = pathRegex.exec(path)) !== null) {
      pathParams.push(match[1]);
    }
    
    return Object.keys(params).map(name => {
      const param = params[name];
      // 自动检测参数位置
      const inValue = pathParams.includes(name) ? 'path' : 
                     (param.in || 'query');
      
      return {
        name,
        in: inValue,
        description: param.description || '',
        required: inValue === 'path' ? true : (param.required !== false),
        schema: {
          type: param.type || 'string',
          format: param.format,
          enum: param.enum,
          default: param.default
        }
      };
    });
  }

  /**
   * 转换响应格式为 OpenAPI 格式
   * @private
   */
  _convertResponse(response) {
    if (!response) return { 
      '200': { description: 'Successful response' } 
    };
    
    const statusCodes = response.statusCodes || { '200': 'Successful response' };
    const result = {};
    
    Object.keys(statusCodes).forEach(code => {
      result[code] = {
        description: statusCodes[code],
        content: {
          'application/json': {
            schema: {
              type: response.type || 'object',
              properties: response.properties || {},
              required: response.required || []
            }
          }
        }
      };
    });
    
    return result;
  }

  // 新增一个辅助方法，用于捕获调用者信息
  _captureCallerInfo() {
    const stackTrace = new Error().stack;
    const stackLines = stackTrace.split('\n');
    
    // 打印完整栈用于调试
    console.log('完整调用栈:', stackTrace);
    
    let registrationInfo = {
      filePath: '未知文件',
      lineNumber: '0',
      columnNumber: '0',
      fullStack: stackTrace
    };
    
    // 分析调用栈，寻找外部调用者（跳过当前文件的调用）
    for (let i = 0; i < stackLines.length; i++) {
      const line = stackLines[i];
      // 跳过不包含 'at' 的行
      if (!line.includes('at ')) continue;
      
      // 检查是否是框架内部调用
      const isInternalCall = line.includes('forFunctionEndpoints.js') || 
                            line.includes('node_modules') ||
                            line.includes('internal/');
      
      // 如果不是内部调用，就是我们要找的外部调用点
      if (!isInternalCall) {
        const match = line.match(/at\s+(?:.*?\s+\()?([^()]+?)(?::(\d+):(\d+))?\)?$/);
        if (match) {
          const [, filePath, lineNum, colNum] = match;
          registrationInfo = {
            filePath: filePath.trim(),
            lineNumber: lineNum || '1',
            columnNumber: colNum || '1',
            fullStack: stackTrace // 保存完整调用栈用于调试
          };
          console.log('找到外部调用点:', registrationInfo);
          break;
        }
      }
    }
    
    return registrationInfo;
  }
}

/**
 * 创建函数端点路由器
 * @param {Object} opts 配置选项
 * @returns {FunctionRouter} 函数端点路由器实例
 */
export  function createFunctionRouter(opts = {}) {
  return new FunctionRouter(opts);
}
