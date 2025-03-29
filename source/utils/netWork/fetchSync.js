/**
 * @fileoverview 已弃用 - 同步版本的fetch工具
 * @deprecated 请直接从对应toolBox文件导入函数：
 * - fetchSync: src/toolBox/base/forNetWork/forFetch/fetchSyncTools.js
 * - fetchSyncJSON: src/toolBox/base/forNetWork/forFetch/fetchSyncTools.js
 * - fetchSyncText: src/toolBox/base/forNetWork/forFetch/fetchSyncTools.js
 */

// 从新路径导入函数
import {
    同步发起请求,
    同步获取JSON,
    同步获取文本,
    fetchSync,
    fetchSyncJSON,
    fetchSyncText
} from '../../src/toolBox/base/forNetWork/forFetch/fetchSyncTools.js';

// 为向后兼容重新导出所有函数
export {
    同步发起请求,
    同步获取JSON,
    同步获取文本,
    fetchSync,
    fetchSyncJSON,
    fetchSyncText
};

// 优先使用英文命名的函数以保持兼容性
export default fetchSync;

// 此文件已弃用，请直接从toolBox导入相应函数
console.warn('fetchSync.js 已弃用，请直接从toolBox/base/forNetWork/forFetch/fetchSyncTools.js导入相应函数');

export const fetchSync = (url, options = {}) => {
    const WARN_THRESHOLD = 50;
    const startTime = performance.now();
    
    try {
        const xhr = new XMLHttpRequest();
        const method = (options.method || 'GET').toUpperCase();
        
        xhr.open(method, url, false);
        
        if (options.headers) {
            Object.entries(options.headers).forEach(([key, value]) => {
                xhr.setRequestHeader(key, value);
            });
        }
        
        xhr.send(options.body || null);
        
        const endTime = performance.now();
        const executionTime = endTime - startTime;
        
        if (executionTime > WARN_THRESHOLD) {
            console.warn(
                `[性能警告] 同步请求耗时过长: ${executionTime.toFixed(2)}ms\n` +
                `URL: ${url}\n` +
                `建议使用异步fetch替代`
            );
        }
        // 处理响应头
        const headersString = xhr.getAllResponseHeaders();
        const headersArray = headersString.trim().split(/[\r\n]+/);
        const headerMap = {};
        
        headersArray.forEach(line => {
            const parts = line.split(': ');
            const header = parts.shift();
            const value = parts.join(': ');
            headerMap[header] = value;
        });
        
        return new class Response {
            ok = xhr.status >= 200 && xhr.status < 300;
            status = xhr.status;
            statusText = xhr.statusText;
            headers = new Headers(headerMap);
            
            json() {
                return JSON.parse(xhr.responseText);
            }
            
            text() {
                return xhr.responseText;
            }
            
            blob() {
                return new Blob([xhr.response]);
            }
            
            formData() {
                return new FormData(xhr.response);
            }
            
            arrayBuffer() {
                return xhr.response;
            }
        };
    } catch (error) {
        throw new Error(`同步请求失败: ${error.message}`);
    }
}
