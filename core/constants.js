/**
 * 模块系统常量定义
 */

// 模块状态枚举
export const 模块状态 = {
  未加载: 'UNLOADED',
  已加载: 'LOADED',
  错误: 'ERROR'
};

// 默认模块配置
export const 默认模块配置 = {
  重试次数: 3,
  重试延迟: 1000,
  超时时间: 5000
};

// 模块路径映射表，将模块名称映射到实际文件路径
// 如果模块名称未在此映射表中定义，则默认为 core/services/[模块名称].js
export const 模块路径映射 = {
  "环境模块": "core/services/environment.js",
  "事件总线模块": "core/services/eventBus.js",
  "路由模块": "core/services/router.js",
  "日志模块": "core/services/logger.js",
  "错误处理模块": "core/services/errorHandler.js",
  "工具箱模块": "core/services/toolbox.js",
  "存储模块": "core/services/storage.js",
  "配置模块": "core/services/config.js",
  "进程通信模块": "core/services/ipc.js",
  "安全模块": "core/services/security.js",
  "窗口管理模块": "core/services/windowManager.js",
  "UI模块": "core/services/ui.js",
  "主题模块": "core/services/theme.js",
  "扩展加载模块": "core/services/extensionLoader.js"
};

// 核心模块加载顺序（依赖优先）
export const 核心模块列表 = [
  // === 基础层 ===
  "环境模块",        // 提供宿主环境信息，依赖宿主层
  "事件总线模块",    // 最基础的通信机制，其他模块都依赖它
  "路由模块",        // 提供路由能力，依赖事件总线
  "日志模块",        // 基础日志能力，依赖事件总线
  "错误处理模块",    // 统一的错误处理，依赖日志
  "工具箱模块",      // 提供通用工具函数，依赖日志
  // === 系统层 ===
  "存储模块",        // 本地数据持久化，依赖错误处理
  "配置模块",        // 配置管理，依赖存储
  "进程通信模块",    // 跨进程通信，依赖事件总线和路由
  "安全模块",        // 权限控制、加密解密，依赖配置
  // === 应用层 ===  
  "窗口管理模块",    // 窗口生命周期，依赖进程通信
  "UI模块",          // UI框架和组件注册，依赖窗口管理
  "主题模块",        // 主题管理，依赖UI模块
  // === 扩展层 ===
  "扩展加载模块"     // 扩展系统，依赖所有基础模块
]; 