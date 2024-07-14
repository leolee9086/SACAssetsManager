import { setupDllPaths } from './dllFix/fixPathErrorUnicode.js';
setupDllPaths()
const edge = require('electron-edge-js');
export function loadCsharpFunc(string){
    return  edge.func(string)
}