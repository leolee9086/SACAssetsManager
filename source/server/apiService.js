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
import { statPromisesArray } from '../../trashed/tree.js';
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
import { 删除文件颜色记录 } from './processors/color/colorIndex.js';
import { buildCache } from './middlewares/runtime_cache.js';
import { 响应文件夹扩展名请求, 获取文件夹第一张图片 } from './handlers/fs-handeler.js';
import { readExifCommentHandler } from './handlers/metaData.js';

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
app.get('/metaRecords/delete',async (req,res)=>{
    let 源文件地址 = ''
    if (req.query.localPath) {
        源文件地址 = req.query.localPath
    } else if(req.query.path){
        源文件地址 = path.join(siyuanConfig.system.workspaceDir, 'data', req.query.path);
    }
    console.log(源文件地址)
    删除文件颜色记录(源文件地址)
    buildCache("statCache").delete(源文件地址.replace(/\\/g,'/'))
    buildCache("walk").delete(require('path').dirname(源文件地址.replace(/\\/g,'/')))
    res.json({
        success:true
    })
})
app.get('/color', async (req, res) => {
    let 源文件地址 = ''
    let 是否重新计算=  req.query.reGen
    if (req.query.localPath) {
        源文件地址 = req.query.localPath
    } else {
        源文件地址 = path.join(siyuanConfig.system.workspaceDir, 'data', req.query.path);
    }
    源文件地址 = 源文件地址.replace(/\//g, '\\')
    let stat =await statWithCatch(源文件地址)
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
    genColor(ctx).then(
        colors => {
            res.json(colors)
            statPromisesArray.paused = false;   
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
        let path = req.query.path || req.query.localPath
        path=path.replace(/\\/g,'/')
        if (path.startsWith('assets')) {
            res.sendFile(require('path').join(siyuanConfig.system.workspaceDir, 'data', req.query.path))
        } else {
            res.sendFile(path)
        }
    }
)
app.get('/fs/path/extentions',响应文件夹扩展名请求)
app.get('/fs/path/folderThumbnail',获取文件夹第一张图片 )
app.get('/metadata/exif',readExifCommentHandler)
app.listen(port, '127.0.0.1', () => {
    console.log(`服务器运行在 http://127.0.0.1:${port}`);
});
app.listen(port, 'localhost', () => {
    window.channel.postMessage('serverReady')
    console.log(`服务器运行在 http://localhost:${port}`);
});
