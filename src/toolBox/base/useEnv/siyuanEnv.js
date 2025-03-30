/**
 * 思源笔记环境检测工具
 * 用于检查当前运行环境是否为思源笔记环境
 * @module siyuanEnv
 */

/**
 * 检查当前是否处于思源笔记环境中
 * @returns {boolean} 如果在思源环境中返回true，否则返回false
 */
export const 检查思源环境 = () => {
  return typeof window !== 'undefined' && !!window.siyuan;
};

/**
 * 获取思源环境信息
 * @returns {Object|null} 包含思源环境信息的对象，如果不在思源环境中则返回null
 */
export const 获取思源环境信息 = () => {
  if (!检查思源环境()) {
    return null;
  }

  return {
    版本: window.siyuan?.config?.system?.kernelVersion || '',
    语言: window.siyuan?.config?.lang || 'zh_CN',
    操作系统: window.siyuan?.config?.system?.os || '',
    应用模式: window.siyuan?.config?.system?.mode || '',
    工作空间: window.siyuan?.config?.system?.workspaceDir || ''
  };
}; 