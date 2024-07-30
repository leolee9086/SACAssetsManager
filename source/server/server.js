const express = require('express');
const app = express();
const path = require('path')
const compression = require('compression');
const cors = require('cors'); // 引入 cors 中间件
import { generateCacheKey, serveFromCache, saveToCache } from './cache/index.js'
import { handlerImageFile } from './handlers/thumbnail.js';
import "./licenseChecker.js"
import { globStream,fileListStream } from './handlers/stream-glob.js';
import { entryCounter } from './handlers/entry-counter.js';
import { listDisk } from './handlers/listDisk.js';
const port = window.port
const cache = {}
/**
 * 启用跨域支持
 */
app.use(cors());
/**
 * 启用响应压缩
 */
app.use(compression({
    level: 6, // 设置压缩级别，范围是 0-9，默认值是 6
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            // 如果请求头包含 'x-no-compression'，则不进行压缩
            return false;
        }
        // 其他情况下进行压缩
        return compression.filter(req, res);
    }
}));
/**
 * 流式遍历文件夹
 */
app.get('/glob-stream', globStream)
app.get('/file-list-stream', fileListStream)
app.post('/file-list-stream', fileListStream)

app.get('/count-etries', entryCounter)
app.get('/listDisk',listDisk)
app.get('/thumbnail', async (req, res) => {
    let 源文件地址 = ''
    if (req.query.localPath) {
        源文件地址 = req.query.localPath
    } else {
        源文件地址 = path.join(siyuanConfig.system.workspaceDir, 'data', req.query.path);
    }
    源文件地址 = 源文件地址.replace(/\//g,'\\')
    const 缓存键 = generateCacheKey(源文件地址);
    const cachedData = cache[缓存键];
    if (cachedData) {
        res.type('jpeg').send(cachedData);
        return;
    }
    if (源文件地址.endsWith('.sy')) {
        res.sendFile("C:/Users/al765/AppData/Local/Programs/SiYuan/resources/stage/icon.png")
        return
    }
    let ctx = {
        req,
        res,
        缓存对象:cache,
        stats:{
            源文件地址,
            缓存键
        }
    }
    let next=()=>{}
    handlerImageFile( ctx,next);
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



const remote = require('@electron/remote');
const {ipcRenderer} = require('electron')
const { webContents } = remote

ipcRenderer.on('startDrag',(e,arg)=>{

    console.log(e,arg)
    if(arg.id){
        const webContentsId = arg.id
        const webviewWebContents = webContents.fromId(webContentsId)
        webviewWebContents.startDrag(arg.data)
    }
})