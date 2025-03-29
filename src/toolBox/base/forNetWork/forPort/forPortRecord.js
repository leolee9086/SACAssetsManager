/**
 * @fileoverview 端口记录管理工具函数
 */

import fs from '../../../../../polyfills/fs.js';

// 端口配置文件路径
const PORT_INTERNAL_PATH = '/data/public/sacPorts.json';

/**
 * 读取端口记录
 * @returns {Promise<Object>} 端口记录对象，键为应用名称，值为端口号
 */
export const 读取端口记录 = async () => {
    let json = {};
    if (await fs.exists(PORT_INTERNAL_PATH)) {
        json = JSON.parse(await fs.readFile(PORT_INTERNAL_PATH));
    }
    return json;
};

/**
 * 写入端口记录
 * @param {string} 记录名 - 应用名称
 * @param {number} 记录值 - 端口号
 * @returns {Promise<void>}
 */
export const 写入端口记录 = async (记录名, 记录值) => {
    let json = {};
    if (await fs.exists(PORT_INTERNAL_PATH)) {
        json = JSON.parse(await fs.readFile(PORT_INTERNAL_PATH));
    }
    json[记录名] = 记录值;
    await fs.writeFile(
        PORT_INTERNAL_PATH,
        JSON.stringify(json, undefined, 2)
    );
}; 