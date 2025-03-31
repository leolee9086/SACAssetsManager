/*!
 * Express-like Router with Radix3 for improved performance
 */

'use strict';

import * as radix from "../../../../static/radix3.mjs";
import { pathToRegexp } from "../../../../static/path-to-regexp.js";
import { 日志 } from "../../../server/utils/logger.js";
import * as url from "../../../../static/url.js";

const { parseUrl } = url;

// 确保Buffer可用
const Buffer = globalThis.Buffer || {
  byteLength: function(str) {
    // 简单实现，仅作兼容
    return new TextEncoder().encode(str).length;
  }
};

/**
 * Module variables.
 * @private
 */
const objectRegExp = /^\[object (\S+)\]$/;
const slice = Array.prototype.slice;
const toString = Object.prototype.toString;
const hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * HTTP 方法列表
 */
const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

/**
 * 将参数解码
 * @private
 */
function decode_param(val) {
  if (typeof val !== 'string' || val.length === 0) {
    return val;
  }

  try {
    return decodeURIComponent(val);
  } catch (err) {
    if (err instanceof URIError) {
      err.message = '参数解码失败 \'' + val + '\'';
      err.status = err.statusCode = 400;
    }

    throw err;
  }
}

/**
 * 获取pathname
 * @private
 */
function getPathname(req) {
  try {
    return parseUrl(req).pathname;
  } catch (err) {
    return undefined;
  }
}

/**
 * 获取URL协议和主机部分
 * @private
 */
function getProtohost(url) {
  if (url.length === 0 || url[0] === '/') {
    return undefined;
  }

  const searchIndex = url.indexOf('?');
  const pathLength = searchIndex !== -1
    ? searchIndex
    : url.length;

  const fqdnIndex = url.slice(0, pathLength).indexOf('://');

  return fqdnIndex !== -1
    ? url.substring(0, url.indexOf('/', 3 + fqdnIndex))
    : undefined;
}

/**
 * 获取对象类型
 * @private
 */
function gettype(obj) {
  const type = typeof obj;

  if (type !== 'object') {
    return type;
  }

  return toString.call(obj)
    .replace(objectRegExp, '$1')
    .toLowerCase();
}

/**
 * 恢复对象属性
 * @private
 */
function restore(fn, obj) {
  const props = new Array(arguments.length - 2);
  const vals = new Array(arguments.length - 2);

  for (let i = 0; i < props.length; i++) {
    props[i] = arguments[i + 2];
    vals[i] = obj[props[i]];
  }

  return function() {
    // 恢复之前的值
    for (let i = 0; i < props.length; i++) {
      obj[props[i]] = vals[i];
    }

    return fn.apply(this, arguments);
  };
}

/**
 * 包装函数
 * @private
 */
function wrap(old, fn) {
  return function proxy() {
    const args = new Array(arguments.length + 1);

    args[0] = old;
    for (let i = 0; i < arguments.length; i++) {
      args[i + 1] = arguments[i];
    }

    return fn.apply(this, args);
  };
}

/**
 * 路由层 - Layer
 */
function Layer(path, options, fn) {
  if (!(this instanceof Layer)) {
    return new Layer(path, options, fn);
  }

  日志.信息('创建新的路由层: ' + path, 'Router');
  const opts = options || {};

  this.handle = fn;
  this.name = fn.name || '<匿名>';
  this.params = undefined;
  this.path = undefined;
  this.regexp = pathToRegexp(path, this.keys = [], opts);

  // 快速路径标志
  this.regexp.fast_star = path === '*';
  this.regexp.fast_slash = path === '/' && opts.end === false;
}

/**
 * 处理层中的错误
 */
Layer.prototype.handle_error = function handle_error(error, req, res, next) {
  const fn = this.handle;

  if (fn.length !== 4) {
    // 不是标准的错误处理中间件
    return next(error);
  }

  try {
    fn(error, req, res, next);
  } catch (err) {
    next(err);
  }
};

/**
 * 处理层中的请求
 */
Layer.prototype.handle_request = function handle(req, res, next) {
  const fn = this.handle;

  if (fn.length > 3) {
    // 不是标准的请求处理函数
    return next();
  }

  try {
    fn(req, res, next);
  } catch (err) {
    next(err);
  }
};

/**
 * 检查路径是否匹配该层
 */
