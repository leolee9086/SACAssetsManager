import { plugin } from '../../../source/asyncModules.js'
const path = require('path')
const workspaceDir = window.siyuan?.config?.system?.workspaceDir||window.workspaceDir
const pluginName = plugin?.name||window.pluginName
const nodeModulePath = require('path').join(workspaceDir, 'data', 'plugins', pluginName, 'node_modules')
export const requirePluginDeps = (moduleName)=>{
    return require(path.join(nodeModulePath,moduleName))
}