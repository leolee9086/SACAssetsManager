/***
 * 单独创建一个webview用于触发原生拖拽
 */
import { plugin } from '../pluginSymbolRegistry.js';
import { 创建不可见Webview } from '../../src/toolBox/base/useElectron/forWindow/useWebview.js';
plugin.dragListenerWebview = await 创建不可见Webview(import.meta.resolve('./drag.html'))
