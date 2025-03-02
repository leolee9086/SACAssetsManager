import * as radix from "../../../../static/radix3.mjs";
import { pathToRegexp, compile } from "../../../../static/path-to-regexp.mjs";

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
  }

  /**
   * 注册路由处理函数
   * @param {String|String[]} methods - HTTP方法
   * @param {String} path - 路由路径
   * @param {Object} [opts] - 路由选项
   * @param {Function[]} middleware - 中间件函数数组
   */
  register(methods, path, opts, middleware) {
    if (Array.isArray(path)) {
      for (const p of path) {
        this.register(methods, p, opts, middleware);
      }
      return this;
    }
    // 处理参数重载 (opts是可选的)
    if (typeof opts === 'function' || Array.isArray(opts)) {
      middleware = opts;
      opts = {};
    }
    const fullPath = this.prefix + path;
    
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
      if (this.methods.includes(method)) {
        this.trees[method].insert(fullPath, { middleware, layer });
      }
    }
    
    return this;
  }

  // 各种HTTP方法的快捷方式
  get(name, path, ...middleware) {
    if (typeof path === 'string') {
      // name是字符串并且path也是字符串，name是路由名称
      return this.register('GET', path, { name }, middleware);
    }
    
    // name是路径，path是中间件
    return this.register('GET', name, path, middleware);
  }

  post(name, path, ...middleware) {
    if (typeof path === 'string') {
      return this.register('POST', path, { name }, middleware);
    }
    return this.register('POST', name, path, middleware);
  }

  put(name, path, ...middleware) {
    if (typeof path === 'string') {
      return this.register('PUT', path, { name }, middleware);
    }
    return this.register('PUT', name, path, middleware);
  }

  delete(name, path, ...middleware) {
    if (typeof path === 'string') {
      return this.register('DELETE', path, { name }, middleware);
    }
    return this.register('DELETE', name, path, middleware);
  }

  patch(name, path, ...middleware) {
    if (typeof path === 'string') {
      return this.register('PATCH', path, { name }, middleware);
    }
    return this.register('PATCH', name, path, middleware);
  }

  head(name, path, ...middleware) {
    if (typeof path === 'string') {
      return this.register('HEAD', path, { name }, middleware);
    }
    return this.register('HEAD', name, path, middleware);
  }

  options(name, path, ...middleware) {
    if (typeof path === 'string') {
      return this.register('OPTIONS', path, { name }, middleware);
    }
    return this.register('OPTIONS', name, path, middleware);
  }

  /**
   * 设置路由前缀或处理嵌套路由
   * @param {String|Router} prefix - 前缀或路由实例
   * @param {Function|Router} [middleware] - 中间件或子路由
   */
  use(prefix, ...middleware) {
    if (typeof prefix === 'string') {
      const router = new Router({
        prefix: this.prefix + prefix
      });
      
      if (middleware.length) {
        middleware.forEach(mw => {
          if (mw instanceof Router) {
            // 合并子路由的stack
            mw.stack.forEach(layer => {
              const cloned = new Layer(
                this.prefix + prefix + layer.path.slice(mw.prefix.length),
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
                if (this.methods.includes(method)) {
                  this.trees[method].insert(cloned.path, { middleware: cloned.middleware, layer: cloned });
                }
              }
            });

            // 合并命名路由
            Object.keys(mw.namedRoutes).forEach(name => {
              if (!this.namedRoutes[name]) {
                const route = mw.namedRoutes[name];
                const path = this.prefix + prefix + route.path.slice(mw.prefix.length);
                const layer = new Layer(path, route.methods, route.middleware, route.opts);
                this.namedRoutes[name] = layer;
              }
            });
          } else if (typeof mw === 'function') {
            // 将中间件应用到所有以该前缀开头的路由
            const path = this.prefix + prefix;
            this.all(path + '(.*)', mw);
          }
        });
      }
      
      return router;
    } else if (prefix instanceof Router) {
      // 直接使用另一个路由
      const router = prefix;
      
      router.stack.forEach(layer => {
        this.stack.push(layer);
        
        // 更新radix树
        for (const method of layer.methods) {
          if (this.methods.includes(method)) {
            this.trees[method].insert(layer.path, { middleware: layer.middleware, layer });
          }
        }
      });
      
      // 合并命名路由
      Object.keys(router.namedRoutes).forEach(name => {
        this.namedRoutes[name] = router.namedRoutes[name];
      });
      
      return this;
    }
    
    // 兼容中间件用法
    return this.routes();
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
   * 重定向方法
   * @param {String} source - 源路径
   * @param {String} destination - 目标路径
   * @param {Number} [code=302] - HTTP状态码
   */
  redirect(source, destination, code = 302) {
    // 如果目标是命名路由
    if (destination.charAt(0) !== '/') {
      const route = this.namedRoutes[destination];
      if (route) {
        destination = route.path;
      }
    }
    
    return this.all(source, ctx => {
      ctx.redirect(destination);
      ctx.status = code;
    });
  }

  /**
   * 生成Koa中间件
   * @returns {Function} 中间件
   */
  routes() {
    const router = this;
    
    return async function(ctx, next) {
      const { method, path } = ctx;
      
      // 记录匹配的路由
      const matched = router.match(path, method);
      
      if (!matched.routes.length) {
        return await next();
      }
      
      // 保存路由匹配信息
      const routeMatched = { ...matched };
      ctx.routerPath = routeMatched.pathMatched;
      ctx.routerName = routeMatched.route && routeMatched.route.name;
      ctx.matched = matched.routes;
      
      // 设置路由参数
      ctx.params = matched.params || {};
      
      // 按顺序执行所有匹配的中间件
      const middlewares = [];
      for (const route of matched.routes) {
        for (const middleware of route.middleware) {
          middlewares.push(middleware);
        }
      }
      
      if (!middlewares.length) {
        return await next();
      }
      
      let i = 0;
      async function dispatch(i) {
        if (i === middlewares.length) return await next();
        return await middlewares[i](ctx, () => dispatch(i + 1));
      }
      
      return await dispatch(0);
    };
  }

  /**
   * 生成处理OPTIONS请求和405/501状态的中间件
   * @param {Object} [options] - 配置选项
   * @returns {Function} 中间件
   */
  allowedMethods(options = {}) {
    const implemented = this.methods;
    
    return async function(ctx, next) {
      await next();
      
      // 如果已经有响应，不进行处理
      if (ctx.status !== 404) {
        return;
      }
      
      const allowed = {};
      
      if (!ctx.matched) {
        return;
      }
      
      ctx.matched.forEach(route => {
        route.methods.forEach(method => {
          allowed[method] = true;
        });
      });
      
      const allowedArr = Object.keys(allowed);
      
      if (!allowedArr.length) {
        return;
      }
      
      if (ctx.method === 'OPTIONS') {
        // 响应OPTIONS请求
        ctx.status = 200;
        ctx.set('Allow', allowedArr.join(', '));
        ctx.body = '';
        return;
      }
      
      // 如果方法不被允许
      if (!allowed[ctx.method]) {
        if (options.throw) {
          // 修复逻辑错误，throw前设置状态码
          if (!implemented.includes(ctx.method)) {
            ctx.status = 501;
            const notImplementedThrowable = options.notImplemented || new Error(`不支持该请求方法: ${ctx.method}`);
            throw notImplementedThrowable;
          } else {
            ctx.status = 405;
            const methodNotAllowedThrowable = options.methodNotAllowed || new Error(`方法不被允许: ${ctx.method}`);
            throw methodNotAllowedThrowable;
          }
        } else {
          ctx.status = !implemented.includes(ctx.method) ? 501 : 405;
          ctx.set('Allow', allowedArr.join(', '));
        }
      }
    };
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
    
    // 先查找radix树是否有精确匹配
    const tree = this.trees[method];
    if (tree) {
      const matched = tree.lookup(path);
      if (matched) {
        result.pathMatched = path;
        result.params = matched.params || {};
        if (matched.layer) {
          result.routes.push(matched.layer);
        }
        return result;
      }
    }
    
    // 如果没有精确匹配，尝试正则匹配
    for (const layer of this.stack) {
      if (layer.methods.includes(method) || layer.methods.includes('ALL')) {
        const matches = layer.regexp.exec(path);
        if (matches) {
          result.pathMatched = path;
          
          // 提取正则参数 - 修复兼容性
          const params = {};
          if (layer.paramNames && layer.paramNames.length) {
            for (let i = 1; i < matches.length; i++) {
              const name = layer.paramNames[i - 1];
              if (name) params[name] = matches[i] || '';
            }
          }
          
          Object.assign(result.params, params);
          result.routes.push(layer);
        }
      }
    }
    
    return result;
  }

  /**
   * 允许所有方法
   * @param {String|String[]} path - 路由路径
   * @param {Function[]} middleware - 中间件函数数组
   */
  all(name, path, ...middleware) {
    if (typeof path === 'string') {
      // name是路由名称
      return this.register(this.methods, path, { name }, middleware);
    }
    // name是路径
    return this.register(this.methods, name, path, middleware);
  }
  
  /**
   * 创建路由分组
   * @param {Object} opts - 选项
   * @param {Function} callback - 回调函数
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
    
    this.use(router);
    
    return this;
  }
}

export default function createRouter(opts) {
  return new Router(opts);
}