Layer.prototype.match = function match(path) {
  let matched;

  if (path != null) {
    // 快速路径 / 匹配所有
    if (this.regexp.fast_slash) {
      this.params = {};
      this.path = '';
      return true;
    }

    // 快速路径 * (将所有内容匹配到一个参数中)
    if (this.regexp.fast_star) {
      this.params = {'0': decode_param(path)};
      this.path = path;
      return true;
    }

    // 正则表达式匹配
    matched = this.regexp.exec(path);
  }

  if (!matched) {
    this.params = undefined;
    this.path = undefined;
    return false;
  }

  // 存储匹配值
  this.params = {};
  this.path = matched[0];

  // 提取命名参数
  const keys = this.keys;
  const params = this.params;

  for (let i = 1; i < matched.length; i++) {
    const key = keys[i - 1];
    const prop = key.name;
    const val = decode_param(matched[i]);

    if (val !== undefined || !(hasOwnProperty.call(params, prop))) {
      params[prop] = val;
    }
  }

  return true;
};

/**
 * 路由 - Route
 */
function Route(path) {
  this.path = path;
  this.stack = [];

  日志.信息('创建新的路由: ' + path, 'Router');

  // 路由处理器，用于各种HTTP方法
  this.methods = {};
}

/**
 * 判断路由是否处理给定的HTTP方法
 * @private
 */
Route.prototype._handles_method = function _handles_method(method) {
  if (this.methods._all) {
    return true;
  }

  // 规范化名称
  const name = typeof method === 'string'
    ? method.toLowerCase()
    : method;

  if (name === 'head' && !this.methods.head) {
    // HEAD方法可以使用GET处理程序
    return Boolean(this.methods.get);
  }

  return Boolean(this.methods[name]);
};

/**
 * 返回支持的HTTP方法
 * @private
 */
Route.prototype._options = function _options() {
  const methods = Object.keys(this.methods);

  // 如果支持GET但不支持HEAD，自动添加HEAD
  if (this.methods.get && !this.methods.head) {
    methods.push('head');
  }

  // 将方法名转为大写
  for (let i = 0; i < methods.length; i++) {
    methods[i] = methods[i].toUpperCase();
  }

  return methods;
};

/**
 * 分派请求到路由
 * @private
 */
Route.prototype.dispatch = function dispatch(req, res, done) {
  let idx = 0;
  const stack = this.stack;
  let sync = 0;

  if (stack.length === 0) {
    return done();
  }

  let method = req.method.toLowerCase();

  // HEAD请求可以使用GET处理程序
  if (method === 'head' && !this.methods.head) {
    method = 'get';
  }

  req.route = this;

  next();

  function next(err) {
    // 退出当前路由的信号
    if (err && err === 'route') {
      return done();
    }

    // 退出整个路由器的信号
    if (err && err === 'router') {
      return done(err);
    }

    // 防止同步堆栈溢出
    if (++sync > 100) {
      return setTimeout(() => next(err), 0);
    }

    const layer = stack[idx++];

    // 所有层处理完毕
    if (!layer) {
      return done(err);
    }

    if (layer.method && layer.method !== method) {
      // 方法不匹配，跳过
      next(err);
    } else if (err) {
      // 错误处理
      layer.handle_error(err, req, res, next);
    } else {
      // 正常请求处理
      layer.handle_request(req, res, next);
    }

    sync = 0;
  }
};

/**
 * 为所有HTTP方法添加处理程序
 * @public
 */
Route.prototype.all = function all() {
  const handles = Array.prototype.slice.call(arguments).flat();

  for (let i = 0; i < handles.length; i++) {
    const handle = handles[i];

    if (typeof handle !== 'function') {
      const type = toString.call(handle);
      const msg = 'Route.all() 需要一个回调函数，但得到了 ' + type;
      throw new TypeError(msg);
    }

    const layer = new Layer('/', {}, handle);
    layer.method = undefined;

    this.methods._all = true;
    this.stack.push(layer);
  }

  return this;
};

// 为Route添加HTTP方法处理函数
methods.forEach(function(method) {
  Route.prototype[method] = function() {
    const handles = Array.prototype.slice.call(arguments).flat();

    for (let i = 0; i < handles.length; i++) {
      const handle = handles[i];

      if (typeof handle !== 'function') {
        const type = toString.call(handle);
        const msg = 'Route.' + method + '() 需要一个回调函数，但得到了 ' + type;
        throw new TypeError(msg);
      }

      日志.信息(`为路由 ${this.path} 添加 ${method} 方法处理器`, 'Router');

      const layer = new Layer('/', {}, handle);
      layer.method = method;

      this.methods[method] = true;
      this.stack.push(layer);
    }

    return this;
  };
});

