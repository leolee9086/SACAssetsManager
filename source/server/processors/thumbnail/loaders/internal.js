import { initLoadersFromPaths } from "./init.js"
let _inTernalLoderPaths = [
    '../internalGeneraters/svg.js',
    '../internalGeneraters/sharp.js',
    '../internalGeneraters/sy.js',
    '../internalGeneraters/d5m.js',
    '../internalGeneraters/systermThumbnailWin64.js'
]

let inTernalLoderPaths = _inTernalLoderPaths.map(
    url=>{
        return import.meta.resolve(url)
    }
)
export let 内置缩略图生成器序列 = await initLoadersFromPaths(inTernalLoderPaths)
