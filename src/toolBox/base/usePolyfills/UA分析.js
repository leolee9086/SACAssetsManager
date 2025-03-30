/**
 * @fileoverview 已弃用 - UA分析工具
 * @deprecated 请直接从对应toolBox文件导入函数：
 * - 创建设备分析: src/toolBox/usePolyfills/uaAnalysis.js
 * - 分析基本信息: src/toolBox/usePolyfills/uaAnalysis.js
 * - 分析设备特征: src/toolBox/usePolyfills/uaAnalysis.js
 */

// 从新路径导入函数
import {
    创建基础上下文,
    添加结果,
    分析基本信息,
    分析设备特征,
    分析兼容性,
    批量分析UA,
    结果处理器,
    管道,
    创建设备分析,
    createUAContext,
    addResult,
    analyzeBasicInfo,
    analyzeDeviceFeatures,
    analyzeCompatibility,
    batchAnalyzeUA,
    resultProcessors,
    pipe,
    createDeviceAnalyzer
} from './usePolyfills/uaAnalysis.js';

// 重新导出所有函数，保持兼容性
export {
    创建基础上下文,
    添加结果,
    分析基本信息,
    分析设备特征,
    分析兼容性,
    批量分析UA,
    结果处理器,
    管道,
    创建设备分析,
    createUAContext,
    addResult,
    analyzeBasicInfo,
    analyzeDeviceFeatures,
    analyzeCompatibility,
    batchAnalyzeUA,
    resultProcessors,
    pipe,
    createDeviceAnalyzer
};

// 此文件已弃用，请直接从toolBox导入相应函数
console.warn('UA分析.js 已弃用，请直接从toolBox/usePolyfills/uaAnalysis.js导入相应函数'); 