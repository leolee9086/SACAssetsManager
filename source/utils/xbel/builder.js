/**
 * 从Edge导出的HTML构建XBEL格式书签
 * @param {string} html Edge导出的书签HTML字符串
 * @returns {string} XBEL格式的XML字符串
 */
function buildXBELFromEdgeHTML(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // 创建XBEL文档
  const xbel = `<?xml version="1.0" encoding="UTF-8"?>
<xbel version="1.0">
  <title>书签</title>
  ${parseBookmarkFolder(doc.querySelector('DL'))}
</xbel>`;

  return xbel;
}

/**
 * 递归解析书签文件夹
 * @param {Element} dl DL元素
 * @returns {string} 文件夹的XML字符串
 */
function parseBookmarkFolder(dl) {
  let result = '';
  
  for (const child of dl.children) {
    if (child.tagName === 'DT') {
      const h3 = child.querySelector('H3');
      const a = child.querySelector('A');
      
      if (h3) {
        // 处理文件夹
        const folderDL = child.querySelector('DL');
        result += `
  <folder>
    <title>${escapeXml(h3.textContent)}</title>${folderDL ? parseBookmarkFolder(folderDL) : ''}
  </folder>`;
      } else if (a) {
        // 处理书签
        result += `
  <bookmark href="${escapeXml(a.href)}">
    <title>${escapeXml(a.textContent)}</title>
  </bookmark>`;
      }
    }
  }
  
  return result;
}

/**
 * 转义XML特殊字符
 * @param {string} str 需要转义的字符串
 * @returns {string} 转义后的字符串
 */
function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export{
  buildXBELFromEdgeHTML
};