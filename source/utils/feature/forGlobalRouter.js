import { createFunctionRouter } from './forFunctionEndpoints.js';

// 创建唯一的Symbol键，用于存储全局路由器实例
const GLOBAL_ROUTER_KEY = Symbol.for('app.globalRouter');

/**
 * 初始化全局路由器
 * @param {Object} opts - 路由器配置选项
 * @returns {Object} 全局路由器实例
 */
export function initGlobalRouter(opts = {}) {
  // 检查全局路由器是否已存在
  if (globalThis[GLOBAL_ROUTER_KEY]) {
    console.warn('全局路由器已经初始化，将返回现有实例。');
    return globalThis[GLOBAL_ROUTER_KEY];
  }
  
  // 创建新的路由器实例
  const router = createFunctionRouter(opts);
  
  // 将路由器存储在全局变量中
  globalThis[GLOBAL_ROUTER_KEY] = router;
  
  console.log('全局路由器已初始化');
  return router;
}

/**
 * 获取全局路由器实例
 * @returns {Object|null} 全局路由器实例，如果未初始化则返回null
 */
export function getGlobalRouter() {
  const router = globalThis[GLOBAL_ROUTER_KEY];
  if (!router) {
    console.warn('全局路由器尚未初始化，请先调用 initGlobalRouter()');
    return null;
  }
  return router;
}

/**
 * 注册路由到全局路由器
 * @param {String} method - HTTP方法(GET, POST, PUT, DELETE等)
 * @param {String} path - 路由路径
 * @param {Object} doc - 路由文档
 * @param {Function|Function[]} handler - 处理函数
 * @returns {Object|null} 路由注册结果，如果全局路由器未初始化则返回null
 */
export function registerRoute(method, path, doc, handler) {
  const router = getGlobalRouter();
  if (!router) {
    throw new Error('全局路由器未初始化，无法注册路由');
  }
  
  // 转换方法名为小写
  const methodLower = method.toLowerCase();
  
  // 检查路由器是否支持此方法
  if (typeof router[methodLower] !== 'function') {
    throw new Error(`不支持的HTTP方法: ${method}`);
  }
  
  // 使用路由器提供的方法注册路由
  return router[methodLower](path, doc, handler);
}

/**
 * 创建路由组
 * @param {Object|Function} opts - 组选项或回调函数
 * @param {Function} [callback] - 组回调函数
 * @returns {Object} 全局路由器实例
 */
export function groupRoutes(opts, callback) {
  const router = getGlobalRouter();
  if (!router) {
    throw new Error('全局路由器未初始化，无法创建路由组');
  }
  
  return router.group(opts, callback);
}

/**
 * 生成路由处理中间件
 * @returns {Function} Koa兼容的中间件
 */
export function getRouterMiddleware() {
  const router = getGlobalRouter();
  if (!router) {
    throw new Error('全局路由器未初始化，无法生成中间件');
  }
  
  return router.routes();
}

/**
 * 生成处理OPTIONS请求和405/501状态的中间件
 * @param {Object} options - 中间件选项
 * @returns {Function} 处理中间件
 */
export function getAllowedMethodsMiddleware(options = {}) {
  const router = getGlobalRouter();
  if (!router) {
    throw new Error('全局路由器未初始化，无法生成中间件');
  }
  
  return router.allowedMethods(options);
}

/**
 * 生成OpenAPI文档
 * @param {Object} info - API信息
 * @returns {Object} OpenAPI文档对象
 */
export function generateApiDocs(info = {}) {
  const router = getGlobalRouter();
  if (!router) {
    throw new Error('全局路由器未初始化，无法生成API文档');
  }
  
  return router.generateOpenAPIDoc(info);
}

/**
 * 快捷方法：GET路由注册
 */
export function get(path, doc, handler) {
  return registerRoute('GET', path, doc, handler);
}

/**
 * 快捷方法：POST路由注册
 */
export function post(path, doc, handler) {
  return registerRoute('POST', path, doc, handler);
}

/**
 * 快捷方法：PUT路由注册
 */
export function put(path, doc, handler) {
  return registerRoute('PUT', path, doc, handler);
}

/**
 * 快捷方法：DELETE路由注册
 */
export function del(path, doc, handler) {
  return registerRoute('DELETE', path, doc, handler);
}

/**
 * 快捷方法：PATCH路由注册
 */
export function patch(path, doc, handler) {
  return registerRoute('PATCH', path, doc, handler);
}

/**
 * 快捷方法：HEAD路由注册
 */
export function head(path, doc, handler) {
  return registerRoute('HEAD', path, doc, handler);
}

/**
 * 快捷方法：OPTIONS路由注册
 */
export function options(path, doc, handler) {
  return registerRoute('OPTIONS', path, doc, handler);
}

/**
 * 快捷方法：ALL路由注册(匹配所有方法)
 */
export function all(path, doc, handler) {
  const router = getGlobalRouter();
  if (!router) {
    throw new Error('全局路由器未初始化，无法注册路由');
  }
  
  return router.all(path, doc, handler);
} 