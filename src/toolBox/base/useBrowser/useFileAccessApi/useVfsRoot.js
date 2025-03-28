import {
  readFile, writeFile, appendFile, unlink, mkdir, rmdir,
  readdir, existsFile, existsDirectory, stat, rename,
  copyFile, getDirectoryTree, createTempFile
} from './useSandboxFS.js';

/**
 * 解析路径并获取目录/文件句柄
 * @param {string} path 路径
 * @param {FileSystemDirectoryHandle} rootHandle 根目录句柄
 * @returns {Promise<FileSystemDirectoryHandle>}
 */
const resolvePath = async (path, rootHandle) => {
  if (!path || path === '/') return rootHandle;
  
  const parts = path.split('/').filter(Boolean);
  let current = rootHandle;
  
  for (let i = 0; i < parts.length - 1; i++) {
    current = await current.getDirectoryHandle(parts[i]);
  }
  
  return current;
};

/**
 * 获取路径的最后一个部分（文件名或目录名）
 * @param {string} path 路径
 * @returns {string} 文件名或目录名
 */
const getLastPathSegment = (path) => {
  const parts = path.split('/').filter(Boolean);
  return parts[parts.length - 1] || '';
};

/**
 * 创建一个虚拟文件系统根实例，后续调用无需重复授权
 * @param {FileSystemDirectoryHandle} rootHandle 已授权的根目录句柄
 * @returns {Object} 虚拟文件系统实例
 */
export const buildVFSRoot = (rootHandle) => {
  if (!rootHandle) {
    throw new Error('必须提供一个有效的目录句柄');
  }

  return {
    readFile: async (path, encoding = 'utf8') => {
      const parent = await resolvePath(path, rootHandle);
      const fileName = getLastPathSegment(path);
      return await readFile(fileName, parent, encoding);
    },
    
    writeFile: async (path, content) => {
      const parent = await resolvePath(path, rootHandle);
      const fileName = getLastPathSegment(path);
      await writeFile(fileName, content, parent);
    },
    
    appendFile: async (path, content) => {
      const parent = await resolvePath(path, rootHandle);
      const fileName = getLastPathSegment(path);
      await appendFile(fileName, content, parent);
    },
    
    unlink: async (path) => {
      const parent = await resolvePath(path, rootHandle);
      const fileName = getLastPathSegment(path);
      await unlink(fileName, parent);
    },
    
    mkdir: async (path, recursive = false) => {
      const parent = await resolvePath(path, rootHandle);
      const dirName = getLastPathSegment(path);
      await mkdir(dirName, parent, recursive);
    },
    
    rmdir: async (path) => {
      const parent = await resolvePath(path, rootHandle);
      const dirName = getLastPathSegment(path);
      await rmdir(dirName, parent);
    },
    
    readdir: async (path) => {
      const dirHandle = path ? await resolvePath(path, rootHandle) : rootHandle;
      return await readdir(dirHandle);
    },
    
    existsFile: async (path) => {
      const parent = await resolvePath(path, rootHandle);
      const fileName = getLastPathSegment(path);
      return await existsFile(fileName, parent);
    },
    
    existsDirectory: async (path) => {
      const parent = await resolvePath(path, rootHandle);
      const dirName = getLastPathSegment(path);
      return await existsDirectory(dirName, parent);
    },
    
    stat: async (path) => {
      const parent = await resolvePath(path, rootHandle);
      const name = getLastPathSegment(path);
      return await stat(name, parent);
    },
    
    rename: async (oldPath, newPath) => {
      const parent = await resolvePath(oldPath, rootHandle);
      const oldName = getLastPathSegment(oldPath);
      const newName = getLastPathSegment(newPath);
      await rename(oldName, newName, parent);
    },
    
    copyFile: async (srcPath, destPath) => {
      const srcParent = await resolvePath(srcPath, rootHandle);
      const destParent = await resolvePath(destPath, rootHandle);
      const srcName = getLastPathSegment(srcPath);
      const destName = getLastPathSegment(destPath);
      await copyFile(srcName, destName, srcParent, destParent);
    },
    
    getDirectoryTree: async (path = '', depth = Infinity) => {
      const dirHandle = path ? await resolvePath(path, rootHandle) : rootHandle;
      return await getDirectoryTree(dirHandle, depth);
    },
    
    getRootHandle: () => rootHandle,
    
    createTempFile: async (prefix) => {
      return await createTempFile(prefix, rootHandle);
    }
  };
}; 