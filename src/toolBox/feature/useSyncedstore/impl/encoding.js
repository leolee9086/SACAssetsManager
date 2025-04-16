/**
 * @module encoding
 * 提供与Yjs相关的编码功能
 */

/**
 * 编码状态向量
 * @param {any} Y - Yjs实例
 * @param {any} doc - Y.Doc实例
 * @returns {Uint8Array|null} 编码后的状态向量或null（如果失败）
 */
export const encodeStateVector = (Y, doc) => {
  try {
    if (!Y || !Y.encodeStateVector || !doc) {
      console.error('encodeStateVector: 缺少必要参数或函数');
      return null;
    }
    return Y.encodeStateVector(doc);
  } catch (err) {
    console.error('encodeStateVector失败:', err);
    return null;
  }
};

/**
 * 将状态编码为更新
 * @param {any} Y - Yjs实例
 * @param {any} doc - Y.Doc实例
 * @param {Uint8Array} [encodedStateVector=null] - 编码后的状态向量（可选）
 * @returns {Uint8Array|null} 编码后的更新或null（如果失败）
 */
export const encodeStateAsUpdate = (Y, doc, encodedStateVector = null) => {
  try {
    if (!Y || !Y.encodeStateAsUpdate || !doc) {
      console.error('encodeStateAsUpdate: 缺少必要参数或函数');
      return null;
    }
    
    if (encodedStateVector) {
      return Y.encodeStateAsUpdate(doc, encodedStateVector);
    }
    return Y.encodeStateAsUpdate(doc);
  } catch (err) {
    console.error('encodeStateAsUpdate失败:', err);
    return null;
  }
};

/**
 * 创建空的更新
 * @param {any} Y - Yjs实例
 * @returns {Uint8Array|null} 空更新或null（如果失败）
 */
export const createEmptyUpdate = (Y) => {
  try {
    if (!Y || !Y.createEmptyUpdate) {
      console.error('createEmptyUpdate: 缺少必要参数或函数');
      return null;
    }
    return Y.createEmptyUpdate();
  } catch (err) {
    console.error('createEmptyUpdate失败:', err);
    return null;
  }
};

/**
 * 对指定更新进行差异编码
 * @param {any} Y - Yjs实例
 * @param {Uint8Array} update - 更新数据
 * @param {Uint8Array} sv - 状态向量
 * @returns {Uint8Array|null} 差异编码后的更新或null（如果失败）
 */
export const diffUpdate = (Y, update, sv) => {
  try {
    if (!Y || !Y.diffUpdate || !update || !sv) {
      console.error('diffUpdate: 缺少必要参数或函数');
      return null;
    }
    return Y.diffUpdate(update, sv);
  } catch (err) {
    console.error('diffUpdate失败:', err);
    return null;
  }
};

/**
 * 合并多个更新
 * @param {any} Y - Yjs实例
 * @param {Array<Uint8Array>} updates - 更新数组
 * @returns {Uint8Array|null} 合并后的更新或null（如果失败）
 */
export const mergeUpdates = (Y, updates) => {
  try {
    if (!Y || !Y.mergeUpdates || !Array.isArray(updates)) {
      console.error('mergeUpdates: 缺少必要参数或函数');
      return null;
    }
    return Y.mergeUpdates(updates);
  } catch (err) {
    console.error('mergeUpdates失败:', err);
    return null;
  }
};

/**
 * 创建一个编码器
 * @returns {Object} 编码器对象
 */
export function createEncoder() {
  return {
    bufs: [],
    cpos: 0,
    cbuf: new Uint8Array(100)
  };
}

/**
 * 将变长整数写入编码器
 * @param {Object} encoder - 编码器
 * @param {number} num - 要写入的整数
 */
export function writeVarUint(encoder, num) {
  if (encoder.cpos >= encoder.cbuf.length) {
    encoder.bufs.push(encoder.cbuf);
    encoder.cbuf = new Uint8Array(encoder.cbuf.length * 2);
    encoder.cpos = 0;
  }
  
  let n = num;
  while (n > 127) {
    encoder.cbuf[encoder.cpos++] = 128 | (127 & n);
    n = Math.floor(n / 128);
  }
  encoder.cbuf[encoder.cpos++] = 127 & n;
}

/**
 * 将一个 Uint8Array 作为变长数据写入编码器
 * @param {Object} encoder - 编码器
 * @param {Uint8Array} array - 要写入的数组
 */
