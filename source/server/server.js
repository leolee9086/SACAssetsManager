const express = require('express');
const app = express();
const path = require('path')
const compression = require('compression');
const cors = require('cors'); // 引入 cors 中间件
import { genThumbnail,listLoaders } from './handlers/thumbnail.js';
import "./licenseChecker.js"
import { globStream,fileListStream } from './handlers/stream-glob.js';
import { entryCounter } from './handlers/entry-counter.js';
import { listDisk } from './handlers/listDisk.js';
const port = window.port
import { memoryCache,generateCacheKey } from './utils/cache.js';
import * as headers from './middlewares/headers.js';
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
app.get('/glob-stream', headers.types.json,globStream)
app.get('/file-list-stream', headers.types.json,fileListStream)
app.post('/file-list-stream', headers.types.json,fileListStream)
app.get('/count-etries', entryCounter)
app.get('/listDisk',listDisk)
app.get('/loaders',listLoaders)
app.get('/thumbnail', async (req, res) => {
    let 源文件地址 = ''
    if (req.query.localPath) {
        源文件地址 = req.query.localPath
    } else {
        源文件地址 = path.join(siyuanConfig.system.workspaceDir, 'data', req.query.path);
    }
    源文件地址 = 源文件地址.replace(/\//g,'\\')
    const 缓存键 = generateCacheKey(源文件地址);
    let ctx = {
        req,
        res,
        query:req.query,
        缓存对象:memoryCache,
        stats:{
            源文件地址,
            缓存键,
            缓存对象:memoryCache
        }
    }
    let next=()=>{}
    genThumbnail( ctx,next);
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