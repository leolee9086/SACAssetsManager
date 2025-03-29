/**
 * 工具箱导出模块
 * 
 * 为整个工具箱提供统一的导出接口，便于使用者访问各种工具。
 * 推荐直接导入所需的特定工具函数，而不是整个模块。
 */

// MIME相关工具
export * from './forMime/getMimeTypeInfo.js';
export * from './forMime/mimeTypeTools.js';
export * from './forMime/mimeUsageTools.js';

// 事件相关工具
export { createEventBus } from './forEvent/eventBusTools.js';

// 平台检测和文本处理工具
export * from './usePolyfills/getPlatformInfo.js';
export * from './usePolyfills/getTextProcessor.js';
export * from './usePolyfills/platformDetection.js';
export * from './usePolyfills/browserDetection.js';
export * from './usePolyfills/osDetection.js';
export * from './usePolyfills/uaParserTools.js';

// Vue相关工具
export * from './useVue/vueComponentLoader.js';

/**
 * 创建一个默认的事件总线实例
 */
import { createEventBus } from './forEvent/eventBusTools.js';
export const defaultEventBus = createEventBus(); 