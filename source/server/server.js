const express = require('express');
const app = express();
const path = require('path')
const cors = require('cors'); // 引入 cors 中间件
import { genThumbnail, listLoaders } from './handlers/thumbnail.js';
import "./licenseChecker.js"
import { globStream, fileListStream } from './handlers/stream-glob.js';
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
import { statPromisesArray } from './processors/fs/disk/tree.js';
import { sendFileWithCacheSet } from './handlers/utils/responseType.js';
const siyuanBroadcastChannel = await createSiyuanBroadcastChannel('sacAssetsManager', window.siyuanPort)
siyuanBroadcastChannel.onmessage = (e) => {
    console.log(e)
}
/**
 * 启用跨域支持
 */
app.use(cors());
/**
 * 流式遍历文件夹
 */
app.get('/glob-stream', globStream)
app.get('/file-list-stream', headers.types.textPlain, fileListStream)
app.post('/file-list-stream', headers.types.textPlain, fileListStream)
app.get('/count-etries', entryCounter)
app.get('/listDisk', listDisk)
app.get('/loaders', listLoaders)
app.get('/getPathseByColor', async (req, res) => {
        const color = req.query.color
        let ctx = {
            req,
            res,
            stats: {
                color: JSON.parse(color)
            }
        }
        getFilesByColor(ctx)
    }
)
app.get('/color', async (req, res) => {
    let 源文件地址 = ''
    if (req.query.localPath) {
        源文件地址 = req.query.localPath
    } else {
        源文件地址 = path.join(siyuanConfig.system.workspaceDir, 'data', req.query.path);
    }
    源文件地址 = 源文件地址.replace(/\//g, '\\')
    let stat = statWithCatch(源文件地址)
    let 缓存键 = JSON.stringify({ stat })
    let ctx = {
        req,
        res,
        stats: {
            源文件地址,
            缓存键
        }
    }
    const start = performance.now()
    genColor(ctx).then(
        colors => {
            res.json(colors)
            statPromisesArray.paused = false;   
            console.log(`生成颜色，耗时：${performance.now() - start}ms`)
        }
    )

})

app.get('/thumbnail', async (req, res) => {
    statPromisesArray.paused = true
    let 源文件地址 = ''
    if (req.query.localPath) {
        源文件地址 = req.query.localPath
    } else {
        源文件地址 = path.join(siyuanConfig.system.workspaceDir, 'data', req.query.path);
    }
    console.log(源文件地址)

    源文件地址 = 源文件地址.replace(/\//g, '\\')
    const stat = statWithCatch(源文件地址)
    const 缓存键 = JSON.stringify(stat)
    const thumbnailCache = buildCache('thumbnailCache')
    const hashedName = genStatHash(stat) + '.thumbnail.png'
    const 缓存目录 = (await getCachePath(源文件地址, 'thumbnails', true)).cachePath

    let 缓存路径 = require('path').join(缓存目录, hashedName)
    let extension = 源文件地址.split('.').pop()
    let 扩展名缓存路径 = require('path').join(缓存目录, `${extension}.thumbnail.png`)
    let cacheResult = thumbnailCache.get(缓存键)
    const start = performance.now()
    if (cacheResult && Buffer.isBuffer(cacheResult)) {
        res.send(cacheResult)
        statPromisesArray.paused = false
        console.log(`内存缓存命中，耗时：${performance.now() - start}ms`)
        return
    }
    // 先检查是否存在缓存的缩略图
    if (await sendFileWithCacheSet(res, 缓存路径, thumbnailCache, 缓存键)) {
        console.log(`文件缩略图硬盘缓存命中，耗时：${performance.now() - start}ms`)
        statPromisesArray.paused = false;

        return
    }
    if (await sendFileWithCacheSet(res, 扩展名缓存路径, thumbnailCache, 缓存键)) {
        console.log(`文件扩展名缩略图硬盘缓存命中，耗时：${performance.now() - start}ms`)
        statPromisesArray.paused = false;

        return
    }
    let ctx = {
        req,
        res,
        query: req.query,
        缓存对象: thumbnailCache,
        stats: {
            源文件地址,
            缓存键,
            缓存对象: thumbnailCache
        }
    }
    let next = () => { 
        console.log(`生成缩略图，耗时：${performance.now() - start}ms`)
    }
    genThumbnail(ctx, next);
    statPromisesArray.paused = false
});

app.get(
    '/raw', async (req, res) => {
        const path = req.query.path || req.query.localPath
        if (path.startsWith('assets')) {
            res.sendFile(require('path').join(siyuanConfig.system.workspaceDir, 'data', req.query.path))
        } else {
            res.sendFile(path)
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
const { ipcRenderer } = require('electron')
const { webContents } = remote
ipcRenderer.on('startDrag', (e, arg) => {
    if (arg.id) {
        const webContentsId = arg.id
        const webviewWebContents = webContents.fromId(webContentsId)
        webviewWebContents.startDrag(arg.data)
    }
})