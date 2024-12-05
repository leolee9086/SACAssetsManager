// 创建基础DOM元素
function 创建元素(tag) {
    const [namespace, tagName] = tag.includes(':') ? tag.split(':') : [null, tag];
    return namespace 
        ? document.createElementNS(namespace, tagName) 
        : document.createElement(tagName);
}

// 处理属性设置
function 设置属性(element, attrs = {}) {
    if (!element || !(element instanceof Element)) {
        throw new Error('无效的 DOM 元素');
    }

    for (const [key, value] of Object.entries(attrs)) {
        if (value === null || value === undefined) continue;
        
        if (key === 'class') {
            if (Array.isArray(value)) {
                element.className = value.filter(Boolean).join(' ');
            } else if (typeof value === 'string') {
                element.className = value;
            }
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value);
        } else if (key.startsWith('on') && typeof value === 'function') {
            绑定事件(element, key, value);
        } else {
            element.setAttribute(key, String(value));
        }
    }
    return element;
}

// 处理事件绑定
function 绑定事件(element, key, handler) {
    const eventName = key.substring(2).toLowerCase();
    const options = {
        passive: !['scroll', 'touchstart', 'touchmove'].includes(eventName)
    };
    element.addEventListener(eventName, handler, options);
}

// 添加子元素
function 添加子元素(element, children) {
    for (const child of children) {
        if (child === null || child === undefined) continue;
        
        if (typeof child === 'string' || typeof child === 'number') {
            element.appendChild(document.createTextNode(String(child)));
        } else if (child instanceof Node) {
            element.appendChild(child);
        } else if (Array.isArray(child)) {
            添加子元素(element, child);
        }
    }
    return element;
}

// 主函数
export function 构建DOM元素(tag, attrs = {}, ...children) {
    const element = 创建元素(tag);
    设置属性(element, attrs);
    添加子元素(element, children);
    return element;
}
export {构建DOM元素 as h}