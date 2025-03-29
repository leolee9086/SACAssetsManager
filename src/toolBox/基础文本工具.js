/**
 * @fileoverview 已弃用 - 基础文本处理工具
 * @deprecated 请直接从对应toolBox文件导入函数：
 * - 创建文本工具: src/toolBox/base/useEcma/textTools.js
 * - 管道: src/toolBox/base/useEcma/textTools.js
 */

// 从新路径导入函数
import {
    错误类型,
    创建基础上下文,
    安全执行,
    基础处理器,
    结果处理器,
    管道,
    创建文本工具,
    TextErrorTypes,
    createBaseContext,
    safeExecute,
    createTextTool
} from './base/useEcma/textTools.js';

// 重新导出所有函数，保持兼容性
export {
    错误类型,
    创建基础上下文,
    安全执行,
    基础处理器,
    结果处理器,
    管道,
    创建文本工具,
    TextErrorTypes,
    createBaseContext,
    safeExecute,
    createTextTool
};

// 此文件已弃用，请直接从toolBox导入相应函数
console.warn('基础文本工具.js 已弃用，请直接从toolBox/base/useEcma/textTools.js导入相应函数'); 