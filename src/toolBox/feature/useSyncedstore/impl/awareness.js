/**
 * @module awareness-protocol
 * 
 * 提供用户感知状态的同步功能
 */

import * as encoding from './encoding.js';
import * as decoding from './decoding.js';
import { Observable } from './observable.js';

/**
 * 感知状态管理器类
 */
export class Awareness extends Observable {
  /**
   * 创建感知状态管理器
   * @param {Y.Doc} doc - Yjs文档实例
   */
  constructor(doc) {
    super();
    
    if (!doc) {
      throw new Error('Awareness构造函数需要有效的doc参数');
    }
    
    // 确保doc有clientID
    if (!doc.clientID) {
      doc.clientID = Math.floor(Math.random() * 1000000);
      console.warn('[Awareness] 文档缺少clientID，已自动生成随机ID:', doc.clientID);
    }
    
    this.doc = doc;
    this.clientID = doc.clientID;
    this.states = new Map();
    this.meta = new Map();
    
    this._beforeUnloadHandler = () => {
      removeAwarenessStates(
        this,
        [doc.clientID],
        'beforeunload'
      );
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this._beforeUnloadHandler);
    }
    
    if (typeof navigator !== 'undefined') {
      this.meta.set('device', {
        platform: navigator.platform,
        userAgent: navigator.userAgent
      });
    }
  }
  
  /**
   * 设置本地客户端的状态
   * @param {Object} state - 状态对象
   */
  setLocalState(state) {
    const clientID = this.clientID;
    const prevState = this.states.get(clientID);
    const equal = prevState !== undefined && deepEqual(state, prevState);
    
    if (!equal) {
      this.states.set(clientID, state);
      this.emit('update', [{ added: [], updated: [clientID], removed: [] }, 'local']);
    }
  }
  
  /**
   * 获取本地客户端的状态
   * @returns {Object} 状态对象
   */
  getLocalState() {
    return this.states.get(this.clientID) || {};
  }
  
  /**
   * 获取所有感知状态的映射
   * @returns {Map<number, Object>} 客户端ID到状态的映射
   */
  getStates() {
    return this.states;
  }
  
  /**
   * 销毁感知状态管理器，清理资源
   */
  destroy() {
    this.emit('destroy', [this]);
    this.setLocalState(null);
    super.destroy();
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this._beforeUnloadHandler);
    }
  }
}

/**
 * 移除客户端的感知状态
 * @param {Awareness} awareness - 感知状态管理器
 * @param {Array<number>} clients - 要移除的客户端ID数组
 * @param {any} origin - 操作来源
 */
export function removeAwarenessStates(awareness, clients, origin) {
  const removed = [];
  for (const clientID of clients) {
    if (awareness.states.has(clientID)) {
      awareness.states.delete(clientID);
      removed.push(clientID);
    }
  }
  
  if (removed.length > 0) {
    awareness.emit('update', [{ added: [], updated: [], removed }, origin]);
  }
}

/**
 * 应用感知状态更新
 * @param {Awareness} awareness - 感知状态管理器
 * @param {Uint8Array} update - 更新数据
 * @param {any} origin - 操作来源
 */
export function applyAwarenessUpdate(awareness, update, origin) {
  try {
    const decoder = decoding.createDecoder(update);
    const timestamp = decoding.readVarUint(decoder);
    const clientsLength = decoding.readVarUint(decoder);
    
    const added = [];
    const updated = [];
    const removed = [];
    
    for (let i = 0; i < clientsLength; i++) {
      const clientID = decoding.readVarUint(decoder);
      const clock = decoding.readVarUint(decoder);
      
      // 如果clock为0，表示删除状态
      if (clock === 0) {
        if (awareness.states.has(clientID)) {
          awareness.states.delete(clientID);
          removed.push(clientID);
        }
      } else {
        // 否则是添加或更新状态
        const state = JSON.parse(decoding.readVarString(decoder));
        const prev = awareness.states.get(clientID);
        if (prev === undefined) {
          added.push(clientID);
        } else {
          updated.push(clientID);
        }
        awareness.states.set(clientID, state);
      }
    }
    
    if (added.length > 0 || updated.length > 0 || removed.length > 0) {
      awareness.emit('update', [{ added, updated, removed }, origin]);
    }
  } catch (error) {
    console.error('应用感知状态更新失败:', error);
  }
}

/**
 * 编码感知状态更新
 * @param {Awareness} awareness - 感知状态管理器
 * @param {Array<number>} clients - 要包含的客户端ID数组
 * @param {Map<number, Object>} [states] - 可选的自定义状态映射
 * @returns {Uint8Array} 编码后的感知状态更新
 */
export function encodeAwarenessUpdate(awareness, clients, states = null) {
  const encoder = encoding.createEncoder();
  const timestamp = Date.now();
  
  encoding.writeVarUint(encoder, timestamp);
  encoding.writeVarUint(encoder, clients.length);
  
  for (const clientID of clients) {
    const state = states === null ? awareness.states.get(clientID) : states.get(clientID);
    
    encoding.writeVarUint(encoder, clientID);
    
    if (state === undefined || state === null) {
      // 写入时钟值0表示删除
      encoding.writeVarUint(encoder, 0);
    } else {
      // 写入时钟值1和状态数据
      encoding.writeVarUint(encoder, 1);
      encoding.writeVarString(encoder, JSON.stringify(state));
    }
  }
  
  return encoding.toUint8Array(encoder);
}

/**
 * 深度对比两个对象是否相等
 * @param {any} a - 第一个对象
 * @param {any} b - 第二个对象
 * @returns {boolean} 是否相等
 * @private
 */
function deepEqual(a, b) {
  if (a === b) return true;
  
  if (a === null || b === null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  
  return true;
} 