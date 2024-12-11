import axios from 'axios';

/**
 * 创建 HTTP 协议
 * @param {Object} options
 * @returns {Object} HTTP 协议接口
 */
function createHTTPProtocol(options = {}) {
  /**
   * 处理消息
   * @param {Object} message
   * @param {Object} sender
   */
  async function handleMessage(message, sender) {
    // 实现 HTTP 消息处理逻辑
  }

  /**
   * 发送消息
   * @param {string} target
   * @param {Object} message
   */
  async function send(target, message) {
    const response = await axios.post(target, message);
    return response.data;
  }

  return {
    handleMessage,
    send
  };
}

export { createHTTPProtocol };
