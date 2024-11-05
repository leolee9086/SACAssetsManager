import { v4 as uuidv4 } from "../../../static/uuid.mjs";
/**
 * 验证并修正 UUID
 * @param {string} id 需要验证的ID
 * @returns {string} 有效的UUID
 */
export const validateUUID = (id) => {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return UUID_REGEX.test(id) ? id : uuidv4();
};
  
  