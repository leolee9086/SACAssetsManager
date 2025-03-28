/**
 * 浏览器沙盒文件系统访问模块
 * 
 * 提供基于浏览器 File System Access API 的封装，模拟 Node.js fs 模块的常用方法
 * 允许在浏览器环境中安全地读写用户选择的目录内容
 * 
 * 主要功能：
 * - 请求用户目录访问权限
 * - 文件和目录的创建/读取/写入/删除
 * - 目录内容遍历
 * - 文件状态查询
 * 
 * 使用示例：
 * const dirHandle = await requestPermission();
 * await writeFile('test.txt', 'Hello World', dirHandle);
 * const content = await readFile('test.txt', dirHandle);
 * 
 * 注意事项：
 * - 所有操作都需要用户先授权目录访问权限
 * - 路径参数都是相对于已授权目录的相对路径
 * - 部分方法支持直接传入文件/目录句柄
 */

/**
 * 请求文件系统访问权限
 * @returns {Promise<FileSystemDirectoryHandle>}
 */
export const requestPermission = async () => {
  return await window.showDirectoryPicker({
    mode: 'readwrite'
  });
};

/**
 * 读取文件内容 (类似 fs.readFile)
 * @param {string|FileSystemFileHandle} pathOrHandle 文件路径或句柄
 * @param {FileSystemDirectoryHandle} [dirHandle] 当第一个参数是路径时需要
 * @param {string} [encoding='utf8'] 编码格式
 * @returns {Promise<string|ArrayBuffer>}
 */
export const readFile = async (pathOrHandle, dirHandle, encoding = 'utf8') => {
  const fileHandle = typeof pathOrHandle === 'string' 
    ? await dirHandle.getFileHandle(pathOrHandle)
    : pathOrHandle;
  const file = await fileHandle.getFile();
  return encoding === 'utf8' 
    ? await file.text() 
    : await file.arrayBuffer();
};

/**
 * 写入文件内容 (类似 fs.writeFile)
 * @param {string|FileSystemFileHandle} pathOrHandle 文件路径或句柄
 * @param {string|ArrayBuffer|Blob} content 要写入的内容
 * @param {FileSystemDirectoryHandle} [dirHandle] 当第一个参数是路径时需要
 */
export const writeFile = async (pathOrHandle, content, dirHandle) => {
  const fileHandle = typeof pathOrHandle === 'string'
    ? await dirHandle.getFileHandle(pathOrHandle, { create: true })
    : pathOrHandle;
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
};

/**
 * 创建或获取文件句柄
 * @param {FileSystemDirectoryHandle} dirHandle 
 * @param {string} fileName 
 * @returns {Promise<FileSystemFileHandle>}
 */
export const getFileHandle = async (dirHandle, fileName) => {
  return await dirHandle.getFileHandle(fileName, { create: true });
};

/**
 * 创建或获取目录句柄
 * @param {FileSystemDirectoryHandle} dirHandle 
 * @param {string} dirName 
 * @returns {Promise<FileSystemDirectoryHandle>}
 */
export const getDirectoryHandle = async (dirHandle, dirName) => {
  return await dirHandle.getDirectoryHandle(dirName, { create: true });
};

/**
 * 删除文件 (类似 fs.unlink)
 * @param {string} path 文件路径
 * @param {FileSystemDirectoryHandle} dirHandle 目录句柄
 */
export const unlink = async (path, dirHandle) => {
  await dirHandle.removeEntry(path);
};

/**
 * 删除目录 (类似 fs.rmdir)
 * @param {string} path 目录路径
 * @param {FileSystemDirectoryHandle} dirHandle 父目录句柄
 */
export const rmdir = async (path, dirHandle) => {
  await dirHandle.removeEntry(path, { recursive: true });
};

/**
 * 读取目录内容 (类似 fs.readdir)
 * @param {FileSystemDirectoryHandle} dirHandle 目录句柄
 * @returns {Promise<Array<{name: string, kind: 'file'|'directory'}>>}
 */
export const readdir = async (dirHandle) => {
  const items = [];
  for await (const [name, handle] of dirHandle.entries()) {
    items.push({
      name,
      kind: handle.kind
    });
  }
  return items;
};

/**
 * 检查文件是否存在
 * @param {string} path 文件路径
 * @param {FileSystemDirectoryHandle} dirHandle 目录句柄
 * @returns {Promise<boolean>}
 */
export const existsFile = async (path, dirHandle) => {
  try {
    await dirHandle.getFileHandle(path);
    return true;
  } catch {
    return false;
  }
};

