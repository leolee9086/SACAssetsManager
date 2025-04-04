const SVG_NS = 'http://www.w3.org/2000/svg'
const XLINK_NS = 'http://www.w3.org/1999/xlink'

// 命名空间映射
const NS_MAP = {
    'svg': SVG_NS,
    'xlink': XLINK_NS
}

// 创建基础DOM元素
function 创建元素(tag) {
    // 处理命名空间标签，例如 'svg:rect' 或 'svg'
    if (tag.includes(':')) {
        const [ns, localName] = tag.split(':')
        const namespace = NS_MAP[ns]
        if (namespace) {
            return document.createElementNS(namespace, localName)
        }
    } else if (tag === 'svg') {
        return document.createElementNS(SVG_NS, 'svg')
    }
    return document.createElement(tag)
}

// 处理属性设置
function 设置属性(element, attrs = {}) {
    if (!attrs) return element
    
    const isSvg = element instanceof SVGElement

    for (const [key, value] of Object.entries(attrs)) {
        if (value === null || value === undefined) continue

        // 处理特殊属性
        if (key === 'class') {
            if (Array.isArray(value)) {
                const className = value.filter(Boolean).join(' ')
                isSvg ? element.setAttribute('class', className) : element.className = className
            } else {
                isSvg ? element.setAttribute('class', value) : element.className = value
            }
            continue
        }

        if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value)
            continue
        }

        // 处理事件监听器
        if (key.startsWith('on') && typeof value === 'function') {
            const eventName = key.slice(2).toLowerCase()
            element.addEventListener(eventName, value)
            continue
        }

        // 处理 SVG 特殊属性
       if (isSvg) {
            if (key.startsWith('xlink:')) {
                element.setAttributeNS(XLINK_NS, key, value)
            } else {
                element.setAttribute(key, value)
            }
            continue
        }

        // 处理普通属性
        if (key in element) {
            element[key] = value
        } else {
            element.setAttribute(key, value)
        }
    }

    return element
}

// 添加子元素
function 添加子元素(element, children) {
    if (!children) return element
    const append = child => {
        if (child === null || child === undefined) return
        
        if (typeof child === 'string' || typeof child === 'number') {
            element.appendChild(document.createTextNode(String(child)))
        } else if (child instanceof Node) {
            element.appendChild(child)
        } else if (Array.isArray(child)) {
            child.forEach(append)
        }
    }
    if (Array.isArray(children)) {
        children.forEach(append)
    } else {
        append(children)
    }
    return element
}

// h 函数 - 创建 DOM 元素
export function 构建DOM元素(tag, attrs, ...children) {
    // 处理参数重载
    if (attrs && !children.length && (Array.isArray(attrs) || attrs instanceof Node || typeof attrs !== 'object')) {
        children = [attrs]
        attrs = null
    }

    const element = 创建元素(tag)
    设置属性(element, attrs)
    添加子元素(element, children)
    return element
}
export { 构建DOM元素 as h }

// f 函数 - 创建文档片段
export function 构建文档片段(...children) {
    const fragment = document.createDocumentFragment()
    添加子元素(fragment, children)
    return fragment
}
export { 构建文档片段 as f }