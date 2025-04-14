   // 获取其他插件实例的函数
const 是否位于思源环境 = ()=>{
    return siyuan.ws.app.plugins
}
if(!是否位于思源环境()){
    throw new Error('当前环境不是思源环境,不能使用此功能')
}
export const getPluginByName = (pluginName) => {
  // 首先从新路径查找
  if (window.siyuan?.ws?.app?.plugins) {
    const plugin = window.siyuan.ws.app.plugins.find(p => p.name === pluginName);
    if (plugin) return plugin;
  }
  return null;
};