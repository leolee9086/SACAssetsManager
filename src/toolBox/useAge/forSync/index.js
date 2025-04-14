/**
 * forSync 目录 - 响应式数据同步工具
 * 
 * 提供基于 WebRTC 的跨窗口/跨组件/跨端响应式数据同步工具
 */

// 导出所有同步工具函数
export * from './useSyncedReactive.js';

// 默认导出方便使用的主要函数
import { useSyncedReactive, useSyncedRef, useSync } from './useSyncedReactive.js';

export default {
  reactive: useSyncedReactive,
  ref: useSyncedRef,
  useSync
}; 