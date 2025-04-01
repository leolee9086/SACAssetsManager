/**
 * 服务器模块入口
 * 负责初始化和启动整个服务器系统
 * 
 * @version 1.0.0
 * @author SACAssetsManager开发团队
 */

import { 日志 } from '../../../src/toolBox/base/useEcma/forLogs/useLogger.js';
import { initConfig } from '../config/index.js';

/**
 * 服务器启动顺序
 * 1. 初始化配置系统
 * 2. 初始化日志系统
 * 3. 加载预处理模块
 * 4. 初始化服务
 * 5. 启动API服务
 */

// 设置版本和构建信息
const VERSION = '1.0.0';
const BUILD_DATE = new Date().toISOString();

// 导出版本信息
export const versionInfo = {
    version: VERSION,
    buildDate: BUILD_DATE,
    environment: process.env.NODE_ENV || 'development'
};

/**
 * 显示启动信息
 */
const showStartupBanner = () => {
    const bannerText = `
    ┌───────────────────────────────────────┐
    │                                       │
    │       SACAssetsManager Server         │
    │                                       │
    │       Version: ${VERSION.padEnd(20)}  │
    │       Build:   ${BUILD_DATE.substring(0, 10)}        │
    │                                       │
    └───────────────────────────────────────┘
    `;
    
    console.log(bannerText);
};

/**
 * 服务器启动主函数
 */
const startServer = async () => {
    try {
        showStartupBanner();
        日志.信息('服务器启动中...', 'Bootstrap');
        
        日志.信息('初始化配置...', 'Bootstrap');
        await initConfig();
        
        日志.信息('加载初始化模块...', 'Bootstrap');
        await import('./initializer.js');
        
        // 注意：后续步骤将由initializer模块完成
        // 当配置加载完成后，它会自动引入serverStarter.js
        
        日志.信息('初始化流程启动完成', 'Bootstrap');
    } catch (error) {
        日志.错误(`服务器启动失败: ${error.message}`, 'Bootstrap');
        console.error('启动错误详情:', error);
    }
};

// 启动服务器
startServer(); 