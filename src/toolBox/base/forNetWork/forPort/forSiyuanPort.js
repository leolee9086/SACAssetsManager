/**
 * @fileoverview 思源端口相关工具函数
 */

import { 获取可用端口号 } from './forPortAvailability.js';
import { 读取端口记录, 写入端口记录 } from './forPortRecord.js';

/**
 * 获取思源核心服务端口号
 * @returns {Promise<number>} 思源核心服务的端口号
 */
export const 获取思源核心服务端口号 = async () => {
    if (window.siyuan) {
        return parseInt(window.location.port);
    }
    return null;
};

/**
 * 获取插件服务端口号
 * @param {string} 插件名 - 插件名称
 * @param {number} [预期端口号] - 预期的端口号，如不提供则使用记录中的端口或随机生成
 * @returns {Promise<number>} 插件服务端口号
 */
export const 获取插件服务端口号 = async (插件名, 预期端口号) => {
    let 端口记录内容 = await 读取端口记录();
    let 插件端口号 = 预期端口号 || 端口记录内容[插件名];
    
    if (!插件端口号) {
        // 生成1024到65535之间的随机端口号
        插件端口号 = Math.floor(Math.random() * (65535 - 1024 + 1)) + 1024;
        
        // 检查随机生成的端口是否可用
        插件端口号 = await 获取可用端口号(插件端口号);
        
        // 写入端口记录
        await 写入端口记录(插件名, 插件端口号);
    }
    
    return 插件端口号;
}; 