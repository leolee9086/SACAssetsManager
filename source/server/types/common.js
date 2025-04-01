/**
 * 通用类型定义
 * 使用JSDoc格式定义类型
 */

/**
 * 范围对象
 * @typedef {Object} Range
 * @property {number} start - 起始位置
 * @property {number} end - 结束位置
 */

/**
 * 坐标对象
 * @typedef {Object} Point
 * @property {number} x - X坐标
 * @property {number} y - Y坐标
 */

/**
 * 尺寸对象
 * @typedef {Object} Size
 * @property {number} width - 宽度
 * @property {number} height - 高度
 */

/**
 * 矩形区域
 * @typedef {Object} Rect
 * @property {number} x - X坐标
 * @property {number} y - Y坐标
 * @property {number} width - 宽度
 * @property {number} height - 高度
 */

/**
 * 颜色对象(RGB)
 * @typedef {Object} RGBColor
 * @property {number} r - 红色 (0-255)
 * @property {number} g - 绿色 (0-255)
 * @property {number} b - 蓝色 (0-255)
 */

/**
 * 颜色对象(RGBA)
 * @typedef {Object} RGBAColor
 * @property {number} r - 红色 (0-255)
 * @property {number} g - 绿色 (0-255)
 * @property {number} b - 蓝色 (0-255)
 * @property {number} a - 透明度 (0-1)
 */

/**
 * 键值对
 * @typedef {Object.<string, *>} Dictionary
 */

/**
 * 选项对象
 * @typedef {Object} Options
 * @property {boolean} [enabled=true] - 是否启用
 * @property {boolean} [strict=false] - 是否严格模式
 * @property {number} [timeout=30000] - 超时时间
 * @property {string} [mode='default'] - 模式
 * @property {function} [callback] - 回调函数
 */

/**
 * 缓存条目
 * @typedef {Object} CacheItem
 * @property {*} value - 缓存值
 * @property {number} expires - 过期时间戳
 * @property {number} created - 创建时间戳
 * @property {number} hits - 命中次数
 */

/**
 * 日志记录
 * @typedef {Object} LogEntry
 * @property {string} level - 日志级别
 * @property {string} message - 日志消息
 * @property {string} [category] - 日志类别
 * @property {Date} timestamp - 时间戳
 * @property {Object} [meta] - 元数据
 * @property {string} [stack] - 堆栈信息
 */

/**
 * 日期范围
 * @typedef {Object} DateRange
 * @property {Date} start - 开始日期
 * @property {Date} end - 结束日期
 */

/**
 * 任务状态
 * @typedef {'pending'|'running'|'completed'|'failed'|'cancelled'} TaskStatus
 */

/**
 * 任务对象
 * @typedef {Object} Task
 * @property {string} id - 任务ID
 * @property {TaskStatus} status - 任务状态
 * @property {number} progress - 进度 (0-100)
 * @property {Date} createdAt - 创建时间
 * @property {Date} [startedAt] - 开始时间
 * @property {Date} [completedAt] - 完成时间
 * @property {Error} [error] - 错误信息
 * @property {Function} execute - 执行函数
 * @property {Function} cancel - 取消函数
 */

/**
 * 许可证信息
 * @typedef {Object} License
 * @property {string} key - 许可证密钥
 * @property {boolean} valid - 是否有效
 * @property {Date} expiresAt - 过期时间
 * @property {string} plan - 许可计划
 * @property {string[]} features - 支持的功能
 * @property {Object} owner - 所有者信息
 */

/**
 * 请求元数据
 * @typedef {Object} RequestMeta
 * @property {string} ip - 请求IP
 * @property {string} userAgent - 用户代理
 * @property {string} [referer] - 来源页面
 * @property {Date} timestamp - 请求时间
 * @property {number} duration - 处理时长(毫秒)
 */; 