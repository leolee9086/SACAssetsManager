/**
 * UA分析工具
 * 提供用户代理字符串分析和设备检测功能
 */

import {
    创建解析器,
    获取CPU信息,
    获取浏览器引擎,
    获取设备信息,
    获取操作系统,
    获取浏览器,
    检测浏览器版本,
    获取设备指纹,
    检测设备类型,
    获取UA字符串,
    解析UA字符串,
    批量解析UA
} from '../base/forPlatformDetection/useUAParser.js';

/**
 * 创建基础分析上下文
 * @param {string} UA字符串 - 用户代理字符串
 * @returns {Object} 分析上下文对象
 */
export const 创建基础上下文 = (UA字符串 = 获取UA字符串()) => ({
    UA: UA字符串,
    解析器: 创建解析器(UA字符串),
    缓存: {},
    结果集: []
});

/**
 * 添加分析结果到上下文
 * @param {Object} 上下文 - 分析上下文
 * @param {Object} 结果 - 要添加的分析结果
 * @returns {Object} 更新后的上下文
 */
export const 添加结果 = (上下文, 结果) => ({
    ...上下文,
    结果集: [...上下文.结果集, 结果]
});

/**
 * 基础信息分析器
 * @param {Object} 上下文 - 分析上下文
 * @returns {Object} 更新后的上下文
 */
export const 分析基本信息 = (上下文) => {
    const 基本信息 = {
        设备: 获取设备信息(),
        系统: 获取操作系统(),
        浏览器: 获取浏览器(),
        处理器: 获取CPU信息()
    };
    return 添加结果(上下文, 基本信息);
};

/**
 * 设备特征分析器
 * @param {Object} 上下文 - 分析上下文
 * @returns {Object} 更新后的上下文
 */
export const 分析设备特征 = (上下文) => {
    const 特征 = {
        是移动设备: 检测设备类型('mobile'),
        是平板: 检测设备类型('tablet'),
        是桌面设备: 检测设备类型('desktop'),
        浏览器引擎: 获取浏览器引擎()
    };
    return 添加结果(上下文, 特征);
};

/**
 * 兼容性分析器
 * @param {Array<Object>} 要求列表 - 浏览器兼容性要求列表
 * @returns {Function} 分析函数
 */
export const 分析兼容性 = (要求列表) => (上下文) => {
    const 兼容性结果 = 要求列表.map(要求 => ({
        浏览器: 要求.名称,
        版本要求: 要求.版本,
        是否兼容: 检测浏览器版本(要求.名称, 要求.版本)
    }));

    return 添加结果(上下文, {
        兼容性检查: 兼容性结果,
        总体兼容: 兼容性结果.every(项 => 项.是否兼容)
    });
};

/**
 * 批量UA分析器
 * @param {Array<string>} UA列表 - 用户代理字符串列表
 * @returns {Function} 分析函数
 */
export const 批量分析UA = (UA列表) => (上下文) => {
    const 分析结果 = 批量解析UA(UA列表);
    return 添加结果(上下文, {
        批量分析结果: 分析结果,
        数量统计: {
            总数: 分析结果.length,
            移动设备: 分析结果.filter(项 => 项.device.type === 'mobile').length,
            桌面设备: 分析结果.filter(项 => !项.device.type).length
        }
    });
};

/**
 * 结果处理器集合
 */
export const 结果处理器 = {
    /**
     * 筛选结果
     * @param {Function} 筛选函数 - 用于筛选结果的函数
     * @returns {Function} 处理函数
     */
    筛选: (筛选函数) => (上下文) => ({
        ...上下文,
        结果集: 上下文.结果集.filter(筛选函数)
    }),
    
    /**
     * 格式化结果
     * @param {Function} 转换函数 - 用于转换结果的函数
     * @returns {Function} 处理函数
     */
    格式化: (转换函数) => (上下文) => ({
        ...上下文,
        结果集: 上下文.结果集.map(转换函数)
    }),
    
    /**
     * 获取结果
     * @param {string} 格式 - 输出格式，可选值: '对象'或'JSON'
     * @returns {Function} 处理函数
     */
    获取结果: (格式 = '对象') => (上下文) => {
        const 结果 = 上下文.结果集.length === 1 ? 上下文.结果集[0] : 上下文.结果集;
        return 格式 === 'JSON' ? JSON.stringify(结果, null, 2) : 结果;
    }
};

/**
 * 管道函数 - 用于组合多个分析器
 * @param {...Function} 函数组 - 要组合的函数列表
 * @returns {Function} 组合后的函数
 */
export const 管道 = (...函数组) => (初始值) => 
    函数组.reduce((累积值, 当前函数) => 当前函数(累积值), 初始值);

/**
 * 创建设备分析工具
 * @param {string} UA字符串 - 用户代理字符串
 * @returns {Object} 设备分析工具对象
 */
export const 创建设备分析 = (UA字符串) => {
    const 上下文 = 创建基础上下文(UA字符串);
    return {
        基本信息: () => 分析基本信息,
        设备特征: () => 分析设备特征,
        兼容性: (要求列表) => 分析兼容性(要求列表),
        批量: (UA列表) => 批量分析UA(UA列表),
        筛选: 结果处理器.筛选,
        格式化: 结果处理器.格式化,
        获取结果: 结果处理器.获取结果,
        管道
    };
};

// 英文名称API (为了国际化)
export const createUAContext = 创建基础上下文;
export const addResult = 添加结果;
export const analyzeBasicInfo = 分析基本信息;
export const analyzeDeviceFeatures = 分析设备特征;
export const analyzeCompatibility = 分析兼容性;
export const batchAnalyzeUA = 批量分析UA;
export const resultProcessors = 结果处理器;
export const pipe = 管道;
export const createDeviceAnalyzer = 创建设备分析; 