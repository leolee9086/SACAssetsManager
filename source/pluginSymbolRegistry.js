const 文件自身地址 = import.meta.url
//这里假定插件实例名与文件夹名称一致,如果你的设计不是这样,可能需要更改这里的代码
let 插件文件夹名 = 文件自身地址.split("plugins")[1].split('/')[1]
const plugin = globalThis.siyuan&&siyuan.ws&&siyuan.ws.app.plugins.find(plugin => { return plugin.name === 插件文件夹名 })
globalThis[Symbol.for(插件文件夹名)]={
    instance:plugin
}
export { plugin }
export { 插件文件夹名 as pluginName }