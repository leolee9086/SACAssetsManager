import { plugin } from "../asyncModules.js";
import {globalKeyboardEvents} from './eventNames.js'
/**
 * 监听全局键盘事件
 */
document.addEventListener('keydown', (event) => {
    // 在这里处理键盘按下事件
    plugin.eventBus.emit(globalKeyboardEvents.globalKeyDown,{
        event,
        key:event.key
    })
});