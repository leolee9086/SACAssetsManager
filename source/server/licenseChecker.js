

const crypto = require('crypto');

function generateRSAKeyPair() {
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
}

const { publicKey, privateKey } = generateRSAKeyPair();
console.log(publicKey, privateKey)
function createEncryptedMessage(privateKey) {
    const validMessage = '知行合一,经世致用';
    const timestamp = Date.now(); // 当前时间戳
    const messageWithTimestamp = `${validMessage} ${timestamp}`;
    
    const encryptedMessage = crypto.privateEncrypt({
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    }, Buffer.from(messageWithTimestamp)).toString('hex');
    
    return { encryptedMessage, timestamp };
  }
  
  const { encryptedMessage } = createEncryptedMessage(privateKey);
  function verifyActivationCode(encryptedMessage, publicKey) {
    const decryptedMessageBuffer = crypto.publicDecrypt({
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    }, Buffer.from(encryptedMessage, 'hex'));
  
    const decryptedMessage = decryptedMessageBuffer.toString();
    const parts = decryptedMessage.split(' ');
    console.log(parts)
    if (parts[0] === '知行合一,经世致用') {
      const timestamp = parseInt(parts[1], 10);
      // 检查时间戳是否在有效范围内，例如10分钟
      const timeDiff = Math.abs(timestamp - Date.now());
      const isValidPeriod = timeDiff <= 10 * 60 * 1000; // 10 minutes in milliseconds
      return isValidPeriod;
    }
    return false;
  }
  
  const isCodeValid = verifyActivationCode(encryptedMessage, publicKey);
  console.log('Is Activation Code Valid?', isCodeValid);
  