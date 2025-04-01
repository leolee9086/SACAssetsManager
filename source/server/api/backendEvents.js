/**
 * 后端事件系统
 * 提供服务器端事件发布订阅机制
 */

import { 日志 } from '../../../src/toolBox/base/useEcma/forLogs/useLogger.js';

/**
 * @typedef {Object} EventSubscription
 * @property {string} id - 订阅ID
 * @property {Function} handler - 事件处理函数
 * @property {boolean} once - 是否只触发一次
 */

// 事件存储
const events = new Map();

// 生成唯一ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

/**
 * 订阅事件
 * @param {string} eventName - 事件名称
 * @param {Function} handler - 事件处理函数
 * @param {Object} [options={}] - 选项
 * @param {boolean} [options.once=false] - 是否只触发一次
 * @returns {string} 订阅ID
 */
export const subscribe = (eventName, handler, options = {}) => {
  if (typeof handler !== 'function') {
    throw new Error('事件处理器必须是函数');
  }
  
  if (!events.has(eventName)) {
    events.set(eventName, new Map());
  }
  
  const subscriptionId = generateId();
  const subscription = {
    id: subscriptionId,
    handler,
    once: !!options.once
  };
  
  events.get(eventName).set(subscriptionId, subscription);
  日志.信息(`订阅事件: ${eventName} (ID: ${subscriptionId})`, 'Events');
  
  return subscriptionId;
};

/**
 * 订阅单次事件
 * @param {string} eventName - 事件名称
 * @param {Function} handler - 事件处理函数
 * @returns {string} 订阅ID
 */
export const subscribeOnce = (eventName, handler) => {
  return subscribe(eventName, handler, { once: true });
};

/**
 * 取消订阅
 * @param {string} eventName - 事件名称
 * @param {string} subscriptionId - 订阅ID
 * @returns {boolean} 是否成功取消
 */
export const unsubscribe = (eventName, subscriptionId) => {
  if (!events.has(eventName)) {
    return false;
  }
  
  const eventSubscriptions = events.get(eventName);
  const result = eventSubscriptions.delete(subscriptionId);
  
  if (result) {
    日志.信息(`取消订阅: ${eventName} (ID: ${subscriptionId})`, 'Events');
    
    // 如果没有更多订阅，删除事件
    if (eventSubscriptions.size === 0) {
      events.delete(eventName);
    }
  }
  
  return result;
};

/**
 * 发布事件
 * @param {string} eventName - 事件名称
 * @param {*} data - 事件数据
 * @returns {Promise<Array>} 处理结果
 */
export const publish = async (eventName, data) => {
  if (!events.has(eventName)) {
    日志.信息(`发布事件: ${eventName}，但没有订阅者`, 'Events');
    return [];
  }
  
  const eventSubscriptions = events.get(eventName);
  const results = [];
  const onceSubscriptions = [];
  
  // 执行所有订阅的处理函数
  for (const [id, subscription] of eventSubscriptions.entries()) {
    try {
      const result = await Promise.resolve(subscription.handler(data, eventName));
      results.push(result);
      
      // 收集需要移除的一次性订阅
      if (subscription.once) {
        onceSubscriptions.push(id);
      }
    } catch (error) {
      日志.错误(`事件处理器错误: ${eventName} - ${error.message}`, 'Events');
      results.push({ error: error.message });
    }
  }
  
  // 移除一次性订阅
  for (const id of onceSubscriptions) {
    eventSubscriptions.delete(id);
  }
  
  // 如果没有更多订阅，删除事件
  if (eventSubscriptions.size === 0) {
    events.delete(eventName);
  }
  
  日志.信息(`发布事件: ${eventName} (${results.length}个订阅者)`, 'Events');
  
  return results;
};

/**
 * 获取事件订阅数量
 * @param {string} [eventName] - 事件名称
 * @returns {number} 订阅数量
 */
export const getSubscriptionCount = (eventName) => {
  if (eventName) {
    return events.has(eventName) ? events.get(eventName).size : 0;
  }
  
  let count = 0;
  for (const subscriptions of events.values()) {
    count += subscriptions.size;
  }
  
  return count;
};

/**
 * 获取所有事件名称
 * @returns {string[]} 事件名称列表
 */
export const getEventNames = () => {
  return Array.from(events.keys());
};

/**
 * 清除特定事件的所有订阅
 * @param {string} eventName - 事件名称
 * @returns {boolean} 是否成功清除
 */
export const clearEvent = (eventName) => {
  const hadEvent = events.has(eventName);
  events.delete(eventName);
  
  if (hadEvent) {
    日志.信息(`清除事件: ${eventName}`, 'Events');
  }
  
  return hadEvent;
};

/**
 * 清除所有事件订阅
 */
export const clearAllEvents = () => {
  const eventCount = events.size;
  events.clear();
  
  if (eventCount > 0) {
    日志.信息(`清除所有事件 (${eventCount}个事件)`, 'Events');
  }
}; 