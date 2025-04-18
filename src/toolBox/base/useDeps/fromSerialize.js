/**
 * @fileoverview 转发来自 static 目录的 serialize-javascript 依赖。
 * 该模块仅用于转发 serialize 函数本身。
 */

// 假设 serialize-javascript.js 文件位于 static/ 目录下，如果路径不对请调整
import serialize from '../../../static/serialize-javascript.js';

// 导出 serialize 函数，供其他模块使用
export { serialize }; 