/**
 * 检查目录是否存在
 * @param {string} path 目录路径
 * @param {FileSystemDirectoryHandle} dirHandle 目录句柄
 * @returns {Promise<boolean>}
 */
export const existsDirectory = async (path, dirHandle) => {
  try {
    await dirHandle.getDirectoryHandle(path);
    return true;
  } catch {
    return false;
  }
};

/**
 * 获取文件信息
 * @param {string|FileSystemFileHandle} pathOrHandle 文件路径或句柄
 * @param {FileSystemDirectoryHandle} [dirHandle] 当第一个参数是路径时需要
 * @returns {Promise<{name: string, lastModified: number, size: number}>}
 */
export const stat = async (pathOrHandle, dirHandle) => {
  const fileHandle = typeof pathOrHandle === 'string' 
    ? await dirHandle.getFileHandle(pathOrHandle)
    : pathOrHandle;
  const file = await fileHandle.getFile();
  return {
    name: file.name,
    lastModified: file.lastModified,
    size: file.size
  };
};

/**
 * 创建目录 (类似 fs.mkdir)
 * @param {string} path 目录路径
 * @param {FileSystemDirectoryHandle} dirHandle 父目录句柄
 * @param {boolean} [recursive=false] 是否递归创建
 */
export const mkdir = async (path, dirHandle, recursive = false) => {
  const parts = path.split('/');
  let currentDir = dirHandle;
  
  for (const part of parts) {
    if (!part) continue;
    try {
      currentDir = await currentDir.getDirectoryHandle(part, { create: true });
    } catch (error) {
      if (!recursive) throw error;
      currentDir = await currentDir.getDirectoryHandle(part, { create: true });
    }
  }
};


/**
 * 获取文件或目录句柄（内部辅助函数）
 * @param {string} path 路径
 * @param {FileSystemDirectoryHandle} dirHandle 目录句柄
 * @returns {Promise<FileSystemHandle>}
 */
const _getHandle = async (path, dirHandle) => {
  try {
    return await dirHandle.getFileHandle(path);
  } catch {
    return await dirHandle.getDirectoryHandle(path);
  }
};

/**
 * 重命名文件或目录 (类似 fs.rename)
 * @param {string} oldPath 原路径
 * @param {string} newPath 新路径
 * @param {FileSystemDirectoryHandle} dirHandle 目录句柄
 */
export const rename = async (oldPath, newPath, dirHandle) => {
  const oldHandle = await _getHandle(oldPath, dirHandle);
  const content = oldHandle.kind === 'file' 
    ? await readFile(oldHandle)
    : null;
  
  await unlink(oldPath, dirHandle);
  
  if (oldHandle.kind === 'file') {
    await writeFile(newPath, content, dirHandle);
  } else {
    await mkdir(newPath, dirHandle);
  }
};
/**
 * 复制文件
 * @param {string} srcPath 源文件路径
 * @param {string} destPath 目标文件路径
 * @param {FileSystemDirectoryHandle} dirHandle 目录句柄
 */
export const copyFile = async (srcPath, destPath, dirHandle) => {
  const content = await readFile(srcPath, dirHandle);
  await writeFile(destPath, content, dirHandle);
};

/**
 * 复制目录 (递归)
 * @param {string} srcPath 源目录路径
 * @param {string} destPath 目标目录路径
 * @param {FileSystemDirectoryHandle} dirHandle 目录句柄
 */
export const copyDirectory = async (srcPath, destPath, dirHandle) => {
  const srcDir = await dirHandle.getDirectoryHandle(srcPath);
  await mkdir(destPath, dirHandle, true);
  const destDir = await dirHandle.getDirectoryHandle(destPath);
  
  for await (const [name, handle] of srcDir.entries()) {
    const newPath = `${destPath}/${name}`;
    if (handle.kind === 'file') {
      await copyFile(`${srcPath}/${name}`, newPath, dirHandle);
    } else {
      await copyDirectory(`${srcPath}/${name}`, newPath, dirHandle);
    }
  }
};

/**
 * 移动文件或目录
 * @param {string} oldPath 原路径
 * @param {string} newPath 新路径
 * @param {FileSystemDirectoryHandle} dirHandle 目录句柄
 */
export const move = async (oldPath, newPath, dirHandle) => {
  await rename(oldPath, newPath, dirHandle);
};

/**
 * 获取文件或目录的绝对路径
 * @param {FileSystemHandle} handle 文件或目录句柄
 * @returns {Promise<string>} 绝对路径
 */
export const getAbsolutePath = async (handle) => {
  return handle.name;
};

/**
 * 判断是否具有读写权限
 * @param {FileSystemHandle} handle 文件或目录句柄
 * @returns {Promise<boolean>} 是否有权限
 */
