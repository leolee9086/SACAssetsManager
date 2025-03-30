/**
 * 兼容层 - 旧版本引用路径保持不变
 * 
 * @deprecated 请直接使用 src/toolBox/useAge/forSiyuan/useSiyuanTab.js
 */
import { plugin } from "../../asyncModules.js";
import { tabEvents } from "./tabs/events.js";

import { 注册页签事件处理函数 } from "../../../src/toolBox/useAge/forSiyuan/useSiyuanTab.js";

export { tabEvents };

const { eventBus } = plugin;

// 注册页签事件处理函数
注册页签事件处理函数(eventBus, tabEvents, plugin);

console.warn("弃用警告: 直接从 source/UI/siyuanCommon/tabs.js 导入已弃用，请使用 src/toolBox/useAge/forSiyuan/useSiyuanTab.js"); 