/**
 * Router - Express路由器
 */
function Router(options) {
  const opts = options || {};

  function router(req, res, next) {
    router.handle(req, res, next);
  }

  // 混入Router类方法
  Object.setPrototypeOf(router, Router.prototype);

  router.params = {};
  router._params = [];
  router.caseSensitive = opts.caseSensitive;
  router.mergeParams = opts.mergeParams;
  router.strict = opts.strict;
  router.stack = [];

  // Radix树，用于提高匹配性能
  router.radixTrees = {};
  methods.concat('all').forEach(method => {
    router.radixTrees[method] = radix.createRouter();
  });

  return router;
}

/**
 * 路由器原型
 */
Router.prototype = Object.create(null);

/**
 * 处理参数中间件映射
 */
Router.prototype.param = function param(name, fn) {
  if (typeof name === 'function') {
    日志.警告('router.param(fn)方法已过时，请使用路径参数', 'Router');
    this._params.push(name);
    return;
  }

  // 应用参数函数
  const params = this._params;
  const len = params.length;
  let ret;

  if (name[0] === ':') {
    日志.警告(`router.param('${name}', fn)方法已过时，请使用router.param('${name.slice(1)}', fn)`, 'Router');
    name = name.slice(1);
  }

  for (let i = 0; i < len; ++i) {
    if (ret = params[i](name, fn)) {
      fn = ret;
    }
  }

  // 确保我们最终得到一个中间件函数
  if (typeof fn !== 'function') {
    throw new Error(`无效的param()调用: ${name}, 得到了 ${fn}`);
  }

  (this.params[name] = this.params[name] || []).push(fn);
  return this;
};

/**
 * 将请求分派到路由器
 * @private
 */
