/**
 * @fileoverview 已弃用 - 图像处理工具箱参考
 * @deprecated 请直接从对应toolBox文件导入：
 * - imageToolBox: src/toolBox/feature/useImage/imageToolBox.js
 * - 图像工具箱参考: src/toolBox/feature/useImage/imageToolBox.js
 */

// 从新路径导入
import { imageToolBox, 图像工具箱参考 } from './src/toolBox/feature/useImage/imageToolBox.js';

// 重新导出保持兼容性
export { imageToolBox, 图像工具箱参考 };

// 默认导出
export default imageToolBox;

// 在导入时发出警告
console.warn('imageToolBox.js 已弃用，请直接从toolBox导入相应模块'); 