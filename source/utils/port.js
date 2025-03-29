/**
 * @fileoverview 已弃用 - 端口管理工具
 * @deprecated 请直接从对应toolBox文件导入函数：
 * - 校验端口号格式: src/toolBox/base/forNetWork/forPort/forPortValidation.js
 * - 获取可用端口号: src/toolBox/base/forNetWork/forPort/forPortAvailability.js
 * - 检查端口是否已被使用: src/toolBox/base/forNetWork/forPort/forPortAvailability.js
 * - 获取思源核心服务端口号: src/toolBox/base/forNetWork/forPort/forSiyuanPort.js
 * - 读取端口记录: src/toolBox/base/forNetWork/forPort/forPortRecord.js
 * - 写入端口记录: src/toolBox/base/forNetWork/forPort/forPortRecord.js
 * - 获取插件服务端口号: src/toolBox/base/forNetWork/forPort/forSiyuanPort.js
 */

// 从新路径导入函数
import { 校验端口号格式 } from '../../src/toolBox/base/forNetWork/forPort/forPortValidation.js';
import { 获取可用端口号, 检查端口是否已被使用 } from '../../src/toolBox/base/forNetWork/forPort/forPortAvailability.js';
import { 获取思源核心服务端口号, 获取插件服务端口号 } from '../../src/toolBox/base/forNetWork/forPort/forSiyuanPort.js';
import { 读取端口记录, 写入端口记录 } from '../../src/toolBox/base/forNetWork/forPort/forPortRecord.js';

// 重新导出所有函数
export {
    校验端口号格式,
    获取可用端口号,
    检查端口是否已被使用,
    获取思源核心服务端口号,
    读取端口记录,
    写入端口记录,
    获取插件服务端口号
};

// 此文件已弃用，请直接从toolBox导入相应函数
console.warn('port.js 已弃用，请直接从toolBox导入相应函数');