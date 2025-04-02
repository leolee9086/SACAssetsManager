/**
 * 浏览器窗口核心功能
 * 提供基础的窗口创建和配置功能
 */

/**
 * 获取BrowserWindow对象
 * @returns {Object|null} BrowserWindow对象或null
 */
export const 获取BrowserWindow = () => {
  return (window.require && window.require('@electron/remote'))
    ? window.require('@electron/remote').BrowserWindow
    : null;
};

/**
 * 合并窗口配置
 * @param {Object} 用户配置 - 用户提供的配置
 * @returns {Object} 合并后的配置
 */
export const 合并窗口配置 = (用户配置 = {}) => {
  const 默认配置 = {
    关闭已有窗口: true,
    单实例: true,
    立即显示: true,
    清除缓存: true,
    保持活跃: true,
    使用心跳检测: true,
    显示标题栏: true,
    获取同源窗口函数: null,
    enableRemote: null
  };

  return { ...默认配置, ...用户配置 };
};

/**
 * 验证窗口配置有效性
 * @param {Object} 配置 - 窗口配置
 */
export const 验证配置有效性 = (配置) => {
  if (配置.保持活跃 && !配置.单实例) {
    throw new Error('保持活跃选项不能对非单例窗口使用');
  }
}; 