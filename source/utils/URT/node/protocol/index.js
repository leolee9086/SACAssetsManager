import { createHTTPProtocol } from './http.js';
import { createWebSocketProtocol } from './websocket.js';
import { createInProcessProtocol } from './inProcess.js';

/**
 * 创建协议管理器
 * @param {Object} options
 * @returns {Object} 协议管理器接口
 */
function createProtocolManager(options = {}) {
  const protocols = {
    http: createHTTPProtocol(options),
    websocket: createWebSocketProtocol(options),
    inProcess: createInProcessProtocol(options)
  };

  /**
   * 处理接收到的消息
   * @param {string} protocolType
   * @param {Object} message
   * @param {Object} sender
   */
  async function handleMessage(protocolType, message, sender) {
    const protocol = protocols[protocolType];
    if (protocol) {
      return await protocol.handleMessage(message, sender);
    }
    throw new Error(`Unknown protocol type: ${protocolType}`);
  }

  /**
   * 发送消息到指定节点
   * @param {string} protocolType
   * @param {string} target
   * @param {Object} message
   */
  async function send(protocolType, target, message) {
    const protocol = protocols[protocolType];
    if (protocol) {
      return await protocol.send(target, message);
    }
    throw new Error(`Unknown protocol type: ${protocolType}`);
  }

  return {
    handleMessage,
    send
  };
}

export { createProtocolManager };
