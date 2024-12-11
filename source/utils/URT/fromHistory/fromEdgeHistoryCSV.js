import { createBookmark } from '../builder.js';
import { ValidationError, ParseError } from '../errors.js';

/**
 * 解析 CSV 行数据
 * @param {string} line 
 * @returns {string[]}
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result.map(field => field.replace(/^"|"$/g, '').trim());
}

/**
 * 将 Edge 历史记录 CSV 转换为 URT 资源
 * @param {string} content Edge 历史记录 CSV 内容
 * @param {Object} options 配置选项
 * @returns {Promise<URTResource[]>}
 * @throws {ValidationError|ParseError}
 */
async function fromEdgeHistoryCSV(content, options = {}) {
  if (!content) {
    throw new ValidationError('历史记录内容不能为空');
  }

  try {
    const lines = content.split(/\r?\n/);
    if (lines.length < 2) {
      throw new ParseError('CSV 文件格式无效');
    }

    // 跳过标题行
    const results = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const [dateTime, url, title] = parseCSVLine(line);
      if (!url || !dateTime) continue;

      try {
        // 解析URL以获取额外信息
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

        results.push(createBookmark(title || url, url, {
          meta: {
            created: new Date(dateTime).getTime().toString(),
            modified: new Date(dateTime).getTime().toString()
          },
          extra: {
            visitTime: dateTime,
            favicon,
            domain,
            protocol: urlObj.protocol,
            pathname: urlObj.pathname,
            search: urlObj.search,
            hash: urlObj.hash,
            description: '', 
            tags: [],
            reading: {
              progress: 0,
              highlights: [],
              archived: false,
              favorite: false,
              addedAt: new Date(dateTime).toISOString(),
              lastReadAt: new Date(dateTime).toISOString(),
              readCount: 1
            }
          },
          provenance: {
            source: 'edge-history',
            sourceId: url,
            importedAt: new Date().toISOString(),
            importVersion: '1.0.0',
            originalData: {
              dateTime,
              url,
              title
            }
          }
        }));
      } catch (urlError) {
        console.warn(`解析URL失败: ${url}`, urlError);
        results.push(createBookmark(title || url, url, {
          meta: {
            created: new Date(dateTime).getTime().toString(),
            modified: new Date(dateTime).getTime().toString()
          },
          extra: {
            visitTime: dateTime
          }
        }));
      }
    }

    if (!results.length) {
      throw new ParseError('未找到有效的历史记录数据');
    }

    return results;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof ParseError) {
      throw error;
    }
    throw new ParseError(`解析历史记录文件失败: ${error.message}`);
  }
}

/**
 * 检测是否为有效的 Edge 历史记录 CSV
 * @param {string} content 
 * @returns {boolean}
 */
function isEdgeHistoryCSV(content) {
  if (!content) return false;
  
  try {
    const firstLine = content.split(/\r?\n/)[0].toLowerCase();
    return firstLine.includes('datetime') && 
           firstLine.includes('navigatedtourl') && 
           firstLine.includes('pagetitle');
  } catch {
    return false;
  }
}

export {
  fromEdgeHistoryCSV,
  isEdgeHistoryCSV
};
