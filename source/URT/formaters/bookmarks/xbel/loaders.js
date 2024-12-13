import parseXBEL from './parser.js';
import { buildXBELFromEdgeHTML } from './builder.js';

/**
 * 从字符串加载XBEL书签
 * @param {string} content - XBEL格式的字符串
 * @returns {Promise<RootNode>}
 */
export async function fromString(content) {
    try {
        return parseXBEL(content);
    } catch (error) {
        throw new Error(`解析XBEL字符串失败: ${error.message}`);
    }
}

/**
 * 从Buffer加载XBEL书签
 * @param {Buffer} buffer - 包含XBEL内容的Buffer
 * @param {string} [encoding='utf-8'] - 编码格式
 * @returns {Promise<RootNode>}
 */
export async function fromBuffer(buffer, encoding = 'utf-8') {
    try {
        const content = buffer.toString(encoding);
        return await fromString(content);
    } catch (error) {
        throw new Error(`从Buffer加载XBEL失败: ${error.message}`);
    }
}

/**
 * 从URL加载XBEL书签
 * @param {string} url - XBEL文件的URL
 * @param {RequestInit} [options={}] - fetch选项
 * @returns {Promise<RootNode>}
 */
export async function fromURL(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Accept': 'application/xml, text/xml',
                ...(options.headers || {})
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
        }

        const content = await response.text();
        return await fromString(content);
    } catch (error) {
        throw new Error(`从URL加载XBEL失败 (${url}): ${error.message}`);
    }
}

/**
 * 从文件路径加载XBEL书签
 * @param {string} filePath - XBEL文件路径
 * @param {string} [encoding='utf-8'] - 文件编码
 * @returns {Promise<RootNode>}
 */
export async function fromFilePath(filePath, encoding = 'utf-8') {
    try {
        // 根据运行环境选择合适的文件读取方式
        let content;
        
        if (typeof window === 'undefined') {
            // Node.js 环境
            const fs = await import('fs/promises');
            content = await fs.readFile(filePath, { encoding });
        } else {
            // 浏览器环境
            const response = await fetch(`file://${filePath}`);
            if (!response.ok) {
                throw new Error(`文件读取失败: ${response.status} ${response.statusText}`);
            }
            content = await response.text();
        }

        return await fromString(content);
    } catch (error) {
        throw new Error(`从文件加载XBEL失败 (${filePath}): ${error.message}`);
    }
}

/**
 * 从File对象加载XBEL书签（浏览器环境）
 * @param {File} file - XBEL文件对象
 * @returns {Promise<RootNode>}
 */
export async function fromFile(file) {
    try {
        const content = await file.text();
        return await fromString(content);
    } catch (error) {
        throw new Error(`从File对象加载XBEL失败: ${error.message}`);
    }
}

/**
 * 验证XBEL内容是否有效
 * @param {string} content - XBEL内容
 * @returns {boolean}
 */
export function isValidXBEL(content) {
    try {
        parseXBEL(content);
        return true;
    } catch {
        return false;
    }
}

/**
 * 从多个URL并行加载XBEL书签
 * @param {string[]} urls - XBEL文件的URL数组
 * @param {RequestInit} [options={}] - fetch选项
 * @param {number} [concurrency=3] - 并发数
 * @returns {Promise<RootNode[]>}
 */
export async function fromURLs(urls, options = {}, concurrency = 3) {
    const results = [];
    const errors = [];
    
    // 分批处理URL
    for (let i = 0; i < urls.length; i += concurrency) {
        const batch = urls.slice(i, i + concurrency);
        const promises = batch.map(url => 
            fromURL(url, options)
                .catch(error => {
                    errors.push({ url, error: error.message });
                    return null;
                })
        );
        
        const batchResults = await Promise.all(promises);
        results.push(...batchResults.filter(Boolean));
    }
    
    if (errors.length) {
        console.warn('部分URL加载失败:', errors);
    }
    
    return results;
}

/**
 * 从目录加载所有XBEL文件
 * @param {string} dirPath - 目录路径
 * @param {Object} [options={}] - 选项
 * @param {string} [options.encoding='utf-8'] - 文件编码
 * @param {boolean} [options.recursive=false] - 是否递归处理子目录
 * @param {RegExp} [options.pattern=/\.xbel$/i] - 文件名匹配模式
 * @returns {Promise<RootNode[]>}
 */
export async function fromDirectory(dirPath, options = {}) {
    const {
        encoding = 'utf-8',
        recursive = false,
        pattern = /\.xbel$/i
    } = options;

    try {
        if (typeof window !== 'undefined') {
            throw new Error('fromDirectory仅支持Node.js环境');
        }

        const fs = await import('fs/promises');
        const path = await import('path');
        
        async function* getFiles(dir) {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory() && recursive) {
                    yield* getFiles(fullPath);
                } else if (entry.isFile() && pattern.test(entry.name)) {
                    yield fullPath;
                }
            }
        }

        const results = [];
        const errors = [];

        for await (const filePath of getFiles(dirPath)) {
            try {
                const bookmark = await fromFilePath(filePath, encoding);
                results.push(bookmark);
            } catch (error) {
                errors.push({ filePath, error: error.message });
            }
        }

        if (errors.length) {
            console.warn('部分文件加载失败:', errors);
        }

        return results;
    } catch (error) {
        throw new Error(`从目录加载XBEL失败 (${dirPath}): ${error.message}`);
    }
}

