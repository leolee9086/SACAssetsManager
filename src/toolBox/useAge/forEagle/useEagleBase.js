/**
 * @fileoverview Eagle API 基础模块
 * @module toolBox/useAge/forEagle/useEagleBase
 */

// Eagle API 基础配置
export const EAGLE_API_BASE = 'http://localhost:41595';

/**
 * 基础请求函数
 * @param {string} 路径 - API路径
 * @param {Object} 选项 - 请求选项
 * @returns {Promise<Object>} 响应数据
 * @throws {Error} 当请求失败时抛出错误
 */
export const 基础请求 = async (路径, 选项 = {}) => {
    const url = `${EAGLE_API_BASE}${路径}`;
    const 请求选项 = {
        ...选项,
        headers: {
            'Content-Type': 'application/json',
            ...选项.headers
        }
    };

    try {
        // 如果在浏览器环境中，使用GM_xmlhttpRequest
        if (typeof window !== 'undefined' && typeof GM_xmlhttpRequest !== 'undefined') {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    url,
                    method: 请求选项.method,
                    data: 请求选项.body,
                    headers: 请求选项.headers,
                    onload: (response) => {
                        try {
                            const data = JSON.parse(response.responseText);
                            resolve(data);
                        } catch (error) {
                            reject(new Error('解析响应数据失败'));
                        }
                    },
                    onerror: () => reject(new Error('请求失败'))
                });
            });
        }

        // 在Node.js环境中使用fetch
        const response = await fetch(url, 请求选项);
        if (!response.ok) {
            throw new Error(`请求失败: ${response.status} ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        if (error.message === 'Failed to fetch') {
            throw new Error('无法连接到Eagle API，请确保Eagle正在运行且端口41595可访问');
        }
        throw error;
    }
};

/**
 * 检查Eagle应用是否运行
 * @returns {Promise<boolean>} 是否运行
 */
export const 检查应用运行状态 = async () => {
    try {
        const response = await fetch(`${EAGLE_API_BASE}/api/application/info`);
        return response.ok;
    } catch {
        return false;
    }
};

// 导出英文版 API
export const baseRequest = 基础请求;
export const checkApplicationStatus = 检查应用运行状态; 