/**
 * 文件系统相关类型定义
 * 使用JSDoc格式定义类型
 */

/**
 * 文件状态对象
 * @typedef {Object} FileStat
 * @property {'file'|'dir'} type - 文件类型，'file'表示文件，'dir'表示目录
 * @property {number} size - 文件大小（字节）
 * @property {Date} birthtime - 文件创建时间
 * @property {Date} mtime - 文件修改时间
 * @property {Date} atime - 文件访问时间
 * @property {Date} ctime - 文件状态更改时间
 */

/**
 * 文件信息对象
 * @typedef {Object} FileInfo
 * @property {string} path - 文件路径
 * @property {string} name - 文件名
 * @property {string} ext - 文件扩展名
 * @property {FileStat} stat - 文件状态
 * @property {boolean} isDirectory - 是否为目录
 * @property {string} [mimeType] - MIME类型（如果是文件）
 * @property {string} [relativePath] - 相对路径
 */

/**
 * 目录树节点
 * @typedef {Object} DirectoryTreeNode
 * @property {string} path - 节点路径
 * @property {string} name - 节点名称
 * @property {'file'|'directory'} type - 节点类型
 * @property {number} [size] - 文件大小（仅文件）
 * @property {string} [ext] - 文件扩展名（仅文件）
 * @property {Date} [mtime] - 修改时间
 * @property {DirectoryTreeNode[]} [children] - 子节点（仅目录）
 */

/**
 * 路径解析结果
 * @typedef {Object} ParsedPath
 * @property {string} root - 根目录
 * @property {string} dir - 目录部分
 * @property {string} base - 基本文件名
 * @property {string} ext - 扩展名
 * @property {string} name - 不含扩展名的文件名
 */

/**
 * 文件操作选项
 * @typedef {Object} FileOperationOptions
 * @property {boolean} [overwrite=false] - 是否覆盖已存在的文件
 * @property {boolean} [recursive=true] - 是否递归处理目录
 * @property {string} [encoding='utf8'] - 文件编码
 * @property {boolean} [preserveTimestamps=false] - 是否保留时间戳
 */

/**
 * 文件系统监视器事件
 * @typedef {'add'|'change'|'unlink'|'addDir'|'unlinkDir'|'error'} WatcherEvent
 */

/**
 * 文件系统监视器选项
 * @typedef {Object} WatchOptions
 * @property {boolean} [persistent=true] - 是否持续监视
 * @property {boolean} [recursive=false] - 是否递归监视子目录
 * @property {number} [interval=100] - 轮询间隔（毫秒）
 * @property {boolean} [ignoreInitial=false] - 是否忽略初始事件
 */

/**
 * 文件系统查找选项
 * @typedef {Object} FindOptions
 * @property {string[]} [extensions] - 要查找的文件扩展名
 * @property {RegExp|string} [pattern] - 文件名匹配模式
 * @property {boolean} [recursive=true] - 是否递归搜索子目录
 * @property {boolean} [includeDirs=false] - 是否包含目录
 * @property {boolean} [includeFiles=true] - 是否包含文件
 * @property {function} [filter] - 自定义过滤函数
 */

/**
 * 文件系统类
 * @interface FileSystem
 */

/**
 * 读取文件内容
 * @function
 * @name FileSystem#readFile
 * @param {string} path - 文件路径
 * @param {Object} [options] - 读取选项
 * @param {string} [options.encoding] - 文件编码
 * @returns {Promise<string|Buffer>} 文件内容
 */

/**
 * 写入文件内容
 * @function
 * @name FileSystem#writeFile
 * @param {string} path - 文件路径
 * @param {string|Buffer} data - 要写入的数据
 * @param {Object} [options] - 写入选项
 * @param {string} [options.encoding] - 文件编码
 * @param {boolean} [options.overwrite] - 是否覆盖已存在的文件
 * @returns {Promise<void>}
 */ 