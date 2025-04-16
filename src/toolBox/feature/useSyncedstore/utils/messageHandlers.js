/**
 * @fileoverview 消息处理工具
 * 
 * 提供处理WebSocket消息的工具函数，用于思源同步Provider
 */

import * as awarenessProtocol from '../impl/awareness.js';
import * as syncProtocol from '../impl/sync.js';
import * as encoding from '../impl/encoding.js';
import * as decoding from '../impl/decoding.js';
import { toUint8Array, isValidDecoder, hasEnoughData } from './binaryUtils.js';

// 消息类型常量
export const MESSAGE_SYNC = 0;
export const MESSAGE_AWARENESS = 1;
export const MESSAGE_AUTH = 2;
export const MESSAGE_QUERY_AWARENESS = 3;

// 同步消息子类型
export const SYNC_STEP1 = 0;
export const SYNC_STEP2 = 1;
export const SYNC_UPDATE = 2;

/**
 * 处理同步消息
 * @param {Object} decoder - 解码器
 * @param {Y.Doc} doc - Yjs文档
 * @param {Object} provider - 同步提供器
 * @returns {boolean} 是否成功处理
 */
export function handleSyncMessage(decoder, doc, provider) {
  // 基本有效性检查
  if (!decoder || !decoder.arr || !doc) {
    console.warn('[消息处理] 无效的解码器或文档');
    return false;
  }

  // 解码器位置检查 - 特殊处理已读完的情况
  if (decoder.pos >= decoder.arr.length) {
    console.log('[消息处理] 解码器数据已读完，可能是空消息或已完全处理');
    return false;
  }

  try {
    // 创建响应编码器
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    
    // 确保剩余数据足够
    if ((decoder.arr.length - decoder.pos) < 1) {
      console.warn('[消息处理] 同步消息数据不足，跳过处理');
      return false;
    }
    
    // 读取同步消息
    const syncMessageType = syncProtocol.readSyncMessage(
      decoder, 
      encoder, 
      doc, 
      provider
    );
    
    // 发送响应（如果有）
    if (encoding.length(encoder) > 1) {
      provider._send(encoding.toUint8Array(encoder));
    }
    
    // 更新同步状态
    if (syncMessageType === syncProtocol.messageYjsSyncStep2) {
      return true; // 返回已同步状态
    }
    
    return false;
  } catch (error) {
    console.warn('[消息处理] 处理同步消息时出现问题:', error);
    return false;
  }
}

/**
 * 处理感知状态消息
 * @param {Object} decoder - 解码器
 * @param {Object} awareness - 感知状态管理器 
 * @param {Object} provider - 同步提供器
 * @returns {boolean} 是否成功处理
 */
export function handleAwarenessMessage(decoder, awareness, provider) {
  // 基本有效性检查
  if (!decoder || !decoder.arr || !awareness) {
    console.warn('[消息处理] 无效的解码器或感知状态管理器');
    return false;
  }

  // 解码器位置检查
  if (decoder.pos >= decoder.arr.length) {
    console.log('[消息处理] 解码器数据已读完，可能是空消息');
    return false;
  }

  try {
    // 读取感知状态更新数据
    const update = decoding.readVarUint8Array(decoder);
    
    // 检查数据有效性
    if (!update || update.length === 0) {
      console.warn('[消息处理] 接收到空的感知状态更新');
      return false;
    }
    
    // 应用感知状态更新
    awarenessProtocol.applyAwarenessUpdate(awareness, update, provider);
    return true;
  } catch (error) {
    console.warn('[消息处理] 处理感知状态更新时出现问题:', error);
    return false;
  }
}

/**
 * 处理查询感知状态消息
 * @param {Object} awareness - 感知状态管理器
 * @param {number} clientID - 客户端ID
 * @param {Function} sendCallback - 发送函数
 * @returns {boolean} 是否成功处理
 */
export function handleQueryAwarenessMessage(awareness, clientID, sendCallback) {
  if (!awareness || !sendCallback) {
    console.error('[消息处理] 无效的感知状态管理器或发送回调');
    return false;
  }

  try {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    
    if (!clientID) {
      // 如果没有客户端ID，发送空数组
      encoding.writeVarUint(encoder, 0);
    } else {
      // 编码当前客户端的感知状态
      const awarenessUpdate = awarenessProtocol.encodeAwarenessUpdate(
        awareness,
        [clientID]
      );
      encoding.writeVarUint8Array(encoder, awarenessUpdate);
    }
    
    // 发送响应
    sendCallback(encoding.toUint8Array(encoder));
    return true;
  } catch (error) {
    console.error('[消息处理] 处理查询感知状态消息失败:', error);
    return false;
  }
}

/**
 * 发送同步步骤1消息
 * @param {Y.Doc} doc - Yjs文档
 * @param {Function} sendCallback - 发送函数
 * @returns {boolean} 是否成功发送
 */
export function sendSyncStep1(doc, sendCallback) {
  if (!doc || !sendCallback) {
    console.error('[消息处理] 无效的文档或发送回调');
    return false;
  }

  try {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    
    // 使用同步协议的标准方法
    syncProtocol.writeSyncStep1(encoder, doc);
    
    // 发送消息
    sendCallback(encoding.toUint8Array(encoder));
    return true;
  } catch (error) {
    // 如果标准方法失败，尝试使用基础方法
    try {
      console.warn('[消息处理] 使用标准方法发送同步步骤1失败，尝试基础方法:', error);
      
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      encoding.writeVarUint(encoder, SYNC_STEP1);
      encoding.writeVarUint(encoder, 0); // 空状态向量的长度
      
      sendCallback(encoding.toUint8Array(encoder));
      return true;
    } catch (fallbackError) {
      console.error('[消息处理] 发送同步步骤1消息失败:', fallbackError);
      return false;
    }
  }
}

/**
 * 发送感知状态查询消息
 * @param {Function} sendCallback - 发送函数
 * @returns {boolean} 是否成功发送
 */
export function sendQueryAwareness(sendCallback) {
  if (!sendCallback) {
    console.error('[消息处理] 无效的发送回调');
    return false;
  }

  try {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_QUERY_AWARENESS);
    
    // 发送消息
    sendCallback(encoding.toUint8Array(encoder));
    return true;
  } catch (error) {
    console.error('[消息处理] 发送查询感知状态消息失败:', error);
    return false;
  }
} 