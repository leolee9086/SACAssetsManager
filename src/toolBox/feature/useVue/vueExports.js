/**
 * Vue功能导出
 * 
 * 提供Vue相关工具的集中导出
 */

import { 
  initVueApp, 
  createVueInterface, 
  clearComponentCache, 
  cc, 
  loadVueComponentAsNodeSync,
  initViteEnvironment,
  isViteModeSupported,
  configureViteMode
} from './vueComponentLoader.js';

// 从useSFC模块导入Vite模式
import { 初始化Vite模式, 创建运行时编译器, 创建开发服务器, 创建依赖预处理器 } from './useSFC/forViteMode.js';

// 从ViteModeTester模块导入Vite模式修复工具
import { testViteMode, testPathExtension, batchTest, getViteModeConfig, addToBlacklist, fixAssetInfoPanelPath, 自动修复已知组件路径 } from './ViteModeTester.js';

// 导出Vue相关工具
export {
  // 基本加载工具
  initVueApp,
  createVueInterface,
  clearComponentCache,
  cc,
  loadVueComponentAsNodeSync,
  
  // Vite模式工具
  初始化Vite模式 as initViteMode,
  创建运行时编译器 as createRuntimeCompiler,
  创建开发服务器 as createDevServer,
  创建依赖预处理器 as createDepsProcessor,
  initViteEnvironment,
  isViteModeSupported,
  configureViteMode,
  
  // Vite模式修复工具
  testViteMode,
  testPathExtension,
  batchTest,
  getViteModeConfig,
  addToBlacklist,
  fixAssetInfoPanelPath,
  自动修复已知组件路径
};

// 默认导出
export default {
  initVueApp,
  createVueInterface,
  clearComponentCache,
  cc,
  loadVueComponentAsNodeSync,
  
  // Vite模式
  initViteMode: 初始化Vite模式,
  createRuntimeCompiler: 创建运行时编译器,
  createDevServer: 创建开发服务器,
  createDepsProcessor: 创建依赖预处理器,
  initViteEnvironment,
  isViteModeSupported,
  configureViteMode,
  
  // Vite模式修复工具
  testViteMode,
  testPathExtension,
  batchTest,
  getViteModeConfig,
  addToBlacklist,
  fixAssetInfoPanelPath,
  自动修复已知组件路径
}; 