class SandboxFS {
  /**
   * 请求文件系统访问权限
   * @returns {Promise<FileSystemDirectoryHandle>}
   */
  static async requestPermission() {
    return await window.showDirectoryPicker({
      mode: 'readwrite'
    });
  }

  /**
   * 读取文件内容 (类似 fs.readFile)
   * @param {string|FileSystemFileHandle} pathOrHandle 文件路径或句柄
   * @param {FileSystemDirectoryHandle} [dirHandle] 当第一个参数是路径时需要
   * @returns {Promise<string>}
   */
  static async readFile(pathOrHandle, dirHandle) {
    const fileHandle = typeof pathOrHandle === 'string' 
      ? await dirHandle.getFileHandle(pathOrHandle)
      : pathOrHandle;
    const file = await fileHandle.getFile();
    return await file.text();
  }

  /**
   * 写入文件内容 (类似 fs.writeFile)
   * @param {string|FileSystemFileHandle} pathOrHandle 文件路径或句柄
   * @param {string} content 要写入的内容
   * @param {FileSystemDirectoryHandle} [dirHandle] 当第一个参数是路径时需要
   */
  static async writeFile(pathOrHandle, content, dirHandle) {
    const fileHandle = typeof pathOrHandle === 'string'
      ? await dirHandle.getFileHandle(pathOrHandle, { create: true })
      : pathOrHandle;
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  /**
   * 创建或获取文件句柄
   * @param {FileSystemDirectoryHandle} dirHandle 
   * @param {string} fileName 
   * @returns {Promise<FileSystemFileHandle>}
   */
  static async getFileHandle(dirHandle, fileName) {
    return await dirHandle.getFileHandle(fileName, { create: true });
  }

  /**
   * 创建或获取目录句柄
   * @param {FileSystemDirectoryHandle} dirHandle 
   * @param {string} dirName 
   * @returns {Promise<FileSystemDirectoryHandle>}
   */
  static async getDirectoryHandle(dirHandle, dirName) {
    return await dirHandle.getDirectoryHandle(dirName, { create: true });
  }

  /**
   * 删除文件 (类似 fs.unlink)
   * @param {string} path 文件路径
   * @param {FileSystemDirectoryHandle} dirHandle 目录句柄
   */
  static async unlink(path, dirHandle) {
    await dirHandle.removeEntry(path);
  }

  /**
   * 删除目录 (类似 fs.rmdir)
   * @param {string} path 目录路径
   * @param {FileSystemDirectoryHandle} dirHandle 父目录句柄
   */
  static async rmdir(path, dirHandle) {
    await dirHandle.removeEntry(path, { recursive: true });
  }

  /**
   * 读取目录内容 (类似 fs.readdir)
   * @param {FileSystemDirectoryHandle} dirHandle 目录句柄
   * @returns {Promise<Array<{name: string, kind: 'file'|'directory'}>>}
   */
  static async readdir(dirHandle) {
    const items = [];
    for await (const [name, handle] of dirHandle.entries()) {
      items.push({
        name,
        kind: handle.kind
      });
    }
    return items;
  }
}

export default SandboxFS;