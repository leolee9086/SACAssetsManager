import { componentMap } from "../componentMapLoader.js";
export function 校验并补齐卡片设置(cardConfig) {
    // 设置默认值
    cardConfig.type = typeof cardConfig.type === 'string' ? cardConfig.type : 'unknown';
    cardConfig.title = cardConfig.title || '未命名卡片';
    cardConfig.position = cardConfig.position || { x: 100, y: 100 };
    
    // 确保position对象包含必要的属性
    cardConfig.position.x = cardConfig.position.x || 0;
    cardConfig.position.y = cardConfig.position.y || 0;
  
    // 确保id存在
    if (!cardConfig.id) {
      throw new Error('缺少必要的卡片配置: id');
    }
  
    // 类型检查
    if (typeof cardConfig.id !== 'string' && typeof cardConfig.id !== 'number') {
      throw new Error('卡片id必须是字符串或数字类型');
    }
  }
 export async function 解析卡片类型(cardConfig) {

    console.log(cardConfig,componentMap)
    let type = cardConfig.type;
    if (type === 'custom' && cardConfig.nodeFile) {
      type = cardConfig.nodeFile;
      if (!componentMap[type]) {
        componentMap[type] = {
          type: 'custom',
          file: cardConfig.nodeFile
        };
      }
    } else if (!componentMap[type]) {
      cardConfig.type = 'unsupported';
      cardConfig.runtimeErrors = {
        onloading: `不支持的卡片类型: ${type}`
      };
      return cardConfig.type;
    }
    return type;
  }