/**
 * 创建一个加密的消息
 * 
 * @param {string} privateKey - 用于加密消息的RSA私钥
 * @returns {Object} 包含加密消息和时间戳的对象
 * @property {string} encryptedMessage - 十六进制编码的加密消息
 * @property {number} timestamp - 创建消息时的时间戳
 * 
 * @description
 * 此函数执行以下步骤：
 * 1. 定义一个有效的消息文本
 * 2. 获取当前时间戳
 * 3. 将消息文本和时间戳组合
 * 4. 使用提供的私钥对组合后的消息进行RSA加密
 * 5. 将加密后的消息转换为十六进制字符串
 * 
 * 加密消息可用于验证软件许可或激活码。时间戳用于确保消息的时效性。
 */
const crypto=require("crypto")
export function createEncryptedMessage(privateKey) {
    const validMessage = '知行合一,经世致用';
    const timestamp = Date.now(); // 当前时间戳
    const messageWithTimestamp = `${validMessage} ${timestamp}`;
    const encryptedMessage = crypto.privateEncrypt({
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    }, Buffer.from(messageWithTimestamp)).toString('hex');
    return { encryptedMessage, timestamp };
  }
  