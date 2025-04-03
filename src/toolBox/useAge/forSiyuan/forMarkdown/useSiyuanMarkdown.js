/**
 * @fileoverview 思源笔记Markdown处理工具函数
 * @module toolBox/useAge/forSiyuan/forMarkdown/useSiyuanMarkdown
 * @description 提供对思源笔记块Markdown内容的读写操作
 */

/**
 * 验证容器对象是否有效
 * @private
 * @param {Object} 容器 - 块容器对象
 * @throws {Error} 如果容器无效则抛出错误
 */
const 验证容器 = (容器) => {
  if (!容器?.id || !容器?.kernelApi) {
    throw new Error('容器必须包含 id 和 kernelApi 属性');
  }
};

/**
 * Markdown操作工具对象
 * @type {Object}
 */
export const Markdown工具 = {
  /**
   * 同步获取块的Markdown内容
   * @param {Object} 容器 - 块容器对象，需包含id和kernelApi属性
   * @returns {string} Markdown内容
   * @throws {Error} 如果容器无效则抛出错误
   */
  获取: (容器) => {
    验证容器(容器);
    return 容器.kernelApi.getBlockKramdown.sync({ id: 容器.id }).kramdown;
  },

  /**
   * 异步获取块的Markdown内容
   * @param {Object} 容器 - 块容器对象，需包含id和kernelApi属性
   * @returns {Promise<string>} 解析为Markdown内容的Promise
   * @throws {Error} 如果容器无效则抛出错误
   */
  获取异步: async (容器) => {
    验证容器(容器);
    const result = await 容器.kernelApi.getBlockKramdown({ id: 容器.id });
    return result.kramdown;
  },

  /**
   * 同步设置块的Markdown内容
   * @param {Object} 容器 - 块容器对象，需包含id和kernelApi属性
   * @param {string} content - 要设置的Markdown内容
   * @returns {Object} 更新结果
   * @throws {Error} 如果容器无效则抛出错误
   */
  设置: (容器, content) => {
    验证容器(容器);
    return 容器.kernelApi.updateBlock({
      id: 容器.id,
      data: content,
      type: 'markdown'
    });
  },

  /**
   * 异步设置块的Markdown内容
   * @param {Object} 容器 - 块容器对象，需包含id和kernelApi属性
   * @param {string} content - 要设置的Markdown内容
   * @returns {Promise<Object>} 解析为更新结果的Promise
   * @throws {Error} 如果容器无效则抛出错误
   */
  设置异步: async (容器, content) => {
    验证容器(容器);
    return await 容器.kernelApi.updateBlock({
      id: 容器.id,
      data: content,
      type: 'markdown'
    });
  }
};

/**
 * 创建Markdown操作工具实例
 * @param {Object} 容器 - 块容器对象，需包含id和kernelApi属性
 * @returns {Object} Markdown操作工具实例
 */
export const 创建Markdown工具 = (容器) => {
  验证容器(容器);
  
  return {
    /**
     * 获取Markdown内容
     * @returns {string} Markdown内容
     */
    获取: () => Markdown工具.获取(容器),
    
    /**
     * 异步获取Markdown内容
     * @returns {Promise<string>} 解析为Markdown内容的Promise
     */
    获取异步: () => Markdown工具.获取异步(容器),
    
    /**
     * 设置Markdown内容
     * @param {string} content - 要设置的Markdown内容
     * @returns {Object} 更新结果
     */
    设置: (content) => Markdown工具.设置(容器, content),
    
    /**
     * 异步设置Markdown内容
     * @param {string} content - 要设置的Markdown内容
     * @returns {Promise<Object>} 解析为更新结果的Promise
     */
    设置异步: (content) => Markdown工具.设置异步(容器, content)
  };
};

// 兼容原有API导出
export const markdown委托器 = {
  _validateContainer: 验证容器,
  get: Markdown工具.获取,
  getAsync: Markdown工具.获取异步,
  set: Markdown工具.设置,
  setAsync: Markdown工具.设置异步
};

export default Markdown工具; 