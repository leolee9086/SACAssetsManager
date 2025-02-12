import kernelApi from '../../../polyfills/kernelApi.js'

/**
 * 获取块的详细内容
 * @param {string} blockId 块ID
 * @returns {Promise<{content: string}>} 包含块内容的对象
 */
export async function fetchBlockContent(blockId) {
  try {
    const blockInfo = await kernelApi.getBlockKramdown({
      id: blockId
    });
    return { content: blockInfo.kramdown };
  } catch (error) {
    console.error('获取块内容失败:', error);
    return { content: '' };
  }
}

/**
 * 批量获取块的内容
 * @param {Array<{id: string, score: number}>} items 包含块ID的结果项数组
 * @returns {Promise<Array>} 包含完整内容的结果数组
 */
export async function enrichResultsWithContent(items) {
  return Promise.all(
    items.map(async (item) => {
      const blockInfo = await fetchBlockContent(item.id);
      return {
        ...item,
        content: blockInfo.content || item.content
      };
    })
  );
} 