/**
 * 从剪贴板加载XBEL内容
 * @returns {Promise<RootNode>}
 */
export async function fromClipboard() {
    try {
        if (typeof navigator === 'undefined' || !navigator.clipboard) {
            throw new Error('不支持剪贴板API');
        }

        const content = await navigator.clipboard.readText();
        return await fromString(content);
    } catch (error) {
        throw new Error(`从剪贴板加载XBEL失败: ${error.message}`);
    }
}

/**
 * 从IndexedDB加载XBEL书签
 * @param {string} dbName - 数据库名称
 * @param {string} storeName - 存储名称
 * @param {string|number} key - 记录键
 * @returns {Promise<RootNode>}
 */
export async function fromIndexedDB(dbName, storeName, key) {
    try {
        if (typeof indexedDB === 'undefined') {
            throw new Error('不支持IndexedDB');
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName);
            
            request.onerror = () => reject(new Error('打开数据库失败'));
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(storeName, 'readonly');
                const store = transaction.objectStore(storeName);
                const getRequest = store.get(key);
                
                getRequest.onerror = () => reject(new Error('读取数据失败'));
                getRequest.onsuccess = () => {
                    const content = getRequest.result;
                    if (!content) {
                        reject(new Error('未找到XBEL数据'));
                        return;
                    }
                    resolve(fromString(content));
                };
            };
        });
    } catch (error) {
        throw new Error(`从IndexedDB加载XBEL失败: ${error.message}`);
    }
}

/**
 * 从拖放事件加载XBEL文件
 * @param {DragEvent} event - 拖放事件对象
 * @returns {Promise<RootNode[]>}
 */
export async function fromDrop(event) {
    try {
        const items = Array.from(event.dataTransfer.items);
        const files = items
            .filter(item => item.kind === 'file')
            .map(item => item.getAsFile())
            .filter(file => file.name.toLowerCase().endsWith('.xbel'));

        return await Promise.all(files.map(file => fromFile(file)));
    } catch (error) {
        throw new Error(`从拖放事件加载XBEL失败: ${error.message}`);
    }
}

/**
 * 从localStorage加载XBEL书签
 * @param {string} key - 存储键
 * @returns {Promise<RootNode>}
 */
export async function fromLocalStorage(key) {
    try {
        if (typeof localStorage === 'undefined') {
            throw new Error('不支持localStorage');
        }

        const content = localStorage.getItem(key);
        if (!content) {
            throw new Error('未找到XBEL数据');
        }

        return await fromString(content);
    } catch (error) {
        throw new Error(`从localStorage加载XBEL失败: ${error.message}`);
    }
}

/**
 * 从Edge导出的HTML加载XBEL书签
 * @param {string} html - Edge导出的书签HTML字符串
 * @returns {Promise<RootNode>}
 */
export async function fromEdgeHTML(html) {
    try {
        const xbelContent = buildXBELFromEdgeHTML(html);
        return await fromString(xbelContent);
    } catch (error) {
        throw new Error(`从Edge HTML加载XBEL失败: ${error.message}`);
    }
}

/**
 * 从Edge HTML文件路径加载XBEL书签
 * @param {string} filePath - Edge书签HTML文件路径
 * @param {string} [encoding='utf-8'] - 文件编码
 * @returns {Promise<RootNode>}
 */
export async function fromEdgeHTMLPath(filePath, encoding = 'utf-8') {
    try {
        // 根据运行环境选择合适的文件读取方式
        let content;
        
        if (typeof window === 'undefined') {
            // Node.js 环境
            const fs = await import('fs/promises');
            content = await fs.readFile(filePath, { encoding });
        } else {
            // 浏览器环境
            const response = await fetch(`file://${filePath}`);
            if (!response.ok) {
                throw new Error(`文件读取失败: ${response.status} ${response.statusText}`);
            }
            content = await response.text();
        }

        // 转换为XBEL格式并解析
        const xbelContent = buildXBELFromEdgeHTML(content);
        return await fromString(xbelContent);
    } catch (error) {
        throw new Error(`从Edge HTML文件加载XBEL失败 (${filePath}): ${error.message}`);
    }
}

// 导出默认对象，包含所有加载方法
export default {
    fromString,
    fromBuffer,
    fromURL,
    fromURLs,
    fromFilePath,
    fromDirectory,
    fromFile,
    fromClipboard,
    fromIndexedDB,
    fromDrop,
    fromLocalStorage,
    fromEdgeHTML,
    fromEdgeHTMLPath,
    isValidXBEL
};