export function writeVarUint8Array(encoder, array) {
  writeVarUint(encoder, array.length);
  for (let i = 0; i < array.length; i++) {
    if (encoder.cpos >= encoder.cbuf.length) {
      encoder.bufs.push(encoder.cbuf);
      encoder.cbuf = new Uint8Array(encoder.cbuf.length * 2);
      encoder.cpos = 0;
    }
    encoder.cbuf[encoder.cpos++] = array[i];
  }
}

/**
 * 将编码器中的数据转换为 Uint8Array
 * @param {Object} encoder - 编码器
 * @returns {Uint8Array} 编码后的数据
 */
export function toUint8Array(encoder) {
  const size = encoder.cpos + encoder.bufs.reduce((acc, b) => acc + b.length, 0);
  const result = new Uint8Array(size);
  let pos = 0;
  
  for (let i = 0; i < encoder.bufs.length; i++) {
    const buf = encoder.bufs[i];
    result.set(buf, pos);
    pos += buf.length;
  }
  
  result.set(new Uint8Array(encoder.cbuf.buffer, 0, encoder.cpos), pos);
  return result;
}

/**
 * 返回编码器中的数据长度
 * @param {Object} encoder - 编码器
 * @returns {number} 数据长度
 */
export function length(encoder) {
  return encoder.cpos + encoder.bufs.reduce((acc, b) => acc + b.length, 0);
}

/**
 * 将一个JavaScript字符串编码为UTF8并写入编码器
 * @param {Object} encoder - 编码器
 * @param {string} str - 要编码的字符串
 */
export function writeVarString(encoder, str) {
  const bytes = new TextEncoder().encode(str);
  writeVarUint8Array(encoder, bytes);
}

/**
 * 写入一个32位整数
 * @param {Object} encoder - 编码器
 * @param {number} num - 要写入的整数
 */
export function writeUint32(encoder, num) {
  if (encoder.cpos + 4 > encoder.cbuf.length) {
    encoder.bufs.push(encoder.cbuf);
    encoder.cbuf = new Uint8Array(encoder.cbuf.length * 2);
    encoder.cpos = 0;
  }
  encoder.cbuf[encoder.cpos++] = num & 0xff;
  encoder.cbuf[encoder.cpos++] = (num >>> 8) & 0xff;
  encoder.cbuf[encoder.cpos++] = (num >>> 16) & 0xff;
  encoder.cbuf[encoder.cpos++] = (num >>> 24) & 0xff;
}

/**
 * 写入一个32位有符号整数
 * @param {Object} encoder - 编码器
 * @param {number} num - 要写入的整数
 */
export function writeInt32(encoder, num) {
  writeUint32(encoder, num);
}

/**
 * 写入一个浮点数
 * @param {Object} encoder - 编码器
 * @param {number} num - 要写入的浮点数
 */
export function writeFloat32(encoder, num) {
  const buffer = new ArrayBuffer(4);
  new Float32Array(buffer)[0] = num;
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < 4; i++) {
    if (encoder.cpos >= encoder.cbuf.length) {
      encoder.bufs.push(encoder.cbuf);
      encoder.cbuf = new Uint8Array(encoder.cbuf.length * 2);
      encoder.cpos = 0;
    }
    encoder.cbuf[encoder.cpos++] = bytes[i];
  }
}

/**
 * 写入一个64位浮点数
 * @param {Object} encoder - 编码器
 * @param {number} num - 要写入的浮点数
 */
export function writeFloat64(encoder, num) {
  const buffer = new ArrayBuffer(8);
  new Float64Array(buffer)[0] = num;
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < 8; i++) {
    if (encoder.cpos >= encoder.cbuf.length) {
      encoder.bufs.push(encoder.cbuf);
      encoder.cbuf = new Uint8Array(encoder.cbuf.length * 2);
      encoder.cpos = 0;
    }
    encoder.cbuf[encoder.cpos++] = bytes[i];
  }
}

/**
 * 写入一个布尔值
 * @param {Object} encoder - 编码器
 * @param {boolean} bool - 要写入的布尔值
 */
export function writeBoolean(encoder, bool) {
  if (encoder.cpos >= encoder.cbuf.length) {
    encoder.bufs.push(encoder.cbuf);
    encoder.cbuf = new Uint8Array(encoder.cbuf.length * 2);
    encoder.cpos = 0;
  }
  encoder.cbuf[encoder.cpos++] = bool ? 1 : 0;
} 