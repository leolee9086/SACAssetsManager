/**
 * 工具箱导出模块
 * 
 * 为整个工具箱提供统一的导出接口，便于使用者访问各种工具。
 * 推荐直接导入所需的特定工具函数，而不是整个模块。
 */

// MIME相关工具
export * from './forMime/getMimeTypeInfo.js';
export * from './forMime/mimeTypeTools.js';
export * from './forMime/mimeUsageTools.js';

// 事件相关工具
export { createEventBus } from './forEvent/eventBusTools.js';

// 平台检测和文本处理工具
export * from './usePolyfills/getPlatformInfo.js';
export * from './usePolyfills/getTextProcessor.js';
export * from './usePolyfills/platformDetection.js';
export * from './usePolyfills/browserDetection.js';
export * from './usePolyfills/osDetection.js';
export * from './usePolyfills/uaParserTools.js';
export * from './usePolyfills/uaAnalysis.js';

// Vue相关工具
export * from './useVue/vueComponentLoader.js';

// 文件处理工具
export * from './base/useEcma/forFile/globTools.js';
export * from './base/useEcma/forFile/forFilePath.js';
export * from './base/useEcma/forFile/forFileSize.js';
export * from './base/useEcma/forFile/forFileRead.js';

// 网络工具
export * from './base/forNetWork/forFetch/index.js';
export * from './base/forNetWork/forPort/forPortAvailability.js';
export * from './base/forNetWork/forPort/forPortValidation.js';
export * from './base/forNetWork/forPort/forPortRecord.js';
export * from './base/forNetWork/forPort/forSiyuanPort.js';
export * from './base/forNetWork/forSiyuanApi/index.js';

// 基础文本工具
export * from './base/useEcma/textTools.js';
export * from './base/useEcma/forString/forSearch.js';
export * from './base/useEcma/forString/forTransform.js';
export * from './base/useEcma/forString/forHtmlProcessing.js';

// 依赖管理工具
export * from './base/useDeps/licensesTools.js';
export * from './base/useDeps/pinyinTools.js';

// 图像处理工具
export * from './feature/useImage/imageToolBox.js';

// 思源笔记环境工具
export * from './useAge/useSiyuan.js';

// Canvas工具
export {
    CanvasProcessor,
    从Blob创建图像,
    加载图像,
    从SVG创建图像,
    从二进制数据创建图像,
    创建Canvas处理器,
    // 英文别名
    createImageFromBlob,
    loadImage,
    createImageFromSVG,
    createImageFromBinaryData,
    createProcessor
} from './base/useBrowser/useCanvas/index.js';

/**
 * 创建一个默认的事件总线实例
 */
import { createEventBus } from './forEvent/eventBusTools.js';
export const defaultEventBus = createEventBus(); 