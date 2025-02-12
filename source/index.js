/**
 * 插件的异步主模块,凡是能够异步定义的都在此进行
 */

import { plugin } from "./pluginSymbolRegistry.js";
//添加图标
import './UI/icons/addIcon.js'
//创建全局串状态
import './globalStatus/index.js'
//用于拖拽的webview
import './utilWebviews/drag.js'
//开始监听事件
import './events/globalEvents.js'

import './noteChat/index.js'
/***
 * 测试部分
 */
// 引入 HalfHeightDecorator 模块以激活浮动按钮
//import './UI/dynamicCss/HalfHeightDecorator.js';
