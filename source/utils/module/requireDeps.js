import { plugin } from '../../pluginSymbolRegistry.js'
const path = require('path')
const workspaceDir = window.siyuan.config.system.workspaceDir
const nodeModulePath = require('path').join(workspaceDir, 'data', 'plugins', plugin.name, 'node_modules')
export const requirePluginDeps = (moduleName)=>{
    return require(path.join(nodeModulePath,moduleName))
}