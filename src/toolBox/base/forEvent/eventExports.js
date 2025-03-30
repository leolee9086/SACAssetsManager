/**
 * 事件工具集合导出
 * 
 * 提供事件管理相关工具的统一导出接口
 */

// 导出事件总线工具
export * from './eventBusTools.js';

// 创建默认事件总线实例
import { createEventBus } from './eventBusTools.js';
export const defaultEventBus = createEventBus(); 