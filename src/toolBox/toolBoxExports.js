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
export { createEventBus } from './base/forEvent/eventBusTools.js';

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
export * from './useVue/dialogTools.js';

// UI相关工具
export * from './forUI/menus/menuRegister.js';
export * from './forUI/dialog/imagePickerDialog.js';
export * from './forUI/dialog/inputDialog.js';

// 任务队列工具
export * from './base/useEcma/forFunctions/forTaskQueue.js';

// 文件系统工具
export * from './forFileSystem/diskTools.js';

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

// 资产管理工具
export * from './feature/forAssets/forTags.js';
export * from './feature/forAssets/forAssetInfo.js';

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

// 聊天工具
export {
  // 消息创建工具
  创建消息,
  创建用户消息,
  创建助手消息,
  创建系统消息,
  创建错误消息,
  创建流式消息,
  创建投票消息,
  创建共识消息,
  // 英文别名
  createMessage,
  createUserMessage,
  createSystemMessage,
  createAssistantMessage,
  createErrorMessage,
  createStreamMessage,
  createVoteMessage,
  createConsensusMessage
} from './feature/useChat/forMessageCreation.js';

export {
  // 消息格式化工具
  解析思考内容,
  格式化富文本消息,
  处理三贤人响应并转换Think标签,
  // 英文别名
  parseThinkContent,
  formatRichTextMessage,
  processSagesResponsesAndConvertThink
} from './feature/useChat/forMessageFormatting.js';

export {
  // 流处理工具
  处理流式消息,
  简易流处理,
  // 英文别名
  processStreamMessage,
  simpleStreamProcess
} from './feature/useChat/forStreamProcessing.js';

// 思源特定功能工具
import * as useSiyuanMenu from './useAge/forSiyuan/useSiyuanMenu.js';
import * as useSiyuanDialog from './useAge/forSiyuan/useSiyuanDialog.js';
import * as useSiyuanSystem from './useAge/forSiyuan/useSiyuanSystem.js';
import * as useSiyuanBlock from './useAge/forSiyuan/useSiyuanBlock.js';
import * as useSiyuanWorkspace from './useAge/forSiyuan/useSiyuanWorkspace.js';
import * as useSiyuanNotebook from './useAge/forSiyuan/useSiyuanNotebook.js';
import * as useSiyuanAsset from './useAge/forSiyuan/useSiyuanAsset.js';
import * as useSiyuanSlash from './useAge/forSiyuan/useSiyuanSlash.js';
import * as useSiyuanTab from './useAge/forSiyuan/useSiyuanTab.js';

// 导出思源特定功能工具
export {
    useSiyuanMenu,
    useSiyuanDialog,
    useSiyuanSystem,
    useSiyuanBlock,
    useSiyuanWorkspace,
    useSiyuanNotebook,
    useSiyuanAsset,
    useSiyuanSlash,
    useSiyuanTab
};

/**
 * 创建一个默认的事件总线实例
 */
import { createEventBus } from './base/forEvent/eventBusTools.js';
export const defaultEventBus = createEventBus(); 