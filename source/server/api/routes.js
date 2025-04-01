/**
 * API路由定义
 * 将处理器与URL路径关联
 */

import { get, post, put, del, createRouteGroup } from './router.js';
import * as fsHandlers from './handlers/fs.js';
import * as thumbnailHandlers from './handlers/thumbnail.js';
import { 日志 } from '../../../src/toolBox/base/useEcma/forLogs/useLogger.js';

// 文件系统路由组
const fsRoutes = createRouteGroup('/fs');

// 文件系统路由
fsRoutes.get('/info', fsHandlers.getFileInfo);
fsRoutes.get('/list', fsHandlers.listDirectory);
fsRoutes.get('/read', fsHandlers.readFile);
fsRoutes.post('/write', fsHandlers.writeFile);
fsRoutes.delete('/remove', fsHandlers.removeFile);
fsRoutes.get('/drives', fsHandlers.listDrives);
fsRoutes.get('/extensions', fsHandlers.getExtensionStats);

// 缩略图路由组
const thumbnailRoutes = createRouteGroup('/thumbnail');

// 缩略图路由
thumbnailRoutes.get('/', thumbnailHandlers.generateThumbnail);
thumbnailRoutes.get('/clear-cache', thumbnailHandlers.clearThumbnailCache);
thumbnailRoutes.post('/upload', thumbnailHandlers.uploadImage);
thumbnailRoutes.get('/formats', thumbnailHandlers.getSupportedFormats);

// 兼容原有路由
// 这些路由可以在迁移完成后逐步替换
get('/raw', fsHandlers.readFile);
get('/thumbnail', thumbnailHandlers.generateThumbnail);

/**
 * 注册所有API路由
 * @param {Object} app - Express应用实例
 */
export const registerAllRoutes = (app) => {
  // 可以在这里添加全局中间件
  
  日志.信息('注册API路由...', 'Router');
  
  // 注册原生Express路由 (可选)
  // 如果需要更复杂的路由定义，可以在这里使用Express原生路由
  
  日志.信息('所有API路由注册完成', 'Router');
}; 