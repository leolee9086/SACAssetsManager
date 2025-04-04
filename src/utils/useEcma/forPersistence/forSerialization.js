/**
 * 高级序列化工具集 - 处理复杂对象和大型数据的序列化/反序列化
 */

// ===== 特殊类型序列化处理 =====

/**
 * 增强的序列化函数，支持通常无法序列化的JavaScript类型
 * @param {*} data - 要序列化的数据
 * @param {Object} options - 选项配置
 * @returns {string} 序列化后的JSON字符串
 */
export function enhancedSerialize(data, options = {}) {
  const {
    handleCircular = true,
    handleFunctions = true,
    handleSymbols = true,
    space = undefined,
    handleDom = false,
  } = options;
  
  const seen = new Map();
  
  return JSON.stringify(data, function replacer(key, value) {
    // 处理undefined
    if (value === undefined) {
      return { __type: 'undefined' };
    }
    
    // 处理函数
    if (typeof value === 'function' && handleFunctions) {
      return {
        __type: 'function',
        name: value.name || '匿名函数',
        body: value.toString(),
      };
    }
    
    // 处理Symbol
    if (typeof value === 'symbol' && handleSymbols) {
      return {
        __type: 'symbol',
        description: value.description || '',
      };
    }
    
    // 处理BigInt
    if (typeof value === 'bigint') {
      return {
        __type: 'bigint',
        value: value.toString(),
      };
    }
    
    // 处理错误对象
    if (value instanceof Error) {
      return {
        __type: 'error',
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    }
    
    // 处理日期
    if (value instanceof Date) {
      return {
        __type: 'date',
        iso: value.toISOString(),
      };
    }
    
    // 处理正则
    if (value instanceof RegExp) {
      return {
        __type: 'regexp',
        source: value.source,
        flags: value.flags,
      };
    }
    
    // 处理Map
    if (value instanceof Map) {
      return {
        __type: 'map',
        entries: Array.from(value.entries()),
      };
    }
    
    // 处理Set
    if (value instanceof Set) {
      return {
        __type: 'set',
        values: Array.from(value.values()),
      };
    }
    
    // 处理TypedArray
    if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
      return {
        __type: 'typedarray',
        name: value.constructor.name,
        array: Array.from(value),
      };
    }
    
    // 处理ArrayBuffer
    if (value instanceof ArrayBuffer) {
      return {
        __type: 'arraybuffer',
        data: Array.from(new Uint8Array(value)),
      };
    }
    
    // 处理DOM元素
    if (handleDom && value instanceof Element) {
      return {
        __type: 'dom',
        tagName: value.tagName,
        id: value.id,
        className: value.className,
        innerHTML: value.innerHTML,
      };
    }
    
    // 处理循环引用
    if (typeof value === 'object' && value !== null && handleCircular) {
      if (seen.has(value)) {
        return { __type: 'circular', id: seen.get(value) };
      }
      seen.set(value, seen.size);
    }
    
    return value;
  }, space);
}

/**
 * 反序列化由enhancedSerialize处理的JSON字符串
 * @param {string} jsonString - 序列化后的JSON字符串
 * @param {Object} options - 选项配置
 * @returns {*} 反序列化后的数据
 */
export function enhancedDeserialize(jsonString, options = {}) {
  const { 
    evalFunctions = false,
    reviveSymbols = true,
  } = options;
  
  const refs = new Map();
  const refsList = [];
  
  // 第一遍解析，处理基本类型和收集引用
  const result = JSON.parse(jsonString, function(key, value) {
    if (value && typeof value === 'object' && value.__type) {
      switch(value.__type) {
        case 'undefined':
          return undefined;
          
        case 'function':
          if (evalFunctions) {
            try {
              // 注意：eval是不安全的，仅用于受信任的数据
              return eval(`(${value.body})`);
            } catch (e) {
              console.warn(`无法还原函数: ${value.name}`, e);
              return function unrestoredFunction() { 
                throw new Error('此函数无法从序列化数据还原'); 
              };
            }
          }
          return function placeholderFunction() { 
            console.warn('此函数是序列化后的占位符，未启用evalFunctions选项'); 
          };
          
        case 'symbol':
          return reviveSymbols ? Symbol(value.description) : `Symbol(${value.description})`;
          
        case 'bigint':
          return BigInt(value.value);
          
        case 'error':
          const error = new Error(value.message);
          error.name = value.name;
          error.stack = value.stack;
          return error;
          
        case 'date':
          return new Date(value.iso);
          
        case 'regexp':
          return new RegExp(value.source, value.flags);
          
        case 'map':
          return new Map(value.entries);
          
        case 'set':
          return new Set(value.values);
          
        case 'typedarray':
          const TypedArrayConstructor = window[value.name];
          return TypedArrayConstructor ? new TypedArrayConstructor(value.array) : value.array;
          
        case 'arraybuffer':
          const buffer = new ArrayBuffer(value.data.length);
          const view = new Uint8Array(buffer);
          value.data.forEach((byte, index) => {
            view[index] = byte;
          });
          return buffer;
          
        case 'dom':
          // 简单对DOM进行描述，不实际还原DOM元素
          return {
            __domElement: true,
            tagName: value.tagName,
            id: value.id,
            className: value.className,
          };
          
        case 'circular':
          // 记录循环引用，稍后处理
          const placeholder = {};
          refs.set(value.id, { placeholder, path: this.path });
          refsList.push({ id: value.id, path: this.path });
          return placeholder;
      }
    }
    return value;
  });
  
  return result;
}

