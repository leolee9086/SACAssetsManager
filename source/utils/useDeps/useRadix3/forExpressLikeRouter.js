import * as radix from "../../../../static/radix3.mjs";
import { pathToRegexp, compile } from "../../../../static/path-to-regexp.js";

class Layer {
  constructor(path, methods, middleware, opts = {}) {
    this.path = path;
    this.methods = methods;
    this.middleware = Array.isArray(middleware) ? middleware : [middleware];
    this.name = opts.name || null;
    // 修复参数名称提取
    const keys = [];
    this.regexp = pathToRegexp(path, keys);
    this.paramNames = keys.map(key => key.name);
    this.opts = opts;
    // 为路由生成URL创建编译函数
    this.pathCompiler = compile(path);
  }
}

class Router {
  constructor(opts = {}) {
    this.opts = opts;
    this.prefix = opts.prefix || '';
    this.methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    
    // 为每个HTTP方法创建一个radix树
    this.trees = {};
    this.methods.forEach(method => {
      this.trees[method] = radix.createRouter();
    });
    
    // 存储所有路由层
    this.stack = [];
    // 存储命名路由
    this.namedRoutes = {};
    
    // 创建各种HTTP方法处理函数
    this.methods.forEach(method => {
      this[method.toLowerCase()] = this._createMethodFunction(method);
    });
    
    // 兼容Express的all方法
    this.all = this._createMethodFunction('ALL');
  }

  /**
   * 创建HTTP方法处理函数
   * @param {String} method - HTTP方法
   * @returns {Function} 方法处理函数
   */
  _createMethodFunction(method) {
    return function(path, ...handlers) {
      // Express风格不使用命名路由，所以简化处理
      return this.register(method, path, {}, handlers);
    };
  }

  /**
   * 注册路由处理函数
   * @param {String|String[]} methods - HTTP方法
   * @param {String|RegExp|Array} path - 路由路径
   * @param {Object} [opts] - 路由选项
   * @param {Function[]} middleware - 中间件函数数组
   */
  register(methods, path, opts, middleware) {
    // 处理数组形式的路径
    if (Array.isArray(path)) {
      for (const p of path) {
        this.register(methods, p, opts, middleware);
      }
      return this;
    }
    
    // 路径规范化处理
    const normalizedPath = this._pathNormalization(path);
    
    // 处理参数重载 (opts是可选的)
    if (typeof opts === 'function' || Array.isArray(opts)) {
      middleware = opts;
      opts = {};
    }
    
    const fullPath = this.prefix + normalizedPath;
    
    if (!Array.isArray(middleware)) {
      middleware = [middleware];
    }
    
    // 确保methods是数组
    if (!Array.isArray(methods)) {
      methods = [methods];
    }
    
    // 创建路由层
    const layer = new Layer(fullPath, methods, middleware, opts);
    
    // 如果指定了路由名称，存储命名路由
    if (layer.name) {
      this.namedRoutes[layer.name] = layer;
    }
    
    this.stack.push(layer);
    
    // 在radix树中注册
    for (const method of methods) {
      if (this.methods.includes(method) || method === 'ALL') {
        for (const m of method === 'ALL' ? this.methods : [method]) {
          const tree = this.trees[m];
          if (tree) {
            tree.insert(fullPath, { middleware, layer });
          }
        }
      }
    }
    
    return this;
  }

  /**
   * 设置路由前缀或处理嵌套路由
   * @param {String|Router} prefix - 前缀或路由实例
   * @param {Function|Router} [router] - 中间件或子路由
   */
  use(prefix, router) {
    // Express风格的use: app.use('/path', router)
    if (typeof prefix === 'string') {
      if (router instanceof Router) {
        // 合并子路由的stack
        router.stack.forEach(layer => {
          const cloned = new Layer(
            this.prefix + prefix + layer.path.slice(router.prefix.length),
            layer.methods,
            layer.middleware,
            layer.opts
          );
          
          // 保留命名路由
          if (cloned.name) {
            this.namedRoutes[cloned.name] = cloned;
          }
          
          this.stack.push(cloned);
          
          // 更新radix树
          for (const method of layer.methods) {
            if (this.methods.includes(method) || method === 'ALL') {
              const tree = this.trees[method] || this.trees['GET'];
              tree.insert(cloned.path, { middleware: cloned.middleware, layer: cloned });
            }
          }
        });
        
        return this;
      } else if (typeof router === 'function') {
        // Express中间件: app.use('/path', function(req, res, next) {...})
        return this.register('ALL', prefix + '(.*)', {}, router);
      }
    } else if (typeof prefix === 'function') {
      // Express中间件: app.use(function(req, res, next) {...})
      return this.register('ALL', '(.*)', {}, prefix);
    } else if (prefix instanceof Router) {
      // 直接使用另一个路由: app.use(router)
      const router = prefix;
      
      router.stack.forEach(layer => {
        this.stack.push(layer);
        
        // 更新radix树
        for (const method of layer.methods) {
          if (this.methods.includes(method) || method === 'ALL') {
            const tree = this.trees[method] || this.trees['GET'];
            tree.insert(layer.path, { middleware: layer.middleware, layer });
          }
        }
      });
      
      // 合并命名路由
      Object.keys(router.namedRoutes).forEach(name => {
        this.namedRoutes[name] = router.namedRoutes[name];
      });
    }
    
    return this;
  }

