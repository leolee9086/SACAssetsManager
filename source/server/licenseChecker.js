import { generateRSAKeyPair } from "./processors/license/keyPair.js";
import { createEncryptedMessage } from "./processors/license/create.js";
import { verifyActivationCode } from "./processors/license/verify.js";
const { publicKey, privateKey } = generateRSAKeyPair();
const { encryptedMessage } = createEncryptedMessage(privateKey);
const isCodeValid = verifyActivationCode(encryptedMessage, publicKey);
console.log('Is Activation Code Valid?', isCodeValid,encryptedMessage);
