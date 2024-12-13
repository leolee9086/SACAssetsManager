/**
 * 创建同进程协议
 * @param {Object} options
 * @returns {Object} 同进程协议接口
 */
function createInProcessProtocol(options = {}) {
  const handlers = new Map();

  /**
   * 注册消息处理器
   * @param {string} type
   * @param {function} handler
   */
  function registerHandler(type, handler) {
    handlers.set(type, handler);
  }

  /**
   * 处理消息
   * @param {Object} message
   * @param {Object} sender
   */
  async function handleMessage(message, sender) {
    const handler = handlers.get(message.type);
    if (handler) {
      return await handler(message.payload, sender);
    }
    throw new Error(`Unknown message type: ${message.type}`);
  }

  /**
   * 发送消息
   * @param {string} target
   * @param {Object} message
   */
  async function send(target, message) {
    // 直接调用目标的消息处理器
    return await target.handleMessage(message, { local: true });
  }

  return {
    registerHandler,
    handleMessage,
    send
  };
}

export { createInProcessProtocol };
