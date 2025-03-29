/**
 * 同步fetch工具
 * 提供同步版本的HTTP请求功能，基于XMLHttpRequest
 */

/**
 * 同步发起HTTP请求
 * @param {string} url - 请求URL
 * @param {Object} options - 请求选项
 * @returns {Object} 响应对象
 */
export const 同步发起请求 = (url, options = {}) => {
    const 警告阈值 = 50; // 毫秒
    const 开始时间 = performance.now();
    
    try {
        const xhr = new XMLHttpRequest();
        const 方法 = (options.method || 'GET').toUpperCase();
        
        // 使用同步模式打开连接
        xhr.open(方法, url, false);
        
        // 设置请求头
        if (options.headers) {
            Object.entries(options.headers).forEach(([key, value]) => {
                xhr.setRequestHeader(key, value);
            });
        }
        
        // 发送请求
        xhr.send(options.body || null);
        
        // 计算执行时间
        const 结束时间 = performance.now();
        const 执行时间 = 结束时间 - 开始时间;
        
        // 性能警告
        if (执行时间 > 警告阈值) {
            console.warn(
                `[性能警告] 同步请求耗时过长: ${执行时间.toFixed(2)}ms\n` +
                `URL: ${url}\n` +
                `建议使用异步fetch或fetchWorker替代`
            );
        }
        
        // 处理响应头
        const 响应头字符串 = xhr.getAllResponseHeaders();
        const 响应头数组 = 响应头字符串.trim().split(/[\r\n]+/);
        const 响应头映射 = {};
        
        响应头数组.forEach(行 => {
            const 部分 = 行.split(': ');
            const 头名称 = 部分.shift();
            const 头值 = 部分.join(': ');
            响应头映射[头名称] = 头值;
        });
        
        // 构造类似fetch的Response对象
        return new class Response {
            ok = xhr.status >= 200 && xhr.status < 300;
            status = xhr.status;
            statusText = xhr.statusText;
            headers = new Headers(响应头映射);
            
            /**
             * 将响应解析为JSON
             * @returns {Object} 解析后的JSON对象
             */
            json() {
                return JSON.parse(xhr.responseText);
            }
            
            /**
             * 将响应作为文本返回
             * @returns {string} 响应文本
             */
            text() {
                return xhr.responseText;
            }
            
            /**
             * 将响应解析为Blob对象
             * @returns {Blob} 响应的Blob对象
             */
            blob() {
                return new Blob([xhr.response]);
            }
            
            /**
             * 将响应解析为FormData对象
             * @returns {FormData} 响应的FormData对象
             */
            formData() {
                return new FormData(xhr.response);
            }
            
            /**
             * 将响应解析为ArrayBuffer
             * @returns {ArrayBuffer} 响应的ArrayBuffer
             */
            arrayBuffer() {
                return xhr.response;
            }
        };
    } catch (错误) {
        throw new Error(`同步请求失败: ${错误.message}`);
    }
};

/**
 * 同步获取JSON数据
 * @param {string} url - 请求URL
 * @param {Object} options - 请求选项
 * @returns {Object} 解析后的JSON对象
 */
export const 同步获取JSON = (url, options = {}) => {
    const 响应 = 同步发起请求(url, options);
    return 响应.json();
};

/**
 * 同步获取文本数据
 * @param {string} url - 请求URL
 * @param {Object} options - 请求选项
 * @returns {string} 响应文本
 */
export const 同步获取文本 = (url, options = {}) => {
    const 响应 = 同步发起请求(url, options);
    return 响应.text();
};

// 英文名称API (为了国际化)
export const fetchSync = 同步发起请求;
export const fetchSyncJSON = 同步获取JSON;
export const fetchSyncText = 同步获取文本; 