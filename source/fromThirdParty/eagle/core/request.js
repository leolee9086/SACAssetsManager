import { getApiUrl, handleApiError } from '../../utils/apiConfig';
import { fetchWithTimeout } from '../../utils/fetchUtils';

export const DEFAULT_OPTIONS = {
    baseURL: 'http://localhost:41595',
    timeout: 30000
};

/**
 * 发送API请求的通用方法
 * @param {string} endpoint - API端点
 * @param {Object} [options] - 请求选项
 * @param {Object} [config] - 配置选项
 * @returns {Promise<any>}
 */
export const request = async (endpoint, options = {}, config = {}) => {
    const baseURL = config.baseURL || DEFAULT_OPTIONS.baseURL;
    const url = `${baseURL}${endpoint}`;
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json'
        },
        timeout: config.timeout || DEFAULT_OPTIONS.timeout
    };

    try {
        const response = await fetchWithTimeout(url, { 
            ...defaultOptions, 
            ...options 
        });
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }
        return await response.json();
    } catch (err) {
        return handleApiError(err, 'Eagle API请求');
    }
}; 