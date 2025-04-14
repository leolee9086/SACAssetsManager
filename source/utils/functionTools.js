/**
 * @deprecated 此模块已迁移至 src/toolBox/base/forChain/
 * 请使用新模块中的函数以获得更完整的功能
 */

// 导入新的实现
import { 顺序组合函数, 管道函数 } from '../../src/toolBox/base/forChain/compose.js';
import { 柯里化, 等待参数达到长度后执行 } from '../../src/toolBox/base/forChain/curry.js';
import { 组合函数 } from '../../src/toolBox/base/forChain/parallel.js';

// 记录废弃警告
console.warn('source/utils/functionTools.js 已废弃，请使用 src/toolBox/base/forChain/ 下的相关模块');

// 重新导出
export { 顺序组合函数, 管道函数, 柯里化, 等待参数达到长度后执行, 组合函数 };

