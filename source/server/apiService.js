const express = require('express');
const app = express();
const path = require('path')
const cors = require('cors'); // 引入 cors 中间件
import { genThumbnailRouter, listLoaders } from './handlers/thumbnail.js';
import "./licenseChecker.js"
import { globStream, fileListStream } from './handlers/stream-glob.js';
import { entryCounter } from './handlers/entry-counter.js';
import { listDisk } from './handlers/listDisk.js';
const port = window.port
import { statWithCatch } from './processors/fs/stat.js';
import * as headers from './middlewares/headers.js';
import { genColor, getFilesByColor } from './handlers/get-color.js'
import { createSiyuanBroadcastChannel } from './processors/web/siyuanWebSocket.js'
import { statPromisesArray } from './processors/fs/disk/tree.js';
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
import { 获取ealge素材库路径,获取ealge素材库标签列表 } from './handlers/eagle-api.js'

/***
 * 获取eagle素材库路径
 */
app.get('/eagle-path',(req,res)=>{
    const ctx = {
        req,
        res
    }
    获取ealge素材库路径(ctx)
})
app.get('/eagle-tags',(req,res)=>{
    const ctx = {
        req,
        res
    }
    获取ealge素材库标签列表(ctx)
})
/***
 * 获取颜色
 */
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
    let 是否重新计算=  req.query.reGen
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
            缓存键,
            重新计算文件颜色:是否重新计算
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
/**
 * 缩略图生成
 * 这里前端也需要加上一个15秒左右的缓存
 */
app.use('/thumbnail',genThumbnailRouter)
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