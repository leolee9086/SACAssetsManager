/**
 * 创建感知状态协议 - 从y-websocket提取并简化
 */

// Awareness类实现
export class Awareness {
  constructor(doc) {
    this.doc = doc;
    this.clientID = doc.clientID;
    this.states = new Map();
    this.meta = new Map();
    this._observers = new Map();
    
    this.setLocalState({});
    
    doc.on('destroy', () => {
      this.destroy();
    });
  }
  
  /**
   * 添加事件监听
   */
  on(name, handler) {
    if (!this._observers.has(name)) {
      this._observers.set(name, new Set());
    }
    this._observers.get(name).add(handler);
    return handler;
  }
  
  /**
   * 移除事件监听
   */
  off(name, handler) {
    const handlers = this._observers.get(name);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this._observers.delete(name);
      }
    }
  }
  
  /**
   * 触发事件
   */
  emit(name, args) {
    const handlers = this._observers.get(name);
    if (handlers) {
      handlers.forEach(handler => handler(...args));
    }
  }
  
  /**
   * 销毁对象
   */
  destroy() {
    this.emit('destroy', [this]);
    this._observers.clear();
  }
  
  /**
   * 获取本地状态
   */
  getLocalState() {
    return this.states.get(this.clientID) || null;
  }
  
  /**
   * 设置本地状态
   */
  setLocalState(state) {
    const clientID = this.clientID;
    const prevState = this.states.get(clientID);
    this.states.set(clientID, state);
    this.meta.set(clientID, {
      clock: this.meta.has(clientID) ? this.meta.get(clientID).clock + 1 : 0,
      lastUpdated: Date.now()
    });
    
    const added = [];
    const updated = [];
    const removed = [];
    
    if (state === null) {
      if (prevState !== null) {
        removed.push(clientID);
      }
    } else if (prevState === null) {
      added.push(clientID);
    } else {
      updated.push(clientID);
    }
    
    if (added.length > 0 || updated.length > 0 || removed.length > 0) {
      this.emit('update', [{added, updated, removed}, 'local']);
    }
  }
  
  /**
   * 获取所有状态
   */
  getStates() {
    return this.states;
  }
}

/**
 * 编码感知状态更新
 */
export function encodeAwarenessUpdate(awareness, changedClients) {
  const len = changedClients.length;
  const encoder = createEncoder();
  writeVarUint(encoder, len);
  for (let i = 0; i < len; i++) {
    const clientID = changedClients[i];
    const state = awareness.states.get(clientID) || null;
    const clock = awareness.meta.get(clientID).clock;
    writeVarUint(encoder, clientID);
    writeVarUint(encoder, clock);
    writeVarString(encoder, JSON.stringify(state));
  }
  return toUint8Array(encoder);
}

/**
 * 应用感知状态更新
 */
export function applyAwarenessUpdate(awareness, update, origin) {
  const decoder = createDecoder(update);
  const added = [];
  const updated = [];
  const removed = [];
  const len = readVarUint(decoder);
  
  for (let i = 0; i < len; i++) {
    const clientID = readVarUint(decoder);
    const clock = readVarUint(decoder);
    const state = JSON.parse(readVarString(decoder));
    const meta = awareness.meta.get(clientID);
    const prevState = awareness.states.get(clientID);
    const currentClock = meta === undefined ? 0 : meta.clock;
    
    if (currentClock < clock || (currentClock === clock && state === null && awareness.states.has(clientID))) {
      if (state === null) {
        awareness.states.delete(clientID);
        removed.push(clientID);
      } else {
        awareness.states.set(clientID, state);
        if (prevState === undefined) {
          added.push(clientID);
        } else {
          updated.push(clientID);
        }
      }
      
      awareness.meta.set(clientID, {
        clock,
        lastUpdated: Date.now()
      });
    }
  }
  
  if (added.length > 0 || updated.length > 0 || removed.length > 0) {
    awareness.emit('update', [{added, updated, removed}, origin]);
  }
}

/**
 * 移除感知状态
 */
export function removeAwarenessStates(awareness, clients, origin) {
  const removed = [];
  for (const clientID of clients) {
    if (awareness.states.has(clientID)) {
      awareness.states.delete(clientID);
      if (clientID === awareness.clientID) {
        const curMeta = awareness.meta.get(clientID);
        awareness.meta.set(clientID, {
          clock: curMeta.clock + 1,
          lastUpdated: Date.now()
        });
      }
      removed.push(clientID);
    }
  }
  
  if (removed.length > 0) {
    awareness.emit('update', [{added: [], updated: [], removed}, origin]);
  }
}

// 基本的编解码函数
function createEncoder() {
  return {
    bufs: [],
    cpos: 0,
    cbuf: new Uint8Array(100)
  };
}

function writeVarUint(encoder, num) {
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

function writeVarString(encoder, str) {
  const bytes = new TextEncoder().encode(str);
  writeVarUint(encoder, bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    if (encoder.cpos >= encoder.cbuf.length) {
      encoder.bufs.push(encoder.cbuf);
      encoder.cbuf = new Uint8Array(encoder.cbuf.length * 2);
      encoder.cpos = 0;
    }
    encoder.cbuf[encoder.cpos++] = bytes[i];
  }
}

function toUint8Array(encoder) {
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

function createDecoder(array) {
  return {
    arr: array,
    pos: 0
  };
}

function readVarUint(decoder) {
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

function readVarString(decoder) {
  const len = readVarUint(decoder);
  
  if (len < 0 || decoder.pos + len > decoder.arr.length) {
    throw new Error(`无效的字符串长度: ${len}, 剩余字节: ${decoder.arr.length - decoder.pos}`);
  }
  
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = decoder.arr[decoder.pos++];
  }
  
  return new TextDecoder().decode(bytes);
} 