export const hasPermission = async (handle) => {
  const options = { mode: 'readwrite' };
  return await handle.queryPermission(options) === 'granted';
};

/**
 * 请求文件或目录的读写权限
 * @param {FileSystemHandle} handle 文件或目录句柄
 * @returns {Promise<boolean>} 是否获取到权限
 */
export const requestHandlePermission = async (handle) => {
  const options = { mode: 'readwrite' };
  return await handle.requestPermission(options) === 'granted';
};

/**
 * 追加内容到文件 (类似 fs.appendFile)
 * @param {string|FileSystemFileHandle} pathOrHandle 文件路径或句柄
 * @param {string|ArrayBuffer|Blob} content 要追加的内容
 * @param {FileSystemDirectoryHandle} [dirHandle] 当第一个参数是路径时需要
 */
export const appendFile = async (pathOrHandle, content, dirHandle) => {
  const fileHandle = typeof pathOrHandle === 'string'
    ? await dirHandle.getFileHandle(pathOrHandle, { create: true })
    : pathOrHandle;
  
  const existingContent = await readFile(fileHandle);
  const newContent = existingContent + content;
  
  const writable = await fileHandle.createWritable();
  await writable.write(newContent);
  await writable.close();
};

/**
 * 读取文件的指定部分内容
 * @param {string|FileSystemFileHandle} pathOrHandle 文件路径或句柄
 * @param {number} start 开始位置
 * @param {number} end 结束位置
 * @param {FileSystemDirectoryHandle} [dirHandle] 当第一个参数是路径时需要
 * @returns {Promise<string|ArrayBuffer>}
 */
export const readFileSlice = async (pathOrHandle, start, end, dirHandle, encoding = 'utf8') => {
  const fileHandle = typeof pathOrHandle === 'string' 
    ? await dirHandle.getFileHandle(pathOrHandle)
    : pathOrHandle;
  const file = await fileHandle.getFile();
  const slice = file.slice(start, end);
  
  return encoding === 'utf8' 
    ? await slice.text() 
    : await slice.arrayBuffer();
};

/**
 * 批量处理多个文件
 * @param {Array<string>} paths 文件路径数组
 * @param {Function} operation 对每个文件执行的操作函数
 * @param {FileSystemDirectoryHandle} dirHandle 目录句柄
 * @returns {Promise<Array>} 每个文件操作的结果数组
 */
export const batchProcess = async (paths, operation, dirHandle) => {
  return Promise.all(paths.map(path => operation(path, dirHandle)));
};

/**
 * 创建临时文件
 * @param {string} prefix 文件名前缀
 * @param {FileSystemDirectoryHandle} dirHandle 目录句柄
 * @returns {Promise<{name: string, handle: FileSystemFileHandle}>}
 */
export const createTempFile = async (prefix, dirHandle) => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  const fileName = `${prefix}_${timestamp}_${random}.tmp`;
  const fileHandle = await getFileHandle(dirHandle, fileName);
  return { name: fileName, handle: fileHandle };
};

/**
 * 将内容保存为下载文件（不需要权限）
 * @param {string} fileName 文件名
 * @param {string|Blob} content 文件内容
 */
