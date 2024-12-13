/**
 * @typedef {Object} BookmarkNode
 * @property {'bookmark'} type
 * @property {string} title
 * @property {string} desc
 * @property {string} href
 * @property {string} [added]
 * @property {string} [modified]
 * @property {string} [id]
 * @property {string} [visited]
 * @property {string} [icon]
 */

/**
 * @typedef {Object} FolderNode
 * @property {'folder'} type
 * @property {string} title
 * @property {string} desc
 * @property {Array<BookmarkNode|FolderNode|SeparatorNode>} children
 * @property {string} [added]
 * @property {string} [modified]
 * @property {string} [id]
 */

/**
 * @typedef {Object} SeparatorNode
 * @property {'separator'} type
 */

/**
 * @typedef {Object} RootNode
 * @property {'root'} type
 * @property {string} title
 * @property {string} desc
 * @property {string} version
 * @property {Array<BookmarkNode|FolderNode|SeparatorNode>} children
 */

/**
 * 处理节点的通用属性
 * @param {Element} element - DOM元素
 * @param {string[]} attrs - 需要处理的属性名数组
 * @returns {Object} 属性对象
 */
function processAttributes(element, attrs) {
    const result = {};
    if (!element || !attrs?.length) return result;
    
    attrs.forEach(attr => {
        const value = element.getAttribute(attr);
        if (value?.trim()) result[attr] = value.trim();
    });
    return result;
}

/**
 * 获取节点的标题和描述
 * @param {Element} element - DOM元素
 * @returns {{title: string, desc: string}}
 */
function getMetadata(element) {
    if (!element) {
        return { title: "", desc: "" };
    }
    
    const titleNode = element.querySelector(":scope > title");
    const descNode = element.querySelector(":scope > desc");
    
    return {
        title: titleNode?.textContent?.trim() || "",
        desc: descNode?.textContent?.trim() || ""
    };
}

/**
 * 递归处理XBEL节点
 * @param {Element} node - 当前处理的节点
 * @returns {Array<BookmarkNode|FolderNode|SeparatorNode>}
 */
function processNode(node) {
    if (!node) return [];
    const items = [];
    
    // 使用:scope > *选择器只处理直接子节点
    const children = node.querySelectorAll(":scope > *");
    
    for (const child of children) {
        const nodeName = child.nodeName.toLowerCase();
        
        try {
            switch (nodeName) {
                case "separator":
                    items.push({ type: "separator" });
                    break;
                    
                case "folder": {
                    const metadata = getMetadata(child);
                    const folder = {
                        type: "folder",
                        ...metadata,
                        children: processNode(child),
                        ...processAttributes(child, ["id", "added", "modified"])
                    };
                    items.push(folder);
                    break;
                }
                    
                case "bookmark": {
                    const metadata = getMetadata(child);
                    const href = child.getAttribute("href")?.trim();
                    if (!href) {
                        console.warn("发现没有href属性的书签:", metadata.title);
                        continue;
                    }
                    
                    const bookmark = {
                        type: "bookmark",
                        ...metadata,
                        href,
                        ...processAttributes(child, ["id", "added", "modified", "visited", "icon"])
                    };
                    items.push(bookmark);
                    break;
                }
                    
                case "title":
                case "desc":
                case "info":
                case "metadata":
                    // 这些是元数据节点，可以忽略
                    break;
                    
                default:
                    console.warn(`忽略未知的节点类型: ${nodeName}`);
            }
        } catch (error) {
            console.error(`处理节点时出错:`, error);
            console.error('问题节点:', child);
            // 继续处理其他节点
            continue;
        }
    }
    
    return items;
}

/**
 * 解析XBEL格式的书签文件
 * @param {string} xbelContent - XBEL格式的XML字符串
 * @returns {RootNode} 解析后的书签树
 * @throws {Error} 解析错误时抛出异常
 */
function parseXBEL(xbelContent) {
    if (!xbelContent?.trim()) {
        throw new Error('XBEL内容不能为空');
    }

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xbelContent, "text/xml");
    
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
        throw new Error('XML解析错误: ' + parseError.textContent);
    }

    const xbelRoot = xmlDoc.querySelector("xbel");
    if (!xbelRoot) {
        throw new Error('无效的XBEL文件：缺少xbel根元素');
    }

    const version = xbelRoot.getAttribute("version")?.trim() || "1.0";
    const metadata = getMetadata(xbelRoot);
    
    return {
        type: "root",
        ...metadata,
        version,
        children: processNode(xbelRoot)
    };
}

export default parseXBEL;
