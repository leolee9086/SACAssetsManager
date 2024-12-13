import { getApiUrl, handleApiError } from './utils/apiConfig';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils';

/**
 * 发送扩展相关请求的通用方法
 * @private
 * @param {string} endpoint - API 端点
 * @param {Object|FormData} data - 请求数据
 * @param {boolean} [isFormData=false] - 是否为FormData格式
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
const sendExtensionRequest = async (endpoint, data, isFormData = false, options = {}) => {
  try {
    const headers = {
      ...getAuthHeaders({ token: options.token })
    };
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    
    const response = await fetchWithTimeout(getApiUrl(`/api/extension/${endpoint}`, options.host), {
      method: 'POST',
      headers,
      body: isFormData ? data : JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, `扩展${endpoint}操作`);
  }
};

/**
 * 复制扩展内容
 * @param {Object} params - 复制选项
 * @param {string} params.dom - HTML内容
 * @param {string} [params.notebook] - 笔记本ID
 * @param {string} [params.href] - 链接地址
 * @param {File[]} [params.files] - 文件列表
 * @param {Object} [options] - API可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     md: string,
 *     withMath: boolean,
 *     isLiandi?: boolean
 *   }
 * }>}
 */
export const extensionCopy = async (params, options = {}) => {
  const { dom, notebook, href, files } = params;
  
  if (!dom) {
    return Promise.resolve({
      code: -1,
      msg: 'HTML内容不能为空',
      data: null
    });
  }

  const formData = new FormData();
  formData.append('dom', dom);
  
  if (notebook) {
    formData.append('notebook', notebook);
  }
  
  if (href) {
    formData.append('href', href);
  }
  
  if (files?.length > 0) {
    for (const file of files) {
      try {
        const fileName = encodeURIComponent(file.name);
        formData.append(fileName, file);
      } catch (err) {
        console.warn(`文件 [${file.name}] 编码失败:`, err);
        continue;
      }
    }
  }

  const result = await sendExtensionRequest('copy', formData, true, options);
  
  // 处理链滴文章特殊情况
  if (href && (href.startsWith('https://ld246.com/article/') || 
      href.startsWith('https://liuyun.io/article/'))) {
    result.data = {
      ...result.data,
      isLiandi: true
    };
  }

  return result;
};

/**
 * 处理扩展资源文件
 * @param {string} fileName - 文件名
 * @param {ArrayBuffer} fileData - 文件数据
 * @param {Object} [options] - API可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {string} 处理后的文件名
 */
const handleExtensionAsset = (fileName, fileData, options = {}) => {
  let ext = fileName.split('.').pop()?.toLowerCase();
  
  // 处理没有扩展名的情况
  if (!ext || ext.includes('!')) {
    const buffer = new Uint8Array(fileData);
    // 检测 SVG
    if (buffer.indexOf('<svg ') === 0 && 
        buffer.indexOf('</svg>') === buffer.length - 6) {
      ext = 'svg';
      fileName += '.svg';
    }
    // 其他类型需要后端 mimetype 检测
  }
  
  return fileName;
}; 