/**
 * API服务实现
 * 处理HTTP请求并路由到对应处理器
 */

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import compression from 'compression';
import helmet from 'helmet';
import { 日志 } from '../../../src/toolBox/base/useEcma/forLogs/useLogger.js';
import { getServerConfig } from '../config/server.js';
import { applyRoutes } from './router.js';
import { registerAllRoutes } from './routes.js';

let server = null;
let app = null;

/**
 * 创建并配置Express应用
 * @returns {Object} Express应用实例
 */
const createExpressApp = () => {
  const app = express();
  const config = getServerConfig();
  
  // 设置基本中间件
  app.use(bodyParser.json({ limit: config.limits.bodySize }));
  app.use(bodyParser.urlencoded({ extended: true, limit: config.limits.bodySize }));
  
  // 启用CORS
  if (config.cors?.enabled) {
    app.use(cors({
      origin: config.cors.origin,
      methods: config.cors.methods,
      allowedHeaders: config.cors.headers
    }));
  }
  
  // 启用内容压缩
  app.use(compression());
  
  // 安全设置
  if (config.security?.csp) {
    app.use(helmet());
  }
  
  // 基本请求记录
  app.use((req, res, next) => {
    if (config.logging?.requests) {
      日志.信息(`${req.method} ${req.url}`, 'API');
    }
    next();
  });
  
  return app;
};

/**
 * 启动API服务
 * @returns {Promise<Object>} 服务器实例
 */
export const startAPIService = async () => {
  if (server) {
    日志.警告('API服务已在运行中', 'API');
    return server;
  }
  
  try {
    const config = getServerConfig();
    const port = config.port.api || 3000;
    const host = config.host.api || '127.0.0.1';
    
    // 创建Express应用
    app = createExpressApp();
    
    // 应用路由配置
    applyRoutes(app);
    registerAllRoutes(app);
    
    // 添加404处理
    app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: `未找到路由: ${req.method} ${req.url}`,
        code: 404
      });
    });
    
    // 添加错误处理
    app.use((err, req, res, next) => {
      日志.错误(`API错误: ${err.message}`, 'API');
      
      res.status(err.statusCode || 500).json({
        success: false,
        message: '服务器内部错误',
        error: err.message,
        code: err.statusCode || 500,
        stack: config.logging.level === 'debug' ? err.stack : undefined
      });
    });
    
    // 启动服务器
    server = app.listen(port, host, () => {
      日志.信息(`API服务已启动: http://${host}:${port}`, 'API');
    });
    
    // 错误处理
    server.on('error', (error) => {
      日志.错误(`API服务启动失败: ${error.message}`, 'API');
      server = null;
    });
    
    return server;
  } catch (error) {
    日志.错误(`API服务初始化失败: ${error.message}`, 'API');
    throw error;
  }
};

/**
 * 停止API服务
 * @returns {Promise<void>}
 */
export const stopAPIService = async () => {
  if (!server) {
    日志.警告('API服务未运行', 'API');
    return;
  }
  
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        日志.错误(`API服务关闭失败: ${error.message}`, 'API');
        reject(error);
      } else {
        日志.信息('API服务已关闭', 'API');
        server = null;
        app = null;
        resolve();
      }
    });
  });
};

/**
 * 获取Express应用实例
 * @returns {Object|null} Express应用实例
 */
export const getExpressApp = () => {
  return app;
}; 