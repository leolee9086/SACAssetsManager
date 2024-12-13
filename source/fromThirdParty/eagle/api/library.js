import { request } from '../core/request';

/**
 * 获取资源库信息
 * @param {Object} params - 请求参数
 * @param {string} params.token - API token
 * @returns {Promise<{
 *   status: string,
 *   data: {
 *     folders: Array<{
 *       id: string,
 *       name: string,
 *       description: string,
 *       children: Array<{
 *         id: string,
 *         name: string,
 *         description: string,
 *         children: Array,
 *         modificationTime: number,
 *         tags: string[],
 *         iconColor?: string,
 *         icon?: string,
 *         password: string,
 *         passwordTips: string,
 *         coverId?: string,
 *         orderBy?: string,
 *         sortIncrease?: boolean
 *       }>,
 *       modificationTime: number,
 *       tags: string[],
 *       iconColor?: string,
 *       icon?: string,
 *       password: string,
 *       passwordTips: string,
 *       coverId?: string,
 *       orderBy?: string,
 *       sortIncrease?: boolean
 *     }>,
 *     smartFolders: Array<{
 *       id: string,
 *       icon: string,
 *       name: string,
 *       description: string,
 *       modificationTime: number,
 *       conditions: Array<{
 *         match: string,
 *         rules: Array<{
 *           method: string,
 *           property: string,
 *           value: any
 *         }>
 *       }>,
 *       orderBy?: string,
 *       sortIncrease?: boolean
 *     }>,
 *     quickAccess: Array<{
 *       type: string,
 *       id: string
 *     }>,
 *     tagsGroups: Array<{
 *       id: string,
 *       name: string,
 *       tags: string[],
 *       color?: string
 *     }>,
 *     modificationTime: number,
 *     applicationVersion: string
 *   }
 * }>} 返回资源库信息
 */
async function getLibraryInfo(params) {
  try {
    const response = await fetch(`http://localhost:41595/api/library/info?token=${params.token}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('获取资源库信息失败:', error);
    throw error;
  }
}

/**
 * 获取资源库历史记录
 * @param {Object} params - 请求参数
 * @param {string} params.token - API token
 * @returns {Promise<{
 *   status: string,
 *   data: string[] // 资源库路径列表
 * }>} 返回资源库历史记录
 */
async function getLibraryHistory(params) {
  try {
    const response = await fetch(`http://localhost:41595/api/library/history?token=${params.token}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('获取资源库历史记录失败:', error);
    throw error;
  }
}

/**
 * 切换资源库
 * @param {Object} params - 请求参数
 * @param {string} params.libraryPath - 资源库路径
 * @param {string} params.token - API token
 * @returns {Promise<{status: string}>} 返回切换结果
 */
async function switchLibrary(params) {
  try {
    const response = await fetch("http://localhost:41595/api/library/switch", {
      method: 'POST',
      body: JSON.stringify({
        libraryPath: params.libraryPath,
        token: params.token
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('切换资源库失败:', error);
    throw error;
  }
}

// 导出所有函数
export {
  getLibraryInfo,
  getLibraryHistory,
  switchLibrary
};

