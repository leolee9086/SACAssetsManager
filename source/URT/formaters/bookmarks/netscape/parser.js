/**
 * @typedef {Object} BookmarkNode
 * @property {'bookmark'|'folder'} type - 节点类型
 * @property {string} title - 标题
 * @property {string} [href] - 书签URL(仅书签类型)
 * @property {string} [addDate] - 添加日期
 * @property {string} [lastModified] - 最后修改时间(仅文件夹类型)
 * @property {string} [icon] - 图标URL(仅书签类型)
 * @property {BookmarkNode[]} [children] - 子节点(仅文件夹类型)
 */

/**
 * 解析书签标签(A标签)
 * @param {Element} a A标签元素
 * @returns {BookmarkNode} 书签节点对象
 */
function parseBookmarkTag(a) {
  return {
    type: 'bookmark',
    title: a.textContent || '',
    href: a.getAttribute('href') || '',
    addDate: a.getAttribute('ADD_DATE') || '',
    icon: a.getAttribute('ICON') || ''
  };
}

/**
 * 解析文件夹标签(H3标签)
 * @param {Element} h3 H3标签元素
 * @param {Element} dl 相关的DL标签元素
 * @returns {BookmarkNode} 文件夹节点对象
 */
function parseFolderTag(h3, dl) {
  const folder = {
    type: 'folder',
    title: h3.textContent || '',
    addDate: h3.getAttribute('ADD_DATE') || '',
    lastModified: h3.getAttribute('LAST_MODIFIED') || '',
    children: []
  };

  if (dl) {
    folder.children = parseBookmarkList(dl);
  }

  return folder;
}

/**
 * 解析书签列表(DL标签)
 * @param {Element} dl DL标签元素
 * @returns {BookmarkNode[]} 书签节点数组
 */
function parseBookmarkList(dl) {
  const nodes = [];
  let currentDT = null;

  for (const child of dl.children) {
    // 跳过<p>标签
    if (child.tagName === 'P') continue;

    if (child.tagName === 'DT') {
      currentDT = child;
      const h3 = child.querySelector('H3');
      const a = child.querySelector('A');

      if (h3) {
        // 找到下一个相邻的DL元素
        const nextDL = child.querySelector('DL');
        nodes.push(parseFolderTag(h3, nextDL));
      } else if (a) {
        nodes.push(parseBookmarkTag(a));
      }
    }
  }

  return nodes;
}

/**
 * 将Netscape格式的书签HTML解析为JSON结构
 * @param {string} html Netscape格式的书签HTML字符串
 * @returns {BookmarkNode[]} 书签树结构
 * @throws {Error} 解析错误时抛出异常
 */
function parseNetscapeToJSON(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const rootDL = doc.querySelector('DL');
  if (!rootDL) {
    throw new Error('无效的Netscape书签格式：缺少根DL元素');
  }

  return parseBookmarkList(rootDL);
}

export {
  parseNetscapeToJSON
};
