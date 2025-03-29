/**
 * @fileoverview 端口可用性检查工具函数
 */

import { 校验端口号格式 } from './forPortValidation.js';
import { 读取端口记录 } from './forPortRecord.js';

/**
 * 创建测试服务用于端口检查
 * @returns {Server} HTTP服务器实例
 * @private
 */
function 创建测试服务() {
    let http = window.require("http");
    return http.createServer();
}

/**
 * 检查端口是否已被使用
 * @param {number} 端口号 - 需要检查的端口号
 * @returns {Promise<string|undefined>} 如果端口已被使用，返回占用该端口的应用名称
 */
export async function 检查端口是否已被使用(端口号) {
    let 端口记录内容 = await 读取端口记录();
    return Object.keys(端口记录内容).find((k) => 端口记录内容[k] == 端口号);
}

/**
 * 获取可用端口号，如果指定端口被占用则递增寻找
 * @param {number} 端口号 - 首选端口号
 * @returns {Promise<number>} 可用的端口号
 */
export const 获取可用端口号 = async (端口号) => {
    校验端口号格式(端口号);
    return new Promise(async (resolve, reject) => {
        let 测试服务 = 创建测试服务();
        let 可用端口号 = 端口号 || parseInt(window.location.port);
        if (await 检查端口是否已被使用(可用端口号)) {
            resolve(await 获取可用端口号(可用端口号 + 1));
            return;
        }
        测试服务.on("listening", () => {
            测试服务.close(() => {
                resolve(可用端口号);
            });
        });
        测试服务.on("error", async (error) => {
            if (error.code === "EADDRINUSE") {
                resolve(await 获取可用端口号(可用端口号 + 1));
            } else {
                reject(error);
            }
        });
        测试服务.listen(端口号);
    });
};
 