  /**
   * 根据命名路由和参数生成URL
   * @param {String} name - 路由名称
   * @param {Object} params - 路径参数
   * @param {Object} options - 选项
   * @returns {String} URL
   */
  url(name, params, options) {
    const route = this.namedRoutes[name];
    
    if (!route) {
      throw new Error(`没有找到名为 ${name} 的路由`);
    }
    
    const args = params;
    const url = route.pathCompiler(args);
    
    let querystring = '';
    
    if (options && options.query) {
      const query = options.query;
      querystring = Object.keys(query).map(key => {
        let value = query[key];
        if (Array.isArray(value)) {
          return value.map(v => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`).join('&');
        }
        return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
      }).join('&');
      
      if (querystring) {
        querystring = `?${querystring}`;
      }
    }
    
    return url + querystring;
  }

  /**
   * 重定向方法 (Express风格)
   * @param {String} source - 源路径
   * @param {String} destination - 目标路径
   * @param {Number} [code=302] - HTTP状态码
   */
  redirect(source, destination, code = 302) {
    return this.all(source, (req, res) => {
      res.redirect(code, destination);
    });
  }

  /**
   * 匹配路径和方法
   * @param {String} path - 路径
   * @param {String} method - HTTP方法 
   * @returns {Object} 匹配结果
   */
  match(path, method) {
    const result = {
      routes: [],
      params: {},
      pathMatched: ''
    };
    
    // 检查是否有ALL方法的匹配
    this._checkMethodMatch(path, 'ALL', result);
    
    // 再检查具体方法的匹配
    if (method !== 'ALL') {
      this._checkMethodMatch(path, method, result);
    }
    
    return result;
  }
  
  /**
   * 检查特定方法的路由匹配
   * @param {String} path - 路径
   * @param {String} method - HTTP方法
   * @param {Object} result - 匹配结果
   */
  _checkMethodMatch(path, method, result) {
    // 先查找radix树是否有精确匹配
    const tree = this.trees[method];
    if (tree) {
      const matched = tree.lookup(path);
      if (matched) {
        result.pathMatched = path;
        if (matched.params && typeof matched.params === 'object') {
          Object.assign(result.params, matched.params);
        }
        if (matched.data && matched.data.layer && !result.routes.includes(matched.data.layer)) {
          result.routes.push(matched.data.layer);
        }
      }
    }
    
    // 如果没有精确匹配或需要补充，尝试正则匹配
    for (const layer of this.stack) {
      if ((layer.methods.includes(method) || layer.methods.includes('ALL')) && 
          !result.routes.includes(layer)) {
        const matches = layer.regexp.exec(path);
        if (matches) {
          result.pathMatched = path;
          
          // 提取正则参数
          if (layer.paramNames && layer.paramNames.length) {
            for (let i = 1; i < matches.length; i++) {
              const name = layer.paramNames[i - 1];
              if (name) result.params[name] = matches[i] || '';
            }
          }
          
          result.routes.push(layer);
        }
      }
    }
  }

  /**
   * 支持Express的next('route')功能
   * @private
   */
  _handleNextRoute(req, res, matched, next) {
    const middlewares = [];
    for (const route of matched.routes) {
      middlewares.push(...route.middleware.map(fn => {
        return Object.assign(fn, { route: route });
      }));
    }
    
    let index = 0;
    const self = this;
    
    function dispatch(err) {
      if (err === 'route') {
        // 跳过当前路由的剩余中间件
        const currentRoute = index > 0 ? middlewares[index - 1]?.route : null;
        while (index < middlewares.length && 
              middlewares[index].route === currentRoute) {
          index++;
        }
        return dispatch();
      }
      
      // 处理常规错误
      if (err) {
        // 查找错误处理中间件 (有4个参数的函数)
        while (index < middlewares.length) {
          const handler = middlewares[index++];
          // Express错误处理中间件判断参数数量
          if (handler.length === 4) {
            try {
              return handler(err, req, res, dispatch);
            } catch (e) {
              return dispatch(e);
            }
          }
        }
        // 如果没有找到错误处理中间件，则传递给上层
        return next(err);
      }
      
      if (index >= middlewares.length) {
        return next();
      }
      
      const handler = middlewares[index++];
      
      // 跳过错误处理中间件
      if (handler.length === 4) {
        return dispatch();
      }
      
      try {
        handler(req, res, dispatch);
      } catch (err) {
        dispatch(err);
      }
    }
    
    return dispatch;
  }

  /**
   * 生成Express中间件
   * @returns {Function} Express风格中间件
   */
  routes() {
    const router = this;
    
    return function(req, res, next) {
      const method = req.method;
      const path = req.path || req.url;
      
      // 记录匹配的路由
      const matched = router.match(path, method);
      
      if (!matched.routes.length) {
        return next();
      }
      
      // 保存路由匹配信息
      req.route = matched.routes[matched.routes.length - 1];
      req.params = matched.params || {};
      
      // 首先处理参数中间件
      router._applyParamMiddleware(req, res, function(err) {
        if (err) return next(err);
        
        // 使用增强的dispatch处理程序
        const dispatch = router._handleNextRoute(req, res, matched, next);
        dispatch();
      });
    };
  }
  
  /**
   * 路由分组 (Express风格)
   * @param {Object|Function} opts - 选项或回调函数
   * @param {Function} [callback] - 回调函数
   */
  group(opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = {};
    }
    
    const prefix = opts.prefix || '';
    const router = new Router({
      prefix: this.prefix + prefix
    });
    
    callback(router);
    this.use(prefix, router);
    
    return this;
  }
  
  /**
   * 实现链式路由API (route方法)
   * @param {String} path - 路由路径
   * @returns {Object} 路由链对象
   */
  route(path) {
    const route = {
      path: path,
      router: this
    };
    
    // 为每个HTTP方法创建函数
    this.methods.forEach(method => {
      route[method.toLowerCase()] = function(...handlers) {
        this.router.register(method, this.path, {}, handlers);
        return this; // 返回route对象以支持链式调用
      };
    });
    
    return route;
  }
  
  /**
   * 支持更完整的路径模式
   * @param {String|RegExp|Array} path - 路由路径
   * @returns {String} 标准化的路径
   */
  _pathNormalization(path) {
    // 处理RegExp路径
    if (path instanceof RegExp) {
      // 将正则表达式转换为兼容的字符串路径
      // 注意：这是简化处理，实际应用中可能需要更复杂的转换
      return path.toString().replace(/^\/|\/[gimsuy]*$/g, '');
    }
    
    // 处理数组路径
    if (Array.isArray(path)) {
      return path; // 返回数组，由register方法处理
    }
    
    // 处理通配符路径 - 支持Express风格
    if (typeof path === 'string') {
      // 将Express风格的*通配符转换为path-to-regexp兼容格式
      if (path === '*') {
        return '(.*)';
      }
      
      // 处理路径末尾的?可选段落
      if (path.endsWith('?')) {
        const basePath = path.slice(0, -1);
        return basePath + '?';
      }
    }
    
    // 直接返回字符串路径
    return path;
  }

  /**
   * 拓展Router.param来完全匹配Express行为
   */
  param(name, fn) {
    if (!this._params) this._params = {};
    
    // 支持参数中间件
    if (typeof fn === 'function') {
      this._params[name] = fn;
      return this;
    }
    
    throw new Error('router.param() requires a callback function');
  }

  /**
   * 处理请求前应用参数中间件
   * @private
   */
  _applyParamMiddleware(req, res, next) {
    if (!this._params || !req.params) {
      return next();
    }
    
    const paramNames = Object.keys(req.params);
    if (!paramNames.length) return next();
    
    let i = 0;
    const self = this;
    
    function param() {
      if (i >= paramNames.length) return next();
      const name = paramNames[i++];
      const paramFn = self._params[name];
      
      if (paramFn && typeof paramFn === 'function') {
        paramFn(req, res, param, req.params[name], name);
      } else {
        param();
      }
    }
    
    param();
  }

  /**
   * 分配路由处理程序，兼容Express的方法
   * @param {Function} handler - 处理函数
   */
  process_params(name, fn) {
    const params = this.params = this.params || {};
    const paramCallbacks = params[name] = params[name] || [];
    
    paramCallbacks.push(fn);
    
    return this;
  }

  /**
   * 设置合并参数
   * @param {Object} options - 参数选项
   * @returns {Router} 为链式调用返回this
   */
  mergeParams(options) {
    this.opts.mergeParams = options.mergeParams === true;
    return this;
  }

  /**
   * 返回路由器所有路由的格式化输出
   * @returns {Array} 格式化的路由数组
   */
  getStack() {
    return this.stack.map(layer => {
      return {
        path: layer.path,
        methods: layer.methods,
        middlewareCount: layer.middleware.length
      };
    });
  }

  /**
   * 支持caseSensitive选项
   * @param {Object} options - 参数选项 
   * @returns {Router} 为链式调用返回this
   */
  caseSensitive(options) {
    this.opts.caseSensitive = options.caseSensitive === true;
    // 应用设置到路径匹配
    this.methods.forEach(method => {
      if (this.trees[method]) {
        this.trees[method].ctx.options = {
          ...this.trees[method].ctx.options,
          caseSensitive: this.opts.caseSensitive
        };
      }
    });
    return this;
  }

  /**
   * 支持strict选项
   * @param {Object} options - 参数选项
   * @returns {Router} 为链式调用返回this
   */
  strict(options) {
    this.opts.strict = options.strict === true;
    // 应用设置到路径匹配
    this.methods.forEach(method => {
      if (this.trees[method]) {
        this.trees[method].ctx.options = {
          ...this.trees[method].ctx.options,
          strict: this.opts.strict
        };
      }
    });
    return this;
  }
}

export  function createRouter(opts) {
  return new Router(opts);
} 