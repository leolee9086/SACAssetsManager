import { createResource, createFolder, createBookmark } from '../builder.js';
import { ValidationError, ParseError } from '../errors.js';

/**
 * 解析 Edge 书签 HTML 中的时间戳
 * @param {string} dateAdded 
 * @returns {string}
 */
function parseEdgeTimestamp(dateAdded) {
  try {
    if (!dateAdded) return Date.now().toString();
    
    // Edge 使用 Windows 文件时间格式 (从 1601 年开始的微秒数)
    const windowsEpoch = 1164447360000;
    const timestamp = Math.floor(Number(dateAdded) / 1000 - windowsEpoch);
    return timestamp > 0 ? timestamp.toString() : Date.now().toString();
  } catch {
    return Date.now().toString();
  }
}

/**
 * 清理文本内容
 * @param {string} text 
 * @returns {string}
 */
function sanitizeText(text) {
  return text?.trim()?.replace(/\s+/g, ' ') || '';
}

/**
 * 解析 DT 元素
 * @param {HTMLElement} element 
 * @param {Object} options 
 * @returns {URTResource|null}
 */
function parseDTElement(element, options = {}) {
  try {
    // 处理文件夹
    if (element.tagName === 'DT') {
      const h3 = element.querySelector('H3');
      if (h3) {
        const dl = element.querySelector('DL');
        const folderName = sanitizeText(h3.textContent);
        
        if (!folderName) return null;

        const folder = createFolder(folderName, null, {
          driver: 'local',
          meta: {
            created: parseEdgeTimestamp(h3.getAttribute('date_added')),
            modified: parseEdgeTimestamp(h3.getAttribute('last_modified'))
          }
        });

        // 递归处理子元素
        if (dl) {
          folder.children = Array.from(dl.children)
            .map(child => parseDTElement(child, options))
            .filter(Boolean);
        }
        
        return folder;
      }

      // 处理书签
      const a = element.querySelector('A');
      if (a) {
        const url = a.getAttribute('href');
        const title = sanitizeText(a.textContent);
        
        if (!url || !title) return null;

        const iconUri = a.getAttribute('ICON_URI') || a.getAttribute('ICON') || null;
        
        return createBookmark(title, url, {
          meta: {
            created: parseEdgeTimestamp(a.getAttribute('date_added')),
            modified: parseEdgeTimestamp(a.getAttribute('last_modified'))
          },
          extra: {
            description: sanitizeText(a.getAttribute('description')),
            tags: (a.getAttribute('tags') || '').split(',').filter(Boolean),
            favicon: iconUri,
            addDate: a.getAttribute('ADD_DATE')
          }
        });
      }
    }
  } catch (error) {
    console.warn('解析元素失败:', error);
  }

  return null;
}

/**
 * 将 Edge 书签 HTML 转换为 URT 资源
 * @param {string} content Edge 书签 HTML 内容
 * @param {Object} options 配置选项
 * @returns {Promise<URTResource[]>}
 * @throws {ValidationError|ParseError}
 */
async function fromEdgeBookMarkHTML(content, options = {}) {
  if (!content) {
    throw new ValidationError('书签内容不能为空');
  }

  try {
    // 创建临时 DOM 解析器
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');

    // 查找所有可能的书签列表
    const bookmarksLists = doc.querySelectorAll('DL');
    if (!bookmarksLists.length) {
      throw new ParseError('未找到有效的书签列表');
    }

    // 处理所有书签列表
    const results = [];
    for (const list of bookmarksLists) {
      const items = Array.from(list.children)
        .map(element => parseDTElement(element, options))
        .filter(Boolean);
      
      results.push(...items);
    }

    if (!results.length) {
      throw new ParseError('未找到有效的书签数据');
    }

    return results;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof ParseError) {
      throw error;
    }
    throw new ParseError(`解析书签文件失败: ${error.message}`);
  }
}

/**
 * 检测是否为有效的 Edge 书签 HTML
 * @param {string} content 
 * @returns {boolean}
 */
function isEdgeBookMarkHTML(content) {
  if (!content) return false;
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    
    // 更宽松的特征检查
    return Boolean(
      doc.querySelector('DL') && // 包含书签列表
      (
        doc.querySelector('META[charset="utf-8"]') || // UTF-8 编码
        doc.querySelector('H3[PERSONAL_TOOLBAR_FOLDER]') || // 工具栏文件夹
        doc.querySelector('A[href][ADD_DATE]') // 带有 ADD_DATE 的链接
      )
    );
  } catch {
    return false;
  }
}

export {
  fromEdgeBookMarkHTML,
  isEdgeBookMarkHTML
};