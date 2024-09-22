/***
 * 单独创建一个webview用于触发原生拖拽
 */
import { plugin } from '../pluginSymbolRegistry.js';
import { createInvisibleWebview } from '../server/utils/containers/webview.js';
plugin.dragListenerWebview =await createInvisibleWebview(import.meta.resolve('./drag.html'))
