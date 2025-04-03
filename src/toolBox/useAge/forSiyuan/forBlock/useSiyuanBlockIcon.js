/**
 * @fileoverview 思源笔记块图标工具函数
 * @module toolBox/useAge/forSiyuan/forBlock/useSiyuanBlockIcon
 * @description 提供根据块类型获取对应图标的工具函数
 */

/**
 * 块类型与图标映射表
 * @type {Object<string, string>}
 */
const 块类型图标映射 = {
  NodeDocument: 'iconFile',
  NodeThematicBreak: 'iconLine',
  NodeParagraph: 'iconParagraph',
  NodeBlockquote: 'iconQuote',
  NodeListItem: 'iconListItem',
  NodeCodeBlock: 'iconCode',
  NodeYamlFrontMatter: 'iconCode',
  NodeTable: 'iconTable',
  NodeBlockQueryEmbed: 'iconSQL',
  NodeSuperBlock: 'iconSuper',
  NodeMathBlock: 'iconMath',
  NodeHTMLBlock: 'iconHTML5',
  NodeWidget: 'iconBoth',
  NodeIFrame: 'iconLanguage',
  NodeVideo: 'iconVideo',
  NodeAudio: 'iconRecord',
  NodeAttributeView: 'iconDatabase'
};

/**
 * 列表类型与图标映射表
 * @type {Object<string, string>}
 */
const 列表图标映射 = {
  t: 'iconCheck',
  o: 'iconOrderedList',
  default: 'iconList'
};

/**
 * 根据块类型获取对应的图标名称
 * @param {string} type - 块类型
 * @param {string} [sub] - 子类型
 * @returns {string} 图标名称
 */
export const 根据类型获取图标 = (type, sub) => {
  // 处理特殊情况
  if (type === 'NodeHeading') {
    return sub ? `icon${sub.toUpperCase()}` : 'iconHeadings';
  }
  
  if (type === 'NodeList') {
    return 列表图标映射[sub] || 列表图标映射.default;
  }

  // 处理常规情况
  return 块类型图标映射[type] || '';
};

/**
 * 返回块类型图标映射表对象 (不可变)
 * @returns {Object<string, string>} 块类型图标映射表的只读副本
 */
export const 获取块类型图标映射 = () => Object.freeze({...块类型图标映射});

/**
 * 返回列表图标映射表对象 (不可变)
 * @returns {Object<string, string>} 列表图标映射表的只读副本
 */
export const 获取列表图标映射 = () => Object.freeze({...列表图标映射});

// 兼容原有API导出
export const getIconByType = 根据类型获取图标;
export const TYPE_ICON_MAP = 块类型图标映射;
export const LIST_ICON_MAP = 列表图标映射;

export default {
  getIconByType: 根据类型获取图标,
  TYPE_ICON_MAP: 块类型图标映射,
  LIST_ICON_MAP: 列表图标映射
}; 