import { createResource, createFolder, createBookmark } from '../builder.js';
import parseXBEL from '../formaters/bookmarks/xbel/parser.js';

/**
 * 将XBEL节点转换为URT资源
 * @param {BookmarkNode|FolderNode|SeparatorNode} node XBEL节点
 * @param {Object} options 配置选项
 * @returns {URTResource|null}
 */
function convertNode(node, options = {}) {
  if (!node) return null;

  switch (node.type) {
    case 'bookmark':
      return createBookmark(node.title || '未命名书签', node.href, {
        description: node.desc,
        icon: node.icon,
        created: node.added,
        modified: node.modified,
        ...options
      });

    case 'folder': {
      const folder = createFolder(node.title || '未命名文件夹', null, {
        description: node.desc,
        icon: 'folder',
        ...options
      });

      // 递归处理子节点
      const children = (node.children || [])
        .map(child => convertNode(child, options))
        .filter(Boolean); // 过滤掉 null 值（如分隔符）

      return {
        ...folder,
        children
      };
    }

    case 'separator':
      return null; // 忽略分隔符

    default:
      console.warn(`未知的节点类型: ${node.type}`);
      return null;
  }
}

/**
 * 将XBEL格式转换为URT资源
 * @param {string} content XBEL内容
 * @param {Object} options 配置选项
 * @returns {URTResource}
 */
function fromXBEL(content, options = {}) {
  // 解析XBEL内容
  const xbelTree = parseXBEL(content);

  // 创建根集合
  const rootResource = createResource({
    type: 'collection',
    driver: 'local',
    name: xbelTree.title || '导入的书签',
    meta: {
      isDirectory: true,
      isVirtual: true,
      created: Date.now().toString()
    },
    extra: {
      icon: options.icon || 'bookmarks',
      description: xbelTree.desc,
      format: 'xbel',
      version: xbelTree.version
    }
  });

  // 转换所有子节点
  const children = (xbelTree.children || [])
    .map(child => convertNode(child, options))
    .filter(Boolean);

  return {
    ...rootResource,
    children
  };
}

export {
  fromXBEL
};
