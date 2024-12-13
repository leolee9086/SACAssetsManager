import { createBookmark } from '../builder.js';
import { URTStream } from '../stream/URTStream.js';

/**
 * 流式解析Edge历史记录CSV
 * @param {string|ReadableStream} input - CSV内容或可读流
 * @param {Object} options - 配置选项
 * @returns {URTStream} URT资源流
 */
function fromEdgeHistoryCSVStream(input, options = {}) {
  const urtStream = new URTStream();
  
  // 如果输入是字符串,转换为流
  const readable = typeof input === 'string' 
    ? new ReadableStream({
        start(controller) {
          const lines = input.split('\n');
          for (const line of lines) {
            controller.enqueue(line);
          }
          controller.close();
        }
      })
    : input;

  let isFirstLine = true;
  let buffer = ''; // 用于存储不完整的行
  
  const decoder = new TextDecoder();
  
  const processLine = (line) => {
    if (!line.trim()) return;
    
    // 跳过标题行
    if (isFirstLine) {
      isFirstLine = false;
      return;
    }

    const [dateTime, url, title] = parseCSVLine(line);
    if (!url || !dateTime) return;

    try {
      // 尝试清理和修复 URL
      let cleanUrl = url.trim();
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl;
      }
      
      const urlObj = new URL(cleanUrl);
      const domain = urlObj.hostname;
      const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

      // 处理日期时间
      const timestamp = new Date(dateTime).getTime();
      if (isNaN(timestamp)) {
        throw new Error('Invalid date');
      }

      const bookmark = createBookmark(title || url, url, {
        meta: {
          created: timestamp.toString(),
          modified: timestamp.toString()
        },
        extra: {
          visitTime: dateTime,  // 保留原始时间字符串
          favicon,
          domain,
          protocol: urlObj.protocol,
          pathname: urlObj.pathname,
          search: urlObj.search,
          hash: urlObj.hash,
          timestamp: timestamp  // 添加数字类型的时间戳
        }
      });

      urtStream.write(bookmark);
    } catch (error) {
      // 即使URL或日期无效，也创建书签
      const bookmark = createBookmark(title || url, url, {
        meta: {
          created: Date.now().toString(),
          modified: Date.now().toString()
        },
        extra: {
          visitTime: dateTime,  // 保留原始时间字符串
          isInvalidUrl: error instanceof TypeError,  // URL错误
          isInvalidDate: error.message === 'Invalid date',  // 日期错误
          rawUrl: url,  // 保留原始URL
          rawDateTime: dateTime  // 保留原始日期时间
        }
      });
      urtStream.write(bookmark);
    }
  };

  const reader = readable.getReader();
  const processStream = async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // 处理最后可能剩余的数据
          if (buffer) {
            processLine(buffer);
          }
          break;
        }
        
        const chunk = typeof value === 'string' ? value : decoder.decode(value, { stream: true });
        const lines = (buffer + chunk).split('\n');
        
        // 保存最后一行（可能不完整）
        buffer = lines.pop() || '';
        
        // 处理完整的行
        for (const line of lines) {
          processLine(line);
        }
      }
      
      urtStream.end();
    } catch (error) {
      urtStream.emit('error', error);
    }
  };

  processStream();
  return urtStream;
}

// 复用原有的CSV行解析函数
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

export { fromEdgeHistoryCSVStream };
