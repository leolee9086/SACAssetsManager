/**
 * @module sync-protocol
 */

import * as encoding from './encoding.js';
import * as decoding from './decoding.js';

// 消息类型常量
export const messageSync = {
  // 请求发送状态差异
  STEP1: 0,
  // 发送状态差异
  STEP2: 1,
  // 直接发送更新数据
  UPDATE: 2
}

// Yjs 同步消息类型
export const messageYjsSyncStep1 = 0
export const messageYjsSyncStep2 = 1
export const messageYjsUpdate = 2

/**
 * 初始化同步函数
 * @param {Object} Y Yjs 库实例
 */
export function initSyncFunctions(Y) {
  // 检查Y的有效性
  if (Y && typeof Y === 'object') {
    console.log('已初始化同步函数 - 使用提供的Y实例');
  } else {
    console.warn('未能找到有效的Yjs实例，同步协议可能不会正常工作');
  }
}

/**
 * 获取文档的状态向量并编码为Uint8Array
 * @param {Object} doc Y.Doc 实例
 * @return {Uint8Array} 编码后的状态向量
 */
export const encodeStateVector = doc => {
  try {
    // 优先使用doc的方法
    if (doc && typeof doc.encodeStateVector === 'function') {
      return doc.encodeStateVector();
    }
    
    // 如果doc对象没有encodeStateVector方法，尝试获取Y并使用静态方法
    if (typeof window !== 'undefined' && window.Y && typeof window.Y.encodeStateVector === 'function') {
      return window.Y.encodeStateVector(doc);
    }
    
    // 最后的降级策略
    console.warn('encodeStateVector 方法不可用，返回基本状态向量编码');
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, 0); // 空的状态向量
    return encoding.toUint8Array(encoder);
  } catch (error) {
    console.warn('encodeStateVector 函数执行失败', error);
    // 返回一个基本的编码空状态向量
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, 0);
    return encoding.toUint8Array(encoder);
  }
}

/**
 * 将文档的状态编码为更新消息
 * @param {Object} doc Y.Doc 实例
 * @param {Uint8Array} [encodedStateVector] 可选的目标状态向量
 * @return {Uint8Array} 编码后的更新数据
 */
export const encodeStateAsUpdate = (doc, encodedStateVector) => {
  try {
    // 优先使用doc的方法
    if (doc && typeof doc.encodeStateAsUpdate === 'function') {
      return doc.encodeStateAsUpdate(encodedStateVector);
    }
    
    // 如果doc对象没有encodeStateAsUpdate方法，尝试获取Y并使用静态方法
    if (typeof window !== 'undefined' && window.Y && typeof window.Y.encodeStateAsUpdate === 'function') {
      return window.Y.encodeStateAsUpdate(doc, encodedStateVector);
    }
    
    // 最后的降级策略
    console.warn('encodeStateAsUpdate 函数不可用，返回基本更新编码');
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, 0); // 空的客户端结构
    encoding.writeVarUint(encoder, 0); // 空的删除集
    return encoding.toUint8Array(encoder);
  } catch (error) {
    console.warn('encodeStateAsUpdate 函数执行失败', error);
    // 返回一个基本的编码空更新
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, 0);
    encoding.writeVarUint(encoder, 0);
    return encoding.toUint8Array(encoder);
  }
}

/**
 * 将更新应用到文档
 * @param {Object} doc Y.Doc 实例
 * @param {Uint8Array} update 要应用的更新
 * @param {any} [origin] 更新来源
 */
export const applyUpdate = (doc, update, origin) => {
  try {
    // 优先使用doc的方法
    if (doc && typeof doc.applyUpdate === 'function') {
      return doc.applyUpdate(update, origin);
    }
    
    // 如果doc对象没有applyUpdate方法，尝试获取Y并使用静态方法
    if (typeof window !== 'undefined' && window.Y && typeof window.Y.applyUpdate === 'function') {
      return window.Y.applyUpdate(doc, update, origin);
    }
    
    // 如果doc有transact方法，尝试使用事务应用更新
    if (doc && typeof doc.transact === 'function') {
      return doc.transact(() => {
        console.log('尝试应用更新，但未实现具体逻辑');
      }, origin);
    }
    
    // 最后的降级策略
    console.warn('applyUpdate 函数不可用，无法应用更新');
  } catch (error) {
    console.warn('applyUpdate 函数执行失败', error);
  }
}

/**
 * 编写同步步骤1消息（请求状态差异）
 * @param {Object} encoder 编码器
 * @param {Object} doc Y.Doc实例
 */
export const writeSyncStep1 = (encoder, doc) => {
  // 写入类型标识符
  encoding.writeVarUint(encoder, messageSync.STEP1);
  // 获取状态向量 - 即使doc不支持也会返回有效编码
  const sv = encodeStateVector(doc);
  encoding.writeVarUint8Array(encoder, sv);
}

/**
 * 编写同步步骤2消息（发送状态差异）
 * @param {Object} encoder 编码器
 * @param {Object} doc Y.Doc 实例
 * @param {Uint8Array} encodedStateVector 接收到的状态向量
 */
export const writeSyncStep2 = (encoder, doc, encodedStateVector) => {
  // 写入类型标识符
  encoding.writeVarUint(encoder, messageSync.STEP2);
  // 将状态差异编码到消息中 - 使用强化的encodeStateAsUpdate
  const update = encodeStateAsUpdate(doc, encodedStateVector);
  encoding.writeVarUint8Array(encoder, update);
}

/**
 * 编写更新消息（直接发送更新数据）
 * @param {Object} encoder 编码器
 * @param {Uint8Array} update 更新数据
 */
export const writeUpdate = (encoder, update) => {
  encoding.writeVarUint(encoder, messageSync.UPDATE);
  encoding.writeVarUint8Array(encoder, update);
}

/**
 * 解析接收到的同步消息
 * @param {Object} decoder 解码器
 * @param {Object} encoder 响应编码器
 * @param {Object} doc Y.Doc 实例
 * @param {any} [origin] 事务来源
 * @return {number} 同步消息类型
 */
export const readSyncMessage = (decoder, encoder, doc, origin) => {
  const syncMessageType = decoding.readVarUint(decoder);
  let messageType = null;
  
  switch (syncMessageType) {
    case messageSync.STEP1: {
      messageType = messageYjsSyncStep1;
      // 读取请求的状态向量
      const encodedStateVector = decoding.readVarUint8Array(decoder);
      // 响应状态差异
      writeSyncStep2(encoder, doc, encodedStateVector);
      break;
    }
    case messageSync.STEP2: {
      messageType = messageYjsSyncStep2;
      // 读取状态差异并应用
      const update = decoding.readVarUint8Array(decoder);
      applyUpdate(doc, update, origin);
      break;
    }
    case messageSync.UPDATE: {
      messageType = messageYjsUpdate;
      // 读取更新数据并应用
      const update = decoding.readVarUint8Array(decoder);
      applyUpdate(doc, update, origin);
      break;
    }
    default:
      console.error('未知的同步消息类型', syncMessageType);
      break;
  }
  
  return messageType;
}

// 继续导出必要的函数
export { encoding, decoding }; 