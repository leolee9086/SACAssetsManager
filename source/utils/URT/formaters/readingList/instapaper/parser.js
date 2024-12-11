import { createBookmark, createCollection } from '../../../builder.js';

/**
 * @typedef {Object} InstapaperBookmark
 * @property {string} title - 文章标题
 * @property {string} url - 文章URL
 * @property {string} description - 文章描述
 * @property {number} time - 添加时间戳
 * @property {string[]} [tags] - 标签
 * @property {string} [preview] - 预览图
 * @property {number} [progress] - 阅读进度(0-1)
 * @property {string[]} [highlights] - 高亮标注
 */

/**
 * 解析 Instapaper 导出的数据
 * @param {InstapaperBookmark[]} bookmarks 
 * @returns {URTResource}
 */
function parseInstapaperExport(bookmarks) {
  // 创建根集合
  const collection = createCollection('Instapaper Reading List', {
    format: 'instapaper',
    icon: 'book-reader'
  });

  // 转换每个书签
  collection.children = bookmarks.map(bookmark => {
    return createBookmark(bookmark.title, bookmark.url, {
      description: bookmark.description,
      tags: bookmark.tags || [],
      // 扩展 extra 字段以支持 Instapaper 特有属性
      extra: {
        preview: bookmark.preview,
        progress: bookmark.progress,
        highlights: bookmark.highlights,
        addedAt: bookmark.time,
        source: 'instapaper'
      }
    });
  });

  return collection;
}

export { parseInstapaperExport };
