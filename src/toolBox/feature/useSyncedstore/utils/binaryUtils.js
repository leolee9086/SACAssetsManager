/**
 * @fileoverview 二进制数据处理工具
 * 
 * 提供处理二进制数据的工具函数，用于WebSocket通信中的数据编解码
 */

/**
 * Base64解码为Uint8Array
 * @param {string} base64String - Base64编码字符串
 * @returns {Uint8Array} 解码后的二进制数据
 */
export function decodeBase64(base64String) {
  try {
    const binaryString = atob(base64String);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (err) {
    console.error('[二进制工具] Base64解码失败:', err);
    throw err;
  }
}

/**
 * 将Uint8Array编码为Base64字符串
 * @param {Uint8Array} bytes - 二进制数据
 * @returns {string} Base64编码字符串
 */
export function encodeBase64(bytes) {
  try {
    let binaryString = '';
    for (let i = 0; i < bytes.length; i++) {
      binaryString += String.fromCharCode(bytes[i]);
    }
    return btoa(binaryString);
  } catch (err) {
    console.error('[二进制工具] Base64编码失败:', err);
    throw err;
  }
}

/**
 * 安全地检查并转换为Uint8Array
 * @param {ArrayBuffer|Uint8Array} data - 原始二进制数据
 * @returns {Uint8Array} 转换后的Uint8Array
 */
export function toUint8Array(data) {
  if (data instanceof Uint8Array) {
    return data;
  } else if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  } else {
    throw new Error('无法转换为Uint8Array: 数据类型不支持');
  }
}

/**
 * 检查对象是否为有效的解码器
 * @param {Object} decoder - 解码器对象
 * @returns {boolean} 是否为有效解码器
 */
export function isValidDecoder(decoder) {
  return (
    decoder && 
    decoder.arr instanceof Uint8Array && 
    typeof decoder.pos === 'number' &&
    decoder.pos <= decoder.arr.length
  );
}

/**
 * 检查解码器是否有足够的数据可读
 * @param {Object} decoder - 解码器对象
 * @param {number} bytesNeeded - 需要读取的字节数
 * @returns {boolean} 是否有足够数据
 */
export function hasEnoughData(decoder, bytesNeeded = 1) {
  const basicValid = decoder && 
    decoder.arr instanceof Uint8Array && 
    typeof decoder.pos === 'number';
    
  if (!basicValid) return false;
  
  return (decoder.arr.length - decoder.pos) >= bytesNeeded;
}

/**
 * 检测字符串是否为Base64编码
 * @param {string} str - 待检测的字符串
 * @returns {boolean} 是否为Base64编码
 */
export function isBase64(str) {
  try {
    // 基本检查：Base64字符串应只包含这些字符
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(str)) {
      return false;
    }
    
    // 尝试解码并检查结果是否有效
    const decoded = atob(str);
    const encoded = btoa(decoded);
    
    // 简单检查编码结果是否能匹配原始字符串（忽略填充字符的差异）
    const normalizedStr = str.replace(/=/g, '');
    const normalizedEncoded = encoded.replace(/=/g, '');
    
    return normalizedStr === normalizedEncoded;
  } catch (err) {
    return false;
  }
}

/**
 * 智能处理消息数据，根据数据特征自动选择处理方式
 * @param {any} data - 消息数据
 * @returns {Object} 处理结果，包含类型和内容
 */
export function processMessageData(data) {
  // 二进制数据直接转换为Uint8Array
  if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
    return {
      type: 'binary',
      content: toUint8Array(data)
    };
  }
  
  // 字符串数据
  if (typeof data === 'string') {
    // 尝试解析为JSON
    try {
      const json = JSON.parse(data);
      return {
        type: 'json',
        content: json
      };
    } catch (e) {
      // 非JSON字符串，检查是否为Base64
      if (isBase64(data)) {
        try {
          const binary = decodeBase64(data);
          return {
            type: 'binary',
            content: binary
          };
        } catch (err) {
          // 解码失败，作为普通文本
        }
      }
      
      // 作为普通文本处理
      return {
        type: 'text',
        content: data
      };
    }
  }
  
  // 其他类型数据，尝试JSON序列化
  try {
    const json = JSON.stringify(data);
    return {
      type: 'json',
      content: JSON.parse(json)
    };
  } catch (e) {
    // 无法序列化，返回原始数据
    return {
      type: 'unknown',
      content: data
    };
  }
} 