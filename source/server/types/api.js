/**
 * API相关类型定义
 * 使用JSDoc格式定义类型
 */

/**
 * API请求上下文
 * @typedef {Object} APIContext
 * @property {Object} req - 请求对象
 * @property {Object} res - 响应对象
 * @property {Object} [params] - 路由参数
 * @property {Object} [query] - 查询参数
 * @property {Object} [body] - 请求体
 * @property {Object} [stats] - 请求统计信息
 */

/**
 * API响应数据
 * @typedef {Object} APIResponse
 * @property {boolean} success - 请求是否成功
 * @property {*} data - 响应数据
 * @property {Error|string} [error] - 错误信息
 * @property {number} [code] - 状态码
 * @property {string} [message] - 消息
 */

/**
 * API处理器函数
 * @typedef {function(APIContext): Promise<APIResponse|void>} APIHandler
 */

/**
 * API中间件函数
 * @typedef {function(APIContext, function): Promise<void>} APIMiddleware
 */

/**
 * 路由定义
 * @typedef {Object} RouteDefinition
 * @property {string} path - 路由路径
 * @property {string} method - HTTP方法
 * @property {APIHandler} handler - 处理函数
 * @property {APIMiddleware[]} [middlewares] - 中间件函数数组
 * @property {Object} [options] - 路由选项
 */

/**
 * 错误响应
 * @typedef {Object} ErrorResponse
 * @property {boolean} success - 始终为false
 * @property {string} message - 错误消息
 * @property {*} [error] - 原始错误对象
 * @property {number} code - 错误代码
 * @property {string} [stack] - 错误堆栈(仅开发环境)
 */

/**
 * 标准化的HTTP错误
 * @typedef {Error} HTTPError
 * @property {number} statusCode - HTTP状态码
 * @property {string} message - 错误消息
 * @property {Object} [data] - 附加数据
 */

/**
 * 分页参数
 * @typedef {Object} PaginationParams
 * @property {number} [page=1] - 页码
 * @property {number} [limit=20] - 每页数量
 * @property {string} [sort] - 排序字段
 * @property {string} [order='asc'] - 排序方向
 */

/**
 * 分页结果
 * @typedef {Object} PaginatedResult
 * @property {Array} items - 数据项
 * @property {number} total - 总数
 * @property {number} page - 当前页码
 * @property {number} limit - 每页数量
 * @property {number} pages - 总页数
 */

/**
 * API服务配置
 * @typedef {Object} APIServiceConfig
 * @property {number} port - 端口号
 * @property {string} host - 主机地址
 * @property {boolean} [cors=true] - 是否启用CORS
 * @property {Object} [corsOptions] - CORS选项
 * @property {Object} [limits] - 请求限制
 * @property {number} [limits.bodySize] - 请求体大小限制
 * @property {number} [limits.fileSize] - 文件大小限制
 * @property {boolean} [compression=true] - 是否启用压缩
 * @property {boolean} [rateLimit=false] - 是否启用速率限制
 */

/**
 * 事件处理器
 * @typedef {Object} EventHandler
 * @property {string} id - 处理器ID
 * @property {function} 处理函数 - 事件处理函数
 * @property {boolean} 单次 - 是否只触发一次
 */

/**
 * 事件发布者
 * @interface EventEmitter
 */

/**
 * 添加事件监听器
 * @function
 * @name EventEmitter#添加事件监听器
 * @param {string} 事件名称 - 事件名称
 * @param {function} 处理函数 - 事件处理函数
 * @param {Object} [选项] - 事件选项
 * @returns {string} 监听器ID
 */

/**
 * 移除事件监听器
 * @function
 * @name EventEmitter#移除事件监听器
 * @param {string} 事件名称 - 事件名称
 * @param {string|function} 标识符 - 监听器ID或处理函数
 * @returns {boolean} 是否成功移除
 */

/**
 * 触发事件
 * @function
 * @name EventEmitter#触发事件
 * @param {string} 事件名称 - 事件名称
 * @param {*} 数据 - 事件数据
 * @returns {Promise<Array>} 处理结果
 */ 