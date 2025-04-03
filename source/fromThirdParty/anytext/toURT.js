/**
 * @fileoverview 【已废弃】AnyTXT 到 URT 的转换入口
 * 此文件为兼容层，请不要直接使用。
 * 请从 src/toolBox/useAge/forAnytext/useAnytextURT.js 导入相应功能
 */

import {
    转换为URT资源 as convertToURTResource,
    批量转换为URT资源 as batchConvertToURTResources
} from '../../../src/toolBox/useAge/forAnytext/useAnytextURT.js';

// 记录警告
console.warn('anytext/toURT.js 已经废弃，请从 src/toolBox/useAge/forAnytext/useAnytextURT.js 导入相应功能');

// 为兼容性重新导出
export {
    convertToURTResource,
    batchConvertToURTResources
};