/**
 * @fileoverview 已弃用 - 许可证收集工具
 * @deprecated 请直接从对应toolBox文件导入函数：
 * - collectLicenses: src/toolBox/base/useDeps/licensesTools.js
 */

// 从新路径导入函数
const { collectLicenses } = require('./src/toolBox/base/useDeps/licensesTools.js');

// 保持兼容性
module.exports = {
  collectLicenses
};

// 直接导出主函数
module.exports.default = collectLicenses;

// 在导入时发出警告
console.warn('collect-licenses-grouped.js 已弃用，请直接从toolBox导入相应函数');