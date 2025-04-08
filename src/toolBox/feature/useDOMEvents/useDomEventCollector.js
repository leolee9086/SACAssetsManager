// 状态存储
const observers = new Map();
const throttleTimers = new Map();
const debounceTimers = new Map();

// 工具函数
const matchXPath = (element, xpath) => {
  try {
    const result = document.evaluate(
      xpath, 
      document, 
      null, 
      XPathResult.FIRST_ORDERED_NODE_TYPE, 
      null
    );
    return result.singleNodeValue === element;
  } catch (e) {
    console.error('XPath匹配错误:', e);
    return false;
  }
};

const createEventHandler = (callback, options) => (event) => {
  // 特征匹配检查
  if (options.xpath && !matchXPath(event.target, options.xpath)) return;
  if (options.selector && !event.target.matches(options.selector)) return;

  // 节流处理
  if (options.throttle) {
    const throttleKey = `${event.type}-${event.target.id || 'anonymous'}`;
    if (throttleTimers.has(throttleKey)) return;
    
    throttleTimers.set(throttleKey, true);
    setTimeout(() => throttleTimers.delete(throttleKey), options.throttle);
  }
  
  // 防抖处理
  if (options.debounce) {
    const debounceKey = `${event.type}-${event.target.id || 'anonymous'}`;
    clearTimeout(debounceTimers.get(debounceKey));
    
    debounceTimers.set(debounceKey, 
      setTimeout(() => callback(event), options.debounce));
    return;
  }
  
  callback(event);
};

// 主要API函数
export const addListener = (target, eventType, callback, options = {}) => {
  const element = typeof target === 'string' 
    ? document.querySelector(target) 
    : target;
  
  if (!element) {
    console.warn(`无法找到目标元素: ${target}`);
    return;
  }

  const handler = createEventHandler(callback, options);
  element.addEventListener(eventType, handler);
  
  const observerKey = `${eventType}-${options.xpath || options.selector || 'direct'}`;
  observers.set(observerKey, { element, eventType, handler });
};

export const dispose = () => {
  observers.forEach(({ element, eventType, handler }) => {
    element.removeEventListener(eventType, handler);
  });
  
  observers.clear();
  throttleTimers.clear();
  debounceTimers.clear();
};

// 使用示例:
// import { addListener, dispose } from './domEventCollector';
// 
// // 基于选择器监听点击事件(带节流)
// addListener('.btn', 'click', (e) => {
//   console.log('按钮点击:', e.target);
// }, { throttle: 300 });
// 
// // 基于XPath监听鼠标移动事件(带防抖)
// addListener(
//   document,
//   'mousemove',
//   (e) => { console.log('鼠标移动:', e.clientX, e.clientY); },
//   { xpath: '//div[@class="container"]', debounce: 200 }
// );