/**
 * @typedef {Object} ParseOptions
 * @property {number} [indent=0] - 缩进级别
 */

/**
 * 转义HTML属性值
 * @param {string} str 需要转义的字符串
 * @returns {string} 转义后的字符串
 */
function escapeAttr(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 解析书签节点
 * @param {Element} bookmark 书签元素
 * @param {number} indent 缩进级别
 * @returns {string} 解析后的HTML字符串
 */
function parseBookmark(bookmark, indent) {
  const title = bookmark.querySelector('title')?.textContent || '';
  const href = bookmark.getAttribute('href') || '';
  const info = bookmark.querySelector('info');
  
  // 提取元数据
  const addDate = info?.querySelector('nc\\:AddDate')?.textContent || '';
  const icon = info?.querySelector('nc\\:Icon')?.textContent || '';
  
  // 创建书签标签
  return '\n' + '    '.repeat(indent) + 
    `<DT><A HREF="${escapeAttr(href)}"${addDate ? ` ADD_DATE="${addDate}"` : ''}${icon ? ` ICON="${escapeAttr(icon)}"` : ''}>${title}</A>`;
}

/**
 * 解析文件夹节点
 * @param {Element} folder 文件夹元素
 * @param {number} indent 缩进级别
 * @returns {string} 解析后的HTML字符串
 */
function parseFolder(folder, indent) {
  const title = folder.querySelector('title')?.textContent || '';
  const info = folder.querySelector('info');
  
  // 提取元数据
  const addDate = info?.querySelector('nc\\:AddDate')?.textContent || '';
  const lastModified = info?.querySelector('nc\\:LastModified')?.textContent || '';
  
  let result = '\n' + '    '.repeat(indent) + 
    `<DT><H3${addDate ? ` ADD_DATE="${addDate}"` : ''}${lastModified ? ` LAST_MODIFIED="${lastModified}"` : ''}>${title}</H3>`;
  result += '\n' + '    '.repeat(indent) + '<DL><p>';
  
  // 递归处理子元素
  for (const child of folder.children) {
    if (child.tagName === 'folder') {
      result += parseFolder(child, indent + 1);
    } else if (child.tagName === 'bookmark') {
      result += parseBookmark(child, indent + 1);
    }
  }
  
  result += '\n' + '    '.repeat(indent) + '</DL><p>';
  return result;
}

/**
 * 解析XBEL文档为Netscape书签格式
 * @param {Document} doc XBEL文档
 * @returns {string} Netscape格式的HTML字符串
 * @throws {Error} 解析错误时抛出异常
 */
function parseToNetscape(doc) {
  const xbelRoot = doc.querySelector('xbel');
  if (!xbelRoot) {
    throw new Error('无效的XBEL文档：缺少xbel根元素');
  }

  let result = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>`;

  // 解析所有顶层元素
  for (const child of xbelRoot.children) {
    if (child.tagName === 'folder') {
      result += parseFolder(child, 1);
    } else if (child.tagName === 'bookmark') {
      result += parseBookmark(child, 1);
    }
  }

  result += '\n</DL><p>';
  return result;
}

export {
  parseToNetscape
};