Router.prototype.handle = function handle(req, res, out) {
  const self = this;

  日志.信息(`分派请求: ${req.method} ${req.url}`, 'Router');

  let idx = 0;
  const protohost = getProtohost(req.url) || '';
  let removed = '';
  let slashAdded = false;
  let sync = 0;
  const paramcalled = {};

  // OPTIONS请求的选项
  const options = [];

  // 中间件和路由
  const stack = self.stack;

  // 管理路由器间变量
  const parentParams = req.params;
  const parentUrl = req.baseUrl || '';
  const done = restore(out || function(err) {
    if (err) {
      res.statusCode = 500;
      res.end(`服务器内部错误: ${err.message}`);
    } else {
      res.statusCode = 404;
      res.end(`找不到资源: ${req.method} ${req.url}`);
    }
  }, req, 'baseUrl', 'next', 'params');

  // 设置下一层
  req.next = next;

  // 对于OPTIONS请求，如果没有其他响应，则提供默认响应
  if (req.method === 'OPTIONS') {
    done = wrap(done, function(old, err) {
      if (err || options.length === 0) return old(err);
      
      // 发送OPTIONS响应
      const body = options.join(',');
      res.setHeader('Allow', body);
      res.setHeader('Content-Length', Buffer.byteLength(body));
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.statusCode = 200;
      res.end(body);
    });
  }

  // 设置基本请求值
  req.baseUrl = parentUrl;
  req.originalUrl = req.originalUrl || req.url;

  // 初始化req.path
  if (!req.path) {
    const parsedUrl = parseUrl(req);
    req.path = parsedUrl ? parsedUrl.pathname : req.url.split('?')[0];
  }

  next();

  function next(err) {
    // 'route'错误表示跳过当前路由
    const layerError = err === 'route'
      ? null
      : err;

    // 移除添加的斜杠
    if (slashAdded) {
      req.url = req.url.slice(1);
      slashAdded = false;
    }

    // 恢复被修改的req.url
    if (removed.length !== 0) {
      req.baseUrl = parentUrl;
      req.url = protohost + removed + req.url.slice(protohost.length);
      removed = '';
    }

    // 退出路由器信号
    if (layerError === 'router') {
      setTimeout(() => done(null), 0);
      return;
    }

    // 没有更多要处理的层
    if (idx >= stack.length) {
      setTimeout(() => done(layerError), 0);
      return;
    }

    // 获取path和当前层
    const path = req.path || req.url.split('?')[0];
    if (path == null) {
      return done(layerError);
    }

    let layer = null;
    let match = false;
    let route = null;

    // 查找下一个匹配的层
    while (match === false && idx < stack.length) {
      layer = stack[idx++];
      match = layer.match(path);
      route = layer.route;

      if (match === false) {
        continue;
      }

      // 如果没有路由定义，这可能是中间件
      if (!route) {
        日志.信息(`匹配中间件: ${layer.path}`, 'Router');
        continue;
      }

      const method = req.method;
      const has_method = route._handles_method(method);

      // 构建选项列表（为OPTIONS请求）
      if (!has_method && method === 'OPTIONS') {
        日志.信息(`添加OPTIONS方法支持: ${layer.path}`, 'Router');
        options.push.apply(options, route._options());
      }

      // 跳过不处理此方法的路由
      if (!has_method && method !== 'HEAD') {
        日志.信息(`方法不匹配，跳过: ${method} ${layer.path}`, 'Router');
        match = false;
        continue;
      }
    }

    // 未找到匹配
    if (match === false) {
      日志.信息(`未找到匹配路径: ${path}`, 'Router');
      return done(layerError);
    }

    // 存储路由参数
    if (layer.params) {
      if (!req.params) {
        req.params = {};
      }
      
      Object.assign(req.params, layer.params);
      日志.信息(`设置参数: ${JSON.stringify(req.params)}`, 'Router');
    }

    // 如果是路由层
    if (route) {
      日志.信息(`处理匹配的路由: ${layer.path}`, 'Router');
      // 进入路由前处理参数
      return self.process_params(layer, paramcalled, req, res, function(err) {
        if (err) {
          日志.错误(`参数处理错误: ${err.message}`, 'Router');
          return next(err);
        }

        // 处理请求
        if (route.stack.length === 0) {
          日志.信息(`路由没有处理器，跳过: ${layer.path}`, 'Router');
          return done(null);
        }

        日志.信息(`分派请求到路由: ${layer.path}`, 'Router');
        route.dispatch(req, res, next);
      });
    }

    // 处理错误或请求
    if (layerError) {
      日志.信息(`处理错误: ${layerError.message}`, 'Router');
      layer.handle_error(layerError, req, res, next);
    } else {
      日志.信息(`处理请求: ${layer.path}`, 'Router');
      layer.handle_request(req, res, next);
    }
  }
};

/**
 * 处理路由参数
 */
Router.prototype.process_params = function process_params(layer, called, req, res, done) {
  const params = this.params;

  // 已处理的参数
  const keys = layer.keys;

  // 如果没有参数
  if (!keys || keys.length === 0) {
    return done();
  }

  let i = 0;
  let name;
  let paramIndex = 0;
  let key;
  let paramVal;
  let paramCallbacks;
  let paramCalled;

  // 处理单个参数
  function param(err) {
    if (err) {
      return done(err);
    }

    if (i >= keys.length) {
      return done();
    }

    paramIndex = 0;
    key = keys[i++];
    name = key.name;
    paramVal = req.params[name];
    paramCallbacks = params[name];
    paramCalled = called[name];

    if (paramVal === undefined || !paramCallbacks) {
      return param();
    }

    // 参数已处理
    if (paramCalled && (paramCalled.match === paramVal
      || (paramCalled.error && paramCalled.error !== 'route'))) {
      // 恢复错误
      req.params[name] = paramCalled.value;

      // 下一个参数
      return param(paramCalled.error);
    }

    called[name] = paramCalled = {
      error: null,
      match: paramVal,
      value: paramVal
    };

    paramCallback();
  }

  // 单个参数回调
  function paramCallback(err) {
    const fn = paramCallbacks[paramIndex++];

    // 存储当前错误
    paramCalled.error = err;

    if (err) {
      // 错误标记为路由跳过
      if (err === 'route') {
        paramCalled.error = null;
      }

      return done(err);
    }

    if (!fn) return param();

    try {
      fn(req, res, paramCallback, paramVal, name);
    } catch (e) {
      paramCallback(e);
    }
  }

  param();
};

/**
 * 使用指定的中间件函数
 */
