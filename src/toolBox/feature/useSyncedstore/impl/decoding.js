/**
 * @module decoding
 * 
 * 提供二进制数据解码功能
 */

/**
 * 创建一个解码器
 * @param {Uint8Array} array - 要解码的二进制数据
 * @returns {Object} 解码器对象
 */
export function createDecoder(array) {
  return {
    arr: array,
    pos: 0
  };
}

/**
 * 从解码器中读取一个变长整数
 * @param {Object} decoder - 解码器
 * @returns {number} 读取的整数
 */
export function readVarUint(decoder) {
  let n = 0;
  let factor = 1;
  
  if (!decoder || !decoder.arr || decoder.pos >= decoder.arr.length) {
    throw new Error('无效的解码器或位置超出范围');
  }
  
  let b = decoder.arr[decoder.pos++];
  n = b & 127;
  
  while (b >= 128) {
    if (decoder.pos >= decoder.arr.length) {
      throw new Error('读取VarUint时数据不完整');
    }
    
    factor *= 128;
    b = decoder.arr[decoder.pos++];
    n += (b & 127) * factor;
  }
  
  return n;
}

/**
 * 从解码器中读取一个变长的 Uint8Array
 * @param {Object} decoder - 解码器
 * @returns {Uint8Array} 读取的数组
 */
export function readVarUint8Array(decoder) {
  const len = readVarUint(decoder);
  
  if (len < 0 || decoder.pos + len > decoder.arr.length) {
    throw new Error(`无效的数组长度: ${len}, 剩余字节: ${decoder.arr.length - decoder.pos}`);
  }
  
  const result = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    result[i] = decoder.arr[decoder.pos++];
  }
  
  return result;
}

/**
 * 从解码器中读取一个变长的字符串
 * @param {Object} decoder - 解码器
 * @returns {string} 读取的字符串
 */
export function readVarString(decoder) {
  const bytes = readVarUint8Array(decoder);
  return new TextDecoder().decode(bytes);
}

/**
 * 从解码器中读取一个32位无符号整数
 * @param {Object} decoder - 解码器
 * @returns {number} 读取的整数
 */
export function readUint32(decoder) {
  if (decoder.pos + 4 > decoder.arr.length) {
    throw new Error('读取Uint32时数据不完整');
  }
  
  const uint =
    decoder.arr[decoder.pos] +
    (decoder.arr[decoder.pos + 1] << 8) +
    (decoder.arr[decoder.pos + 2] << 16) +
    (decoder.arr[decoder.pos + 3] << 24);
  
  decoder.pos += 4;
  return uint >>> 0;
}

/**
 * 从解码器中读取一个32位有符号整数
 * @param {Object} decoder - 解码器
 * @returns {number} 读取的整数
 */
export function readInt32(decoder) {
  const uint = readUint32(decoder);
  return uint | 0;
}

/**
 * 从解码器中读取一个32位浮点数
 * @param {Object} decoder - 解码器
 * @returns {number} 读取的浮点数
 */
export function readFloat32(decoder) {
  if (decoder.pos + 4 > decoder.arr.length) {
    throw new Error('读取Float32时数据不完整');
  }
  
  const bytes = new Uint8Array(4);
  for (let i = 0; i < 4; i++) {
    bytes[i] = decoder.arr[decoder.pos++];
  }
  
  const buffer = bytes.buffer;
  return new Float32Array(buffer)[0];
}

/**
 * 从解码器中读取一个64位浮点数
 * @param {Object} decoder - 解码器
 * @returns {number} 读取的浮点数
 */
export function readFloat64(decoder) {
  if (decoder.pos + 8 > decoder.arr.length) {
    throw new Error('读取Float64时数据不完整');
  }
  
  const bytes = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    bytes[i] = decoder.arr[decoder.pos++];
  }
  
  const buffer = bytes.buffer;
  return new Float64Array(buffer)[0];
}

/**
 * 从解码器中读取一个布尔值
 * @param {Object} decoder - 解码器
 * @returns {boolean} 读取的布尔值
 */
export function readBoolean(decoder) {
  if (decoder.pos >= decoder.arr.length) {
    throw new Error('读取Boolean时数据不完整');
  }
  
  return decoder.arr[decoder.pos++] !== 0;
}

/**
 * 检查解码器是否已经到达数据末尾
 * @param {Object} decoder - 解码器
 * @returns {boolean} 是否到达数据末尾
 */
export function isEOF(decoder) {
  return decoder.pos >= decoder.arr.length;
}

/**
 * 应用更新到文档
 * @param {any} Y - Yjs实例
 * @param {any} doc - Y.Doc实例
 * @param {Uint8Array} update - 更新数据
 * @returns {boolean} 是否成功应用更新
 */
export const applyUpdate = (Y, doc, update) => {
  try {
    if (!Y || !Y.applyUpdate || !doc || !update) {
      console.error('applyUpdate: 缺少必要参数或函数');
      return false;
    }
    Y.applyUpdate(doc, update);
    return true;
  } catch (err) {
    console.error('applyUpdate失败:', err);
    return false;
  }
};

/**
 * 根据更新提取状态向量
 * @param {any} Y - Yjs实例
 * @param {Uint8Array} update - 更新数据
 * @returns {Uint8Array|null} 提取的状态向量或null（如果失败）
 */
export const extractStateVector = (Y, update) => {
  try {
    if (!Y || !Y.extractStateVector || !update) {
      console.error('extractStateVector: 缺少必要参数或函数');
      return null;
    }
    return Y.extractStateVector(update);
  } catch (err) {
    console.error('extractStateVector失败:', err);
    return null;
  }
};

/**
 * 获取Y文档的状态向量
 * @param {any} Y - Yjs实例
 * @param {any} doc - Y.Doc实例
 * @returns {Map|null} 状态向量或null（如果失败）
 */
export const getStateVector = (Y, doc) => {
  try {
    if (!Y || !Y.getStateVector || !doc) {
      console.error('getStateVector: 缺少必要参数或函数');
      return null;
    }
    return Y.getStateVector(doc);
  } catch (err) {
    console.error('getStateVector失败:', err);
    return null;
  }
};

/**
 * 获取Y文档的更新
 * @param {any} Y - Yjs实例
 * @param {any} doc - Y.Doc实例
 * @param {Map} [stateVector=null] - 状态向量（可选）
 * @returns {Uint8Array|null} 更新数据或null（如果失败）
 */
export const getUpdate = (Y, doc, stateVector = null) => {
  try {
    if (!Y || !Y.getUpdate || !doc) {
      console.error('getUpdate: 缺少必要参数或函数');
      return null;
    }
    
    if (stateVector) {
      return Y.getUpdate(doc, stateVector);
    }
    return Y.getUpdate(doc);
  } catch (err) {
    console.error('getUpdate失败:', err);
    return null;
  }
};

/**
 * 获取缺失区块
 * @param {any} Y - Yjs实例
 * @param {Uint8Array} update - 更新数据
 * @param {Uint8Array} sv - 状态向量
 * @returns {Array|null} 缺失区块数组或null（如果失败）
 */
export const getMissing = (Y, update, sv) => {
  try {
    if (!Y || !Y.getMissing || !update || !sv) {
      console.error('getMissing: 缺少必要参数或函数');
      return null;
    }
    return Y.getMissing(update, sv);
  } catch (err) {
    console.error('getMissing失败:', err);
    return null;
  }
}; 