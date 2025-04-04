/**
 * base目录集中导出文件
 * 
 * 提供基础工具层次的统一导出接口,便于其他模块引入使用
 * 推荐直接导入所需的特定工具函数,而不是整个模块
 */

// forCore 核心功能导出
export * from './forCore/index.js';

// forEvent 事件相关工具
export * from './forEvent/eventExports.js';
export { createEventBus } from './forEvent/eventBusTools.js';

// forMime MIME相关工具
export * from './forMime/mimeExports.js';

// forNetWork 网络相关工具
export * from './forNetWork/forFetch/index.js';
export * from './forNetWork/forPort/forPortAvailability.js';
export * from './forNetWork/forPort/forPortValidation.js';
export * from './forNetWork/forPort/forPortRecord.js';
export * from './forNetWork/forPort/forSiyuanPort.js';
export * from './forNetWork/forSiyuanApi/index.js';

// forUI UI相关工具
export * from './forUI/index.js';

// useEcma ECMA标准相关工具
export * from './useEcma/textTools.js';
export * from './useEcma/forString/forSearch.js';
export * from './useEcma/forString/forTransform.js';
export * from './useEcma/forString/forHtmlProcessing.js';
export * from './useEcma/forFile/globTools.js';
export * from './useEcma/forFile/forFilePath.js';
export * from './useEcma/forFile/forFileSize.js';
export * from './useEcma/forFile/forFileRead.js';
export * from './useEcma/forFunctions/forTaskQueue.js';
export * from './useEcma/forLogs/useLogger.js';
export * from './useEcma/forCrypto/forHash/computeMd5Hash.js';
export * from './useEcma/forCrypto/forCache/useCacheProvider.js';

// useBrowser 浏览器相关工具
export * from './useBrowser/forIdle/idleQueueTools.js';
export * from './useBrowser/useCanvas/index.js';

// useElectron Electron相关工具
export * from './useElectron/useHeartBeat.js';
export * from './useElectron/forCSharp/useCSharpLoader.js';
export * from './useElectron/forWindow/useBrowserWindow.js';
export * from './useElectron/forWindow/useWebview.js';

// useEnv 环境相关工具
export * from './useEnv/index.js';

// useMime MIME处理工具
export * from './useMime/index.js';

// useModules 模块化工具
export * from './useModules/index.js';

// useNode Node.js相关工具
export * from './useNode/index.js';

// useNative 原生功能交互工具
export * from './useNative/index.js';

// usePolyfills 兼容性工具
export * from './usePolyfills/polyfillExports.js';
export * from './usePolyfills/getPlatformInfo.js';
export * from './usePolyfills/getTextProcessor.js';
export * from './usePolyfills/platformDetection.js';
export * from './usePolyfills/browserDetection.js';
export * from './usePolyfills/osDetection.js';
export * from './usePolyfills/uaParserTools.js';
export * from './usePolyfills/uaAnalysis.js';

// useDeps 依赖管理工具
export * from './useDeps/licensesTools.js';
export * from './useDeps/pinyinTools.js';

// useUtils 通用工具
export * from './useUtils/index.js'; 