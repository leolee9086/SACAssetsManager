import { plugin } from '../asyncModules.js'
export function 打开附件右键菜单(event, assets) {
    plugin.emitEvent(plugin.events.资源界面项目右键, { event, assets }, { stack: true })
}
