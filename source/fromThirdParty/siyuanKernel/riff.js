import { getApiUrl, handleApiError } from './utils/apiConfig';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils';

/**
 * 发送闪卡相关请求的通用方法
 * @private
 * @param {string} endpoint - API 端点
 * @param {Object} data - 请求数据
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
const sendRiffRequest = async (endpoint, data, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl(`/api/riff/${endpoint}`, options.host), {
      method: 'POST',
      headers: {
        ...getAuthHeaders({ token: options.token }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, `闪卡${endpoint}操作`);
  }
};

/**
 * 获取闪卡列表
 * @param {Object} options - 查询选项
 * @param {string} options.id - 卡包ID
 * @param {number} options.page - 页码
 * @param {number} [options.pageSize=20] - 每页数量
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     blocks: Array<Object>,
 *     total: number,
 *     pageCount: number
 *   }
 * }>}
 */
export const getRiffCards = (options) => {
  const { id, page, pageSize = 20 } = options;
  
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '卡包ID不能为空',
      data: null
    });
  }

  return sendRiffRequest('getRiffCards', { id, page, pageSize });
};

/**
 * 复习闪卡
 * @param {Object} options - 复习选项
 * @param {string} options.deckID - 卡包ID
 * @param {string} options.cardID - 卡片ID
 * @param {number} options.rating - 评分(0-5)
 * @param {Array<{cardID: string}>} [options.reviewedCards] - 已复习卡片列表
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const reviewRiffCard = (options) => {
  const { deckID, cardID, rating, reviewedCards = [] } = options;

  // 参数验证
  if (!deckID || !cardID) {
    return Promise.resolve({
      code: -1,
      msg: '卡包ID和卡片ID不能为空',
      data: null
    });
  }

  if (rating < 0 || rating > 5) {
    return Promise.resolve({
      code: -1,
      msg: '评分必须在0-5之间',
      data: null
    });
  }

  return sendRiffRequest('reviewRiffCard', {
    deckID,
    cardID,
    rating,
    reviewedCards
  });
};

/**
 * 获取待复习闪卡
 * @param {Object} params - 查询选项
 * @param {string} params.deckID - 卡包ID
 * @param {Array<{cardID: string}>} [params.reviewedCards] - 已复习卡片列表
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     cards: Array<Object>,
 *     unreviewedCount: number,
 *     unreviewedNewCardCount: number,
 *     unreviewedOldCardCount: number
 *   }
 * }>}
 */
export const getRiffDueCards = (params, options = {}) => {
  const { deckID, reviewedCards = [] } = params;

  if (!deckID) {
    return Promise.resolve({
      code: -1,
      msg: '卡包ID不能为空',
      data: null
    });
  }

  return sendRiffRequest('getRiffDueCards', {
    deckID,
    reviewedCards
  }, options);
};

/**
 * 重置闪卡
 * @param {Object} params - 重置选项
 * @param {string} params.type - 类型(notebook/tree/deck)
 * @param {string} params.id - ID(笔记本ID/目录ID/卡包ID)
 * @param {string} params.deckID - 卡包ID
 * @param {Array<string>} [params.blockIDs] - 要重置的块ID列表
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const resetRiffCards = (params, options = {}) => {
  const { type, id, deckID, blockIDs = [] } = params;

  if (!['notebook', 'tree', 'deck'].includes(type)) {
    return Promise.resolve({
      code: -1,
      msg: '无效的类型',
      data: null
    });
  }

  if (!id || !deckID) {
    return Promise.resolve({
      code: -1,
      msg: 'ID和卡包ID不能为空',
      data: null
    });
  }

  return sendRiffRequest('resetRiffCards', {
    type,
    id,
    deckID,
    blockIDs
  }, options);
};

/**
 * 创建闪卡卡包
 * @param {Object} params - 创建参数
 * @param {string} params.name - 卡包名称
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: {id: string}}>}
 */
export const createRiffDeck = (params, options = {}) => {
  const { name } = params;
  if (!name) {
    return Promise.resolve({
      code: -1,
      msg: '卡包名称不能为空',
      data: null
    });
  }
  return sendRiffRequest('createRiffDeck', { name }, options);
};

/**
 * 重命名闪卡卡包
 * @param {Object} params - 重命名选项
 * @param {string} params.id - 卡包ID
 * @param {string} params.name - 新名称
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const renameRiffDeck = (params, options = {}) => {
  const { id, name } = params;
  if (!id || !name) {
    return Promise.resolve({
      code: -1,
      msg: '参数不完整',
      data: null
    });
  }
  return sendRiffRequest('renameRiffDeck', { id, name }, options);
};

/**
 * 获取所有卡包
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: Array<{
 *     id: string,
 *     name: string,
 *     cardCount: number,
 *     dueCardCount: number
 *   }>
 * }>}
 */
export const getRiffDecks = (options = {}) => {
  return sendRiffRequest('getRiffDecks', {}, options);
};

