/**
 * @fileoverview 转发来自 static 目录的 Vue 依赖。
 * 该模块仅用于转发 Vue 库本身，不包含任何额外逻辑或对其他工具的依赖。
 * 所有需要使用 Vue 的地方都应从这里导入。
 */

// 假设 Vue ESM 文件位于 static/vue/ 目录下，如果路径不对请调整
import * as Vue from '../../../../static/vue.esm-browser.js';

// 导出 Vue 对象，供其他模块使用
export { Vue }; 