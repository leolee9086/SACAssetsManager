/**
 * @fileoverview MD5哈希计算工具函数
 * @module toolBox/base/useEcma/forCrypto/forHash/computeMd5Hash
 * @description 提供计算MD5哈希值的纯函数
 */

/**
 * 计算字符串或二进制数据的MD5哈希值
 * @param {string|Buffer} data - 要计算哈希的数据
 * @returns {string} 计算出的MD5哈希值（十六进制字符串）
 */
export function computeMd5Hash(data) {
  const crypto = require('crypto');
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * 生成缓存键的函数 - 对任意输入生成MD5哈希值作为缓存键
 * @param {string|Buffer|Object} raw - 要转换为缓存键的数据
 * @returns {string} 生成的缓存键
 */
export function computeCacheKey(raw) {
  // 如果是对象，先转为JSON字符串
  const data = typeof raw === 'object' && raw !== null && !(raw instanceof Buffer)
    ? JSON.stringify(raw)
    : raw;
  
  return computeMd5Hash(data);
} 