Router.prototype.use = function use(fn) {
  let offset = 0;
  let path = '/';

  // 默认路径为/
  if (typeof fn !== 'function') {
    let arg = fn;

    while (Array.isArray(arg) && arg.length !== 0) {
      arg = arg[0];
    }

    // 第一个参数是路径
    if (typeof arg !== 'function') {
      offset = 1;
      path = fn;
    }
  }

  const callbacks = slice.call(arguments, offset);

  if (callbacks.length === 0) {
    throw new TypeError('Router.use() 需要中间件函数');
  }

  // 确保路径以/开头
  if (path !== '/' && !path.startsWith('/')) {
    path = '/' + path;
  }
  
  for (let i = 0; i < callbacks.length; i++) {
    const fn = callbacks[i];

    if (typeof fn !== 'function' && !(fn && typeof fn.handle === 'function')) {
      throw new TypeError('Router.use() 需要中间件函数或路由器实例，但得到了 ' + gettype(fn));
    }

    // 检查是否是子路由器
    if (fn && typeof fn.handle === 'function') {
      日志.信息(`挂载子路由器到 ${path}`, 'Router');
      
      // 创建处理子路由的中间件
      const subRouter = fn;
      const subAppLayer = new Layer(path, {
        sensitive: this.caseSensitive,
        strict: false,
        end: false
      }, function subAppHandler(req, res, next) {
        const orig = req.url;
        
        // 确保req.path存在
        if (!req.path) {
          req.path = parseUrl(req).pathname;
        }
        
        // 处理baseUrl
        const originalBaseUrl = req.baseUrl || '';
        
        日志.信息(`子路由请求: ${req.path}，挂载路径: ${path}`, 'Router');
        
        // 如果路径不匹配或不是子路径，跳过
        if (path !== '/' && req.path !== path && !req.path.startsWith(path + '/')) {
          日志.信息(`路径不匹配，跳过子路由: ${req.path} 不匹配 ${path}`, 'Router');
          return next();
        }
        
        // 修改请求对象以反映子应用的挂载路径
        if (path !== '/') {
          let removed = path;
          req.baseUrl = originalBaseUrl + removed;
          req.url = req.url.substr(removed.length);
          
          // 如果URL为空，设置为/
          if (req.url === '') {
            req.url = '/';
          }
          
          日志.信息(`修改请求URL: ${orig} -> ${req.url}，baseUrl: ${req.baseUrl}`, 'Router');
        }
        
        // 一次性使用标志，确保只调用一次next
        let called = false;
        
        function done(err) {
          if (called) {
            return;
          }
          called = true;
          
          // 恢复原始URL和baseUrl
          req.baseUrl = originalBaseUrl;
          req.url = orig;
          
          next(err);
        }
        
        // 处理子路由器请求
        subRouter.handle(req, res, done);
      });
      
      subAppLayer.route = undefined;
      this.stack.push(subAppLayer);
    } else {
      // 普通中间件函数
      日志.信息(`挂载中间件到 ${path}`, 'Router');
      
      const layer = new Layer(path, {
        sensitive: this.caseSensitive,
        strict: false,
        end: false
      }, fn);
      
      layer.route = undefined;
      this.stack.push(layer);
    }
  }

  return this;
};

/**
 * 创建一个新的Route并添加到路由器
 */
Router.prototype.route = function route(path) {
  const route = new Route(path);

  const layer = new Layer(path, {
    sensitive: this.caseSensitive,
    strict: this.strict,
    end: true
  }, route.dispatch.bind(route));

  layer.route = route;

  // 将路由添加到radix树以提高性能
  try {
    this.radixTrees.all.insert(path, layer);
    日志.信息(`在radix树中添加路由: ${path}`, 'Router');
  } catch (err) {
    日志.错误(`向radix树添加路由失败: ${err.message}`, 'Router');
    // 失败时添加到常规堆栈，不中断正常操作
  }

  this.stack.push(layer);
  return route;
};

/**
 * 返回路由器中间件
 */
Router.prototype.middleware = function middleware() {
  return this.handle.bind(this);
};

/**
 * 返回路由处理函数
 */
Router.prototype.routes = function routes() {
  return this.handle.bind(this);
};

// 为Router添加HTTP方法处理函数
methods.forEach(function(method) {
  Router.prototype[method] = function(path) {
    const route = this.route(path);
    route[method].apply(route, slice.call(arguments, 1));
    return this;
  };
});

/**
 * 创建新的路由器
 */
export function createRouter(options) {
  return new Router(options);
}
