import { setupDllPaths } from './dllFix/fixPathErrorUnicode.js';
setupDllPaths()
const edge = require('electron-edge-js');
export function loadCsharpFunc(string) {
    return edge.func(string)
}
export function loadCsharpFile(path) {
    let string = require('fs').readFileSync(path, 'utf-8')
    return edge.func(string)
}
