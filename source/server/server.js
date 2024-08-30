const express = require('express');
const app = express();
const path = require('path')
const compression = require('compression');
const cors = require('cors'); // 引入 cors 中间件
import { genThumbnail,listLoaders,getColor } from './handlers/thumbnail.js';
import "./licenseChecker.js"
import { globStream,fileListStream } from './handlers/stream-glob.js';
import { entryCounter } from './handlers/entry-counter.js';
import { listDisk } from './handlers/listDisk.js';
const port = window.port
import { buildCache } from './processors/cache/cache.js';
import { statWithCatch } from './processors/fs/stat.js';
import * as headers from './middlewares/headers.js';
import { genColor, getFilesByColor } from './handlers/get-color.js'
import { createSiyuanBroadcastChannel } from './processors/web/siyuanWebSocket.js'
import { getCachePath } from './processors/fs/cached/fs.js'
import { genStatHash } from './processors/fs/stat.js'

const siyuanBroadcastChannel =await createSiyuanBroadcastChannel('sacAssetsManager',window.siyuanPort)
siyuanBroadcastChannel.onmessage = (e)=>{
    console.log(e)
}
/**
 * 启用跨域支持
 */
app.use(cors());
/**
 * 启用响应压缩
 */
let compressor=compression({
    level: 6, // 设置压缩级别，范围是 0-9，默认值是 6
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            // 如果请求头包含 'x-no-compression'，则不进行压缩
            return false;
        }
        // 其他情况下进行压缩
        return compression.filter(req, res);
    }
})
/**
 * 流式遍历文件夹
 */
app.get('/glob-stream',globStream)
app.get('/file-list-stream', headers.types.textPlain,fileListStream)
app.post('/file-list-stream', headers.types.textPlain,fileListStream)
app.get('/count-etries', entryCounter)
app.get('/listDisk',listDisk)
app.get('/loaders',listLoaders)
app.get(
    '/getPathseByColor',async(req,res)=>{
        const color = req.query.color
        let ctx = {
            req,
            res,
            stats:{
                color:JSON.parse(color)
            }
        }
        getFilesByColor(ctx)
    
    }
)
app.get('/color',async (req,res)=>{
    let 源文件地址 = ''
    if (req.query.localPath) {
        源文件地址 = req.query.localPath
    } else {
        源文件地址 = path.join(siyuanConfig.system.workspaceDir, 'data', req.query.path);
    }
    源文件地址 = 源文件地址.replace(/\//g,'\\')
    let stat = statWithCatch(源文件地址)
    let 缓存键 = JSON.stringify({stat})
   
    let ctx = {
        req,
        res,
        stats:{
            源文件地址,
            缓存键
        }
    }
   genColor(ctx).then(
        colors=>{
            res.json(colors)

        }
    )

})

app.get('/thumbnail',  (req, res) => {
    const fs = require('fs')
    let 源文件地址 = ''
    if (req.query.localPath) {
        源文件地址 = req.query.localPath
    } else {
        源文件地址 = path.join(siyuanConfig.system.workspaceDir, 'data', req.query.path);
    }
    源文件地址 = 源文件地址.replace(/\//g,'\\')
    const stat = statWithCatch(源文件地址)
    const 缓存键 = JSON.stringify(stat)
    const thumbnailCache = buildCache('thumbnailCache')
    const hashedName = genStatHash(stat) + '.thumbnail.png'
    const 缓存目录 = getCachePath(源文件地址,'thumbnails').cachePath
    if(!fs.existsSync(缓存目录)){
        fs.mkdirSync(缓存目录,{recursive:true})
    }
    let 缓存路径 = require('path').join(缓存目录, hashedName)
    let extension = 源文件地址.split('.').pop()
    let 扩展名缓存路径 = require('path').join(缓存目录, `${extension}.thumbnail.png`)
    if(fs.existsSync(缓存路径)){
        res.sendFile(缓存路径)
        return
    }else if(fs.existsSync(扩展名缓存路径)){
        res.sendFile(扩展名缓存路径)
        return
    }
    let ctx = {
        req,
        res,
        query:req.query,
        缓存对象:thumbnailCache,
        stats:{
            源文件地址,
            缓存键,
            缓存对象:thumbnailCache
        }
    }
    let next=()=>{}
    genThumbnail( ctx,next);
});
app.get('/thumbnail/pallet',  (req, res) => {
    let 源文件地址 = ''
    if (req.query.localPath) {
        源文件地址 = req.query.localPath
    } else {
        源文件地址 = path.join(siyuanConfig.system.workspaceDir, 'data', req.query.path);
    }
    源文件地址 = 源文件地址.replace(/\//g,'\\')
    const 缓存键 = JSON.stringify(stat)
    const thumbnailCache = buildCache('pallet')
    let ctx = {
        req,
        res,
        query:req.query,
        缓存对象:thumbnailCache,
        stats:{
            源文件地址,
            缓存键,
            缓存对象:thumbnailCache
        }
    }
    let next=()=>{}
    getColor( ctx,next);
});
app.get(
    '/raw', async (req, res) => {
        const path = req.query.path
        if (path.startsWith('assets')) {
            res.sendFile(require('path').join(siyuanConfig.system.workspaceDir, 'data', req.query.path))
        }
    }
)
app.listen(port, () => {
    window.channel.postMessage('serverReady')
    console.log(`Server running at http://localhost:${port}`);
});
/**
 * 这里是为了让主窗口的拖拽事件能够被其自身响应
 */
const remote = require('@electron/remote');
const {ipcRenderer} = require('electron')
const { webContents } = remote
ipcRenderer.on('startDrag',(e,arg)=>{    
    if(arg.id){
        const webContentsId = arg.id
        const webviewWebContents = webContents.fromId(webContentsId)
        webviewWebContents.startDrag(arg.data)
    }
})