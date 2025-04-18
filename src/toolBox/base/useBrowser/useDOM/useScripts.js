/**
 * 同步加载并执行JavaScript脚本
 * @param {string} path - 脚本文件的路径
 * @param {string} id - 要赋予脚本元素的ID
 * @returns {boolean} 是否成功加载脚本(如果已存在相同ID的脚本则返回false)
 */
export const addScriptSync = (path, id) => {
    if (document.getElementById(id)) {
        return false;
    }
    const xhrObj = new XMLHttpRequest();
    xhrObj.open("GET", path, false);
    xhrObj.setRequestHeader("Accept",
        "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript, */*; q=0.01");
    xhrObj.send("");
    const scriptElement = document.createElement("script");
    scriptElement.type = "text/javascript";
    scriptElement.text = xhrObj.responseText;
    scriptElement.id = id;
    document.head.appendChild(scriptElement);
};

/**
 * 异步加载并执行JavaScript脚本
 * @param {string} path - 脚本文件的路径
 * @param {string} id - 要赋予脚本元素的ID
 * @returns {Promise<boolean>} 返回Promise，解析为是否成功加载脚本(如果已存在相同ID的脚本则解析为false)
 */
export const addScript = (path, id) => {
    return new Promise((resolve) => {
        if (document.getElementById(id)) {
            // 脚本加载后再次调用直接返回
            resolve(false);
            return false;
        }
        const scriptElement = document.createElement("script");
        scriptElement.src = path;
        scriptElement.async = true;
        // 循环调用时 Chrome 不会重复请求 js
        document.head.appendChild(scriptElement);
        scriptElement.onload = () => {
            if (document.getElementById(id)) {
                // 循环调用需清除 DOM 中的 script 标签
                scriptElement.remove();
                resolve(false);
                return false;
            }
            scriptElement.id = id;
            resolve(true);
        };
    });
};

/**
 * 异步加载并应用CSS样式表
 * @param {string} path - 样式表文件的路径
 * @param {string} id - 要赋予link元素的ID
 * @returns {Promise<boolean>} 返回Promise，解析为是否成功加载样式表(如果已存在相同ID的样式表则解析为false)
 */
export const addStylesheet = (path, id) => {
    return new Promise((resolve) => {
        if (document.getElementById(id)) {
            // 样式表加载后再次调用直接返回
            resolve(false);
            return; // return false 在 Promise 构造函数中没有意义
        }
        const linkElement = document.createElement("link");
        linkElement.rel = "stylesheet";
        linkElement.type = "text/css";
        linkElement.href = path;
        linkElement.id = id; // 设置 ID 以便检查重复
        linkElement.onload = () => {
            // 确保 ID 已设置，即使是重复加载（虽然上面的检查应该阻止这种情况）
            if (!document.getElementById(id)) {
               linkElement.id = id;
            }
            resolve(true);
        };
        linkElement.onerror = () => {
             console.error(`Failed to load stylesheet: ${path}`);
             linkElement.remove(); // 加载失败时移除元素
             resolve(false); // 解析为 false 表示加载失败
        }
        document.head.appendChild(linkElement);
    });
};