export const saveAsDownload = (fileName, content) => {
  const blob = typeof content === 'string' ? new Blob([content], { type: 'text/plain' }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

/**
 * 获取文件的MIME类型
 * @param {string|FileSystemFileHandle} pathOrHandle 文件路径或句柄
 * @param {FileSystemDirectoryHandle} [dirHandle] 当第一个参数是路径时需要
 * @returns {Promise<string>} MIME类型
 */
export const getMimeType = async (pathOrHandle, dirHandle) => {
  const fileHandle = typeof pathOrHandle === 'string' 
    ? await dirHandle.getFileHandle(pathOrHandle)
    : pathOrHandle;
  const file = await fileHandle.getFile();
  return file.type || inferMimeTypeFromName(file.name);
};

/**
 * 根据文件名推断MIME类型
 * @param {string} fileName 文件名
 * @returns {string} 推断的MIME类型
 */
const inferMimeTypeFromName = (fileName) => {
  const ext = fileName.split('.').pop().toLowerCase();
  const mimeTypes = {
    'txt': 'text/plain',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'text/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'mp3': 'audio/mpeg',
    'mp4': 'video/mp4'
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

/**
 * 获取目录树结构
 * @param {FileSystemDirectoryHandle} dirHandle 目录句柄
 * @param {number} [depth=Infinity] 遍历深度
 * @returns {Promise<Object>} 目录树结构
 */
export const getDirectoryTree = async (dirHandle, depth = Infinity) => {
  if (depth <= 0) return { name: dirHandle.name, type: 'directory', children: [] };
  
  const children = [];
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === 'file') {
      const file = await handle.getFile();
      children.push({
        name,
        type: 'file',
        size: file.size,
        lastModified: file.lastModified
      });
    } else {
      children.push(await getDirectoryTree(handle, depth - 1));
    }
  }
  
  return {
    name: dirHandle.name,
    type: 'directory',
    children
  };
};

/**
 * 将内容写入指定位置（部分更新文件）
 * @param {string|FileSystemFileHandle} pathOrHandle 文件路径或句柄
 * @param {string|ArrayBuffer|Blob} content 要写入的内容
 * @param {number} position 写入位置
 * @param {FileSystemDirectoryHandle} [dirHandle] 当第一个参数是路径时需要
 */
export const writeFileAt = async (pathOrHandle, content, position, dirHandle) => {
  const fileHandle = typeof pathOrHandle === 'string'
    ? await dirHandle.getFileHandle(pathOrHandle, { create: true })
    : pathOrHandle;
  const writable = await fileHandle.createWritable({ keepExistingData: true });
  await writable.seek(position);
  await writable.write(content);
  await writable.close();
};

/**
 * 检查浏览器是否支持文件系统访问API
 * @returns {boolean} 是否支持
 */
export const isFileSystemAccessSupported = () => {
  return 'showDirectoryPicker' in window && 
         'showOpenFilePicker' in window && 
         'showSaveFilePicker' in window;
};

/**
 * 选择单个文件
 * @param {Object} [options] 选项
 * @param {Array<Object>} [options.types] 允许的文件类型
 * @param {boolean} [options.multiple=false] 是否允许多选
 * @returns {Promise<FileSystemFileHandle|FileSystemFileHandle[]>}
 */
export const showFilePicker = async (options = {}) => {
  const pickerOptions = {
    types: options.types || [],
    multiple: options.multiple || false
  };
  
  const handles = await window.showOpenFilePicker(pickerOptions);
  return options.multiple ? handles : handles[0];
};

/**
 * 保存文件对话框
 * @param {string|Blob} content 要保存的内容
 * @param {Object} [options] 选项
 * @returns {Promise<void>}
 */
export const showSaveFilePicker = async (content, options = {}) => {
  const handle = await window.showSaveFilePicker(options);
  await writeFile(handle, content);
  return handle;
};

/**
 * 监听文件变化
 * @param {string} path 文件路径
 * @param {FileSystemDirectoryHandle} dirHandle 目录句柄
 * @param {Function} callback 变化回调函数
 */
export const watchFile = async (path, dirHandle, callback) => {
  let lastModified = (await stat(path, dirHandle)).lastModified;
  
  const checkChanges = async () => {
    const stats = await stat(path, dirHandle);
    if (stats.lastModified !== lastModified) {
      lastModified = stats.lastModified;
      callback(stats);
    }
  };

  // 定期检查文件变化
  setInterval(checkChanges, 1000);
};

/**
 * 创建可读流
 * @param {string} path 文件路径
 * @param {FileSystemDirectoryHandle} dirHandle 目录句柄
 * @returns {ReadableStream}
 */
export const createReadStream = async (path, dirHandle) => {
  const fileHandle = await dirHandle.getFileHandle(path);
  const file = await fileHandle.getFile();
  return file.stream();
};

/**
 * 流式写入
 * @param {string} path 文件路径
 * @param {ReadableStream} stream 可读流
 * @param {FileSystemDirectoryHandle} dirHandle 目录句柄
 */
export const writeStream = async (path, stream, dirHandle) => {
  const fileHandle = await dirHandle.getFileHandle(path, { create: true });
  const writable = await fileHandle.createWritable();
  await stream.pipeTo(writable);
};

/**
 * 压缩文件
 * @param {string} path 文件路径
 * @param {FileSystemDirectoryHandle} dirHandle 目录句柄
 * @returns {Promise<Blob>} 压缩后的数据
 */
export const compressFile = async (path, dirHandle) => {
  const content = await readFile(path, dirHandle);
  // 使用 CompressionStream API
  const cs = new CompressionStream('gzip');
  const writer = cs.writable.getWriter();
  await writer.write(content);
  await writer.close();
  return new Response(cs.readable).blob();
};

/**
 * 计算文件哈希值
 * @param {string} path 文件路径
 * @param {FileSystemDirectoryHandle} dirHandle 目录句柄
 * @returns {Promise<string>} 哈希值
 */
export const getFileHash = async (path, dirHandle) => {
  const buffer = await readFile(path, dirHandle, 'arraybuffer');
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};