// ===== 大型对象序列化 =====

/**
 * 将大型对象分块序列化
 * @param {*} data - 要序列化的数据
 * @param {number} chunkSize - 每块的大致字节大小
 * @returns {Array<string>} 序列化后的数据块数组
 */
export function chunkSerialize(data, chunkSize = 1024 * 1024) {
  // 先序列化整个对象
  const serialized = enhancedSerialize(data);
  
  // 分块
  const chunks = [];
  let index = 0;
  
  while (index < serialized.length) {
    chunks.push(serialized.substring(index, index + chunkSize));
    index += chunkSize;
  }
  
  return chunks;
}

/**
 * 从分块数据中反序列化对象
 * @param {Array<string>} chunks - 序列化后的数据块数组
 * @returns {*} 反序列化后的数据
 */
export function chunkDeserialize(chunks) {
  const serialized = chunks.join('');
  return enhancedDeserialize(serialized);
}

/**
 * 异步序列化大型对象，避免阻塞主线程
 * @param {*} data - 要序列化的数据
 * @returns {Promise<string>} 序列化完成的Promise
 */
export function asyncSerialize(data) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const result = enhancedSerialize(data);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }, 0);
  });
}

/**
 * 异步反序列化数据
 * @param {string} jsonString - 序列化后的JSON字符串
 * @returns {Promise<*>} 反序列化完成的Promise
 */
export function asyncDeserialize(jsonString) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const result = enhancedDeserialize(jsonString);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }, 0);
  });
}

// ===== 实用序列化功能 =====

/**
 * 压缩序列化 - 生成更小的序列化结果
 * @param {*} data - 要序列化的数据
 * @returns {string} 压缩后的字符串
 */
export function compressedSerialize(data) {
  // 使用更紧凑的格式并移除不必要的空格
  const serialized = enhancedSerialize(data);
  
  // 简单的压缩：移除空白符，也可以考虑使用更高级的压缩库
  return serialized.replace(/\s+/g, '');
}

/**
 * URL安全的序列化，可用于URL参数
 * @param {*} data - 要序列化的数据
 * @returns {string} URL安全的字符串
 */
export function urlSafeSerialize(data) {
  const serialized = enhancedSerialize(data);
  return encodeURIComponent(serialized);
}

/**
 * 从URL安全字符串反序列化
 * @param {string} urlString - URL安全的序列化字符串
 * @returns {*} 反序列化后的数据
 */
export function urlSafeDeserialize(urlString) {
  const jsonString = decodeURIComponent(urlString);
  return enhancedDeserialize(jsonString);
}

/**
 * 序列化到二进制格式
 * @param {*} data - 要序列化的数据 
 * @returns {Uint8Array} 二进制数据
 */
export function binarySerialize(data) {
  const jsonString = enhancedSerialize(data);
  const encoder = new TextEncoder();
  return encoder.encode(jsonString);
}

/**
 * 从二进制数据反序列化
 * @param {Uint8Array} binaryData - 二进制数据
 * @returns {*} 反序列化后的数据
 */
export function binaryDeserialize(binaryData) {
  const decoder = new TextDecoder();
  const jsonString = decoder.decode(binaryData);
  return enhancedDeserialize(jsonString);
}

// ===== 导出默认对象 =====
export default {
  serialize: enhancedSerialize,
  deserialize: enhancedDeserialize,
  chunk: {
    serialize: chunkSerialize,
    deserialize: chunkDeserialize,
  },
  async: {
    serialize: asyncSerialize,
    deserialize: asyncDeserialize,
  },
  compressed: {
    serialize: compressedSerialize,
    deserialize: enhancedDeserialize, // 压缩只影响输出,不影响解析
  },
  url: {
    serialize: urlSafeSerialize,
    deserialize: urlSafeDeserialize,
  },
  binary: {
    serialize: binarySerialize,
    deserialize: binaryDeserialize,
  }
};
