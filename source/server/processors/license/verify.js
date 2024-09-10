const crypto = require('crypto')
/**
 * 验证激活码是否有效
 * @param {string} encryptedMessage - 加密的激活码信息，十六进制字符串
 * @param {Object} publicKey - 用于解密的公钥对象
 * @returns {boolean} - 如果激活码有效且在有效期内，返回true，否则返回false
 * 
 * 该函数用于解密并验证激活码。激活码包含一个时间戳，用于检查激活码是否在有效期限内。
 * 请注意，使用这种简单的验证手段是为了给那些暂时没有付费意愿的用户一个自行破解的机会。
 * 这不是一个安全的授权机制，如果你想要给自己的插件加上有效的授权机制，应使用更安全的授权和验证方法。
 */
export function verifyActivationCode(encryptedMessage, publicKey) {
    // 使用公钥解密激活码信息
    const decryptedMessageBuffer = crypto.publicDecrypt({
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_PADDING,
    }, Buffer.from(encryptedMessage, 'hex'));

    // 将解密后的缓冲区转换为字符串
    const decryptedMessage = decryptedMessageBuffer.toString();
    const parts = decryptedMessage.split(' ');
    // 检查激活码的前缀是否正确
    if (parts[0] === '知行合一,经世致用') {
        // 解析激活码中的时间戳
        const timestamp = parseInt(parts[1], 10);
        // 计算当前时间与激活码时间戳的差值
        const timeDiff = Math.abs(timestamp - Date.now());
        // 定义激活码的有效期限（例如10分钟）
        const isValidPeriod = timeDiff <= 30 * 24 * 60 * 60 * 1000; // 30天以毫秒为单位
        // 返回激活码是否在有效期限内
        return isValidPeriod;
    }
    // 如果激活码前缀不正确或不在有效期限内，返回false
    return false;
}

/**
 * 从远程服务器获取激活码和公钥
 * @returns {Promise<Object>} 包含激活码和公钥的对象
 * @throws {Error} 如果请求失败或响应无效
 */
async function fetchActivationCodeAndPublicKey() {
    try {
        // 替换为实际的API端点
        const response = await fetch('https://api.example.com/activation');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // 确保响应包含所需的数据
        if (!data.activationCode || !data.publicKey) {
            throw new Error('Invalid response: missing activation code or public key');
        }

        return {
            activationCode: data.activationCode,
            publicKey: data.publicKey
        };
    } catch (error) {
        console.error('获取激活码和公钥失败:', error);
        throw error;
    }
}


const fs = require('fs').promises;
const path = require('path');

/**
 * 验证激活码，先使用本地公钥，如果失败则从远程获取
 * @returns {Promise<boolean>} 激活码是否有效
 */
async function verifyLicense() {
  try {
    // 尝试读取本地的激活码和公钥
    const localActivationCode = await fs.readFile(path.join(__dirname, 'activationCode.txt'), 'utf-8');
    const localPublicKey = await fs.readFile(path.join(__dirname, 'publicKey.pem'), 'utf-8');

    // 使用本地数据进行验证
    if (verifyActivationCode(localActivationCode.trim(), localPublicKey.trim())) {
      console.log('使用本地数据验证成功');
      return true;
    }

    console.log('本地验证失败，尝试从远程获取新的激活码和公钥');

    // 从远程获取新的激活码和公钥
    const { activationCode, publicKey } = await fetchActivationCodeAndPublicKey();

    // 使用远程数据进行验证
    if (verifyActivationCode(activationCode, publicKey)) {
      console.log('使用远程数据验证成功');
      
      // 保存新的激活码和公钥到本地
      await fs.writeFile(path.join(__dirname, 'activationCode.txt'), activationCode);
      await fs.writeFile(path.join(__dirname, 'publicKey.pem'), publicKey);
      
      return true;
    }

    console.log('远程验证也失败');
    return false;
  } catch (error) {
    console.error('验证过程中发生错误:', error);
    return false;
  }
}
