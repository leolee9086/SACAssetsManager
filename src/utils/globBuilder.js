/**
 * @fileoverview 已弃用 - 文件路径匹配工具
 * @deprecated 请直接从对应toolBox文件导入函数：
 * - defaultExcludePatterns: src/toolBox/base/useEcma/forFile/globTools.js
 * - getGlobPatternsIncludingParent: src/toolBox/base/useEcma/forFile/globTools.js
 * - 构建搜索模式: src/toolBox/base/useEcma/forFile/globTools.js
 */

// 从新路径导入函数
import { 
    默认排除模式, 
    构建包含父目录的Glob模式, 
    构建搜索模式,
    defaultExcludePatterns,
    getGlobPatternsIncludingParent
} from '../../src/toolBox/base/useEcma/forFile/globTools.js';

// 重新导出所有函数，保持兼容性
export { 
    默认排除模式, 
    构建包含父目录的Glob模式, 
    构建搜索模式,
    defaultExcludePatterns,
    getGlobPatternsIncludingParent
};

// 此文件已弃用，请直接从toolBox导入相应函数
console.warn('globBuilder.js 已弃用，请直接从toolBox导入相应函数'); 