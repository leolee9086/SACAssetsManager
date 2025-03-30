/**
 * 共享资源统一导出
 * 
 * 本文件统一导出所有共享资源，提供一个统一的导入入口
 * 但建议在实际开发中，根据需要直接从对应的子模块导入，
 * 以避免导入不需要的内容，提高性能和可维护性。
 * 
 * 开发指南：
 * 1. 此文件不应定义新的资源，仅用于导出
 * 2. 添加新模块时需更新此文件
 */

// 导入常量
export * from './constants/index.js';

// 导入枚举
export * from './enums/index.js';

// 导入配置
export * from './config/index.js';

// 导入组件
export * from './components/index.js';

/**
 * 后续将添加models和i18n的导出
 * 示例:
 * // 导入模型
 * export * from './models/index.js';
 * 
 * // 导入国际化资源
 * export * from './i18n/index.js';
 */ 