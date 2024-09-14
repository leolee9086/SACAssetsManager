let _Buffer = class {}
if (globalThis.require) {
  _Buffer = Buffer;
}
export let safeStringify = async (messages,maxSize=1024) => {
  let massageString = ""
  let messageSize = 0
  try {
    massageString = 去循环序列化(messages)
    messageSize = new Blob([去循环序列化(messages)]).size; // 估计大小
  } catch (e) {
    console.error('无法发送消息', e, messages)
    return
  }
  if (messageSize > maxSize) {
    console.error('Message too large to send', messages);
    return; // 如果过大，拒绝发送
  }
}
function 处理循环引用(cache) {
  return (key, value) => {
    if (cache.has(value)) {
      // 移除循环引用
      return '[Circular]';
    }
    cache.add(value);
    return value;
  };
}


export function 去循环序列化(obj, depth = 5, arrayLimit = 50) {
  const cache = new Set();
  return JSON.stringify(obj, (key, value) => {
    if (depth <= 0) {
      return '[Max Depth Reached]';
    }
    if (typeof value === 'object' && value !== null) {
      value = 处理循环引用(cache)(key, value);
      depth--;
    }
    return value;
  });
}
export function 是否循环引用(obj) {
  const cache = new Set();
  try {
    JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) {
          throw new Error('Detected a cycle');
        }
        cache.add(value);
      }
      return value;
    });
    return false; // 如果没有循环引用，返回false
  } catch (error) {
    return true; // 如果检测到循环引用，返回true
  }
}