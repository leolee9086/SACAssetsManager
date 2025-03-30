/**
 * 兼容层 - 旧版本引用路径保持不变
 * 
 * @deprecated 请直接使用 src/toolBox 下的相应模块
 */

import './slash.js'
import './menus.js'
import './tabs.js'

console.warn('弃用警告: 直接从 source/UI/siyuanCommon/ 导入已弃用，请使用 src/toolBox 下的相应模块');

/**
 * shell相关事件和shell项定义
 */
import  './shell.js'