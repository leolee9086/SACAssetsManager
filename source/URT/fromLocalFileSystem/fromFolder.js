const fs = require('fs').promises;
const path = require('path');
import { URTStream } from '../stream/URTStream.js'
import { createFolder, createResource } from '../builder.js'
import { UltraFastFingerprint } from '../../utils/hash/fastBlake.js'

/**
 * 从文件夹创建URT资源流
 * @param {string} folderPath - 文件夹路径
 * @param {Object} options - 配置选项
 * @param {boolean} [options.recursive=true] - 是否递归处理子文件夹
 * @param {string[]} [options.exclude=[]] - 排除的文件/文件夹模式
 * @param {function} [options.filter] - 自定义过滤函数
 * @returns {URTStream}
 */
function fromFolder(folderPath, options = {}) {
  const {
    recursive = true,
    exclude = [],
    filter
  } = options;
  
  const stream = new URTStream();
  const fingerprint = new UltraFastFingerprint();
  
  async function processFolder(currentPath, relativePath = '', parentResource = null) {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      // 创建当前文件夹的资源
      const folderResource = createFolder(
        path.basename(currentPath),
        relativePath,
        { driver: 'local' }
      );
      
      // 设置父子关系
      if (parentResource) {
        folderResource.relations = folderResource.relations || {};
        folderResource.relations.parent = parentResource.meta.id;
        parentResource.children = parentResource.children || [];
        if (!parentResource.children.includes(folderResource)) {
          parentResource.children.push(folderResource);
        }
      }
      
      stream.push(folderResource);
      
      for (const entry of entries) {
        const entryPath = path.join(currentPath, entry.name);
        const entryRelativePath = path.join(relativePath, entry.name);
        
        // 检查是否需要排除
        const shouldExclude = exclude.some(pattern => 
          entryPath.includes(pattern) || 
          entry.name.match(new RegExp(pattern))
        );
        
        if (shouldExclude) continue;
        
        // 应用自定义过滤器
        if (filter && !filter(entryPath, entry)) continue;
        
        if (entry.isDirectory()) {
          if (recursive) {
            await processFolder(entryPath, entryRelativePath, folderResource);
          }
        } else {
          // 处理文件
          const stats = await fs.stat(entryPath);
          const hash = await fingerprint.calculateFingerprint(entryPath);
          
          const fileResource = createResource({
            type: 'file',
            driver: 'local',
            name: entry.name,
            path: entryRelativePath,
            meta: {
              stats: {
                size: stats.size,
                created: stats.birthtime.toISOString(),
                modified: stats.mtime.toISOString(),
                hash: hash
              }
            },
            extra: {
              size: stats.size,
              ext: path.extname(entry.name).slice(1),
              mime: getMimeType(entry.name)
            }
          });
          
          // 设置父子关系
          fileResource.relations = fileResource.relations || {};
          fileResource.relations.parent = folderResource.meta.id;
          folderResource.children = folderResource.children || [];
          if (!folderResource.children.includes(fileResource)) {
            folderResource.children.push(fileResource);
          }
          
          stream.push(fileResource);
        }
      }
    } catch (error) {
      stream.emit('error', error);
    }
  }
  
  // 开始处理文件夹
  processFolder(folderPath)
    .then(() => stream.end())
    .catch(error => stream.emit('error', error));
  
  return stream;
}

/**
 * 简单的MIME类型判断
 * @param {string} filename 
 * @returns {string}
 */
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.md': 'text/markdown'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * 创建文件夹遍历流
 * @param {string} rootPath - 根目录路径
 * @param {Object} options - 配置选项
 * @returns {URTPipeline}
 */
function createFolderStream(rootPath, options = {}) {
  const stream = fromFolder(rootPath, options);
  return pipeline(stream);
}

export{
  fromFolder,
  createFolderStream,
};