/**
 * 添加闪卡
 * @param {Object} params - 添加选项
 * @param {string} params.deckID - 卡包ID
 * @param {Array<string>} params.blockIDs - 块ID列表
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const addRiffCards = (params, options = {}) => {
  const { deckID, blockIDs } = params;
  if (!deckID || !blockIDs?.length) {
    return Promise.resolve({
      code: -1,
      msg: '参数不完整',
      data: null
    });
  }
  return sendRiffRequest('addRiffCards', { deckID, blockIDs }, options);
};

/**
 * 获取文档树的待复习卡片
 * @param {Object} params - 查询选项
 * @param {string} params.rootID - 根文档ID
 * @param {Array<{cardID: string}>} [params.reviewedCards] - 已复习卡片列表
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     cards: Array<Object>,
 *     unreviewedCount: number
 *   }
 * }>}
 */
export const getTreeRiffDueCards = (params, options = {}) => {
  const { rootID, reviewedCards = [] } = params;
  if (!rootID) {
    return Promise.resolve({
      code: -1,
      msg: '根文档ID不能为空',
      data: null
    });
  }
  return sendRiffRequest('getTreeRiffDueCards', { rootID, reviewedCards }, options);
};

/**
 * 获取笔记本的待复习卡片
 * @param {Object} params - 查询选项
 * @param {string} params.notebookID - 笔记本ID
 * @param {Array<{cardID: string}>} [params.reviewedCards] - 已复习卡片列表
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     cards: Array<Object>,
 *     unreviewedCount: number
 *   }
 * }>}
 */
export const getNotebookRiffDueCards = (params, options = {}) => {
  const { notebookID, reviewedCards = [] } = params;
  if (!notebookID) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID不能为空',
      data: null
    });
  }
  return sendRiffRequest('getNotebookRiffDueCards', { notebookID, reviewedCards }, options);
};

/**
 * 跳过复习卡片
 * @param {Object} params - 跳过选项
 * @param {string} params.deckID - 卡包ID
 * @param {string} params.cardID - 卡片ID
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const skipReviewRiffCard = (params, options = {}) => {
  const { deckID, cardID } = params;
  if (!deckID || !cardID) {
    return Promise.resolve({
      code: -1,
      msg: '参数不完整',
      data: null
    });
  }
  return sendRiffRequest('skipReviewRiffCard', { deckID, cardID }, options);
};

/**
 * 获取文档树的所有闪卡
 * @param {Object} params - 查询参数
 * @param {string} params.rootID - 根文档ID
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Array<Object>}>}
 */
export const getTreeRiffCards = (params, options = {}) => {
  const { rootID } = params;
  if (!rootID) {
    return Promise.resolve({
      code: -1,
      msg: '根文档ID不能为空',
      data: null
    });
  }
  return sendRiffRequest('getTreeRiffCards', { rootID }, options);
};

/**
 * 获取笔记本的所有闪卡
 * @param {Object} params - 查询参数
 * @param {string} params.notebookID - 笔记本ID
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Array<Object>}>}
 */
export const getNotebookRiffCards = (params, options = {}) => {
  const { notebookID } = params;
  if (!notebookID) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID不能为空',
      data: null
    });
  }
  return sendRiffRequest('getNotebookRiffCards', { notebookID }, options);
};

/**
 * 批量设置闪卡到期时间
 * @param {Object} params - 设置选项
 * @param {Array<string>} params.cardIDs - 卡片ID列表
 * @param {string} params.dueTime - 到期时间
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const batchSetRiffCardsDueTime = (params, options = {}) => {
  const { cardIDs, dueTime } = params;
  if (!cardIDs?.length || !dueTime) {
    return Promise.resolve({
      code: -1,
      msg: '参数不完整',
      data: null
    });
  }
  return sendRiffRequest('batchSetRiffCardsDueTime', { cardIDs, dueTime }, options);
};

/**
 * 根据块ID获取闪卡
 * @param {Object} params - 查询参数
 * @param {Array<string>} params.blockIDs - 块ID列表
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Array<Object>}>}
 */
export const getRiffCardsByBlockIDs = (params, options = {}) => {
  const { blockIDs } = params;
  if (!blockIDs?.length) {
    return Promise.resolve({
      code: -1,
      msg: '块ID列表不能为空',
      data: null
    });
  }
  return sendRiffRequest('getRiffCardsByBlockIDs', { blockIDs }, options);
};

// 使用示例：
/*
// 获取卡包列表
const decks = await getRiffDecks();

// 创建卡包
const deck = await createRiffDeck('测试卡包');

// 获取待复习卡片
const dueCards = await getRiffDueCards({
  deckID: '20210808180117-6v0mkxr',
  reviewedCards: ['card1', 'card2']
});

// 复习卡片
await reviewRiffCard({
  deckID: '20210808180117-6v0mkxr',
  cardID: 'card3',
  rating: 4
});
*/ 