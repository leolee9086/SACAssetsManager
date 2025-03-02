const express = require('express');
const app = express();
const path = require('path')
const cors = require('cors'); // 引入 cors 中间件

// 引入自定义路由器
import { createRouter } from '../utils/useDeps/useRadix3/forExpressLikeRouter.js';
const router = createRouter();

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
import { globalTaskQueue } from './middlewares/runtime_queue.js';
const siyuanBroadcastChannel = await createSiyuanBroadcastChannel('sacAssetsManager', window.siyuanPort)
siyuanBroadcastChannel.onmessage = (e) => {
    console.log(e)
}
/**
 * 启用跨域支持
 */
app.use(cors());

// 使用自定义路由器替代默认路由
// 流式遍历文件夹
router.get('/glob-stream', globStream)
router.get('/file-list-stream', headers.types.textPlain, fileListStream)
router.post('/file-list-stream', headers.types.textPlain, fileListStream)
router.get('/count-etries', entryCounter)
router.get('/listDisk', listDisk)
router.get('/loaders', listLoaders)

import { 删除文件颜色记录 } from './processors/color/colorIndex.js';
import { buildCache } from './middlewares/runtime_cache.js';
import { 响应文件夹扩展名请求, 获取文件夹第一张图片 } from './handlers/fs-handeler.js';
import { readExifCommentHandler } from './handlers/metaData.js';
import { 查找文件所在素材库路径,从文件系统获取eagle素材库标签列表 } from '../utils/thirdParty/eagle.js';

// Eagle 相关路由
router.get('/eagle-path', (req, res) => {
    res.json({
        finded: 查找文件所在素材库路径(req?.query?.path)
    })
})
router.get('/eagle-tags', (req, res) => {
    res.json({
        tags:从文件系统获取eagle素材库标签列表(req?.query?.path)
    })
})

// 颜色处理相关路由
router.get('/getPathseByColor', async (req, res) => {
    const color = req.query.color
    let ctx = {
        req,
        res,
        stats: {
            color: JSON.parse(color)
        }
    }
    getFilesByColor(ctx)
})
router.get('/metaRecords/delete', async (req, res) => {
    let 源文件地址 = ''
    if (req.query.localPath) {
        源文件地址 = req.query.localPath
    } else if (req.query.path) {
        源文件地址 = path.join(siyuanConfig.system.workspaceDir, 'data', req.query.path);
    }
    console.log(源文件地址)
    删除文件颜色记录(源文件地址)
    buildCache("statCache").delete(源文件地址.replace(/\\/g, '/'))
    buildCache("walk").delete(require('path').dirname(源文件地址.replace(/\\/g, '/')))
    res.json({
        success: true
    })
})
router.get('/color', async (req, res) => {
    let 源文件地址 = ''
    let 是否重新计算 = req.query.reGen
    if (req.query.localPath) {
        源文件地址 = req.query.localPath
    } else {
        源文件地址 = path.join(siyuanConfig.system.workspaceDir, 'data', req.query.path);
    }
    源文件地址 = 源文件地址.replace(/\//g, '\\')
    let stat = await statWithCatch(源文件地址)
    let 缓存键 = JSON.stringify({ stat })
    let ctx = {
        req,
        res,
        stats: {
            源文件地址,
            缓存键,
            重新计算文件颜色: 是否重新计算
        }
    }
    genColor(ctx).then(
        colors => {
            res.json(colors)
            globalTaskQueue.paused = false;
        }
    )
})

// 缩略图相关路由
// 注意：可能需要调整 thumbnail 路由器的集成方式
router.use('/thumbnail', genThumbnailRouter)
router.get('/raw', async (req, res) => {
    let path = req.query.path || req.query.localPath
    path = path.replace(/\\/g, '/')
    if (path.startsWith('assets')) {
        res.sendFile(require('path').join(siyuanConfig.system.workspaceDir, 'data', req.query.path))
    } else {
        res.sendFile(path)
    }
})
router.get('/fs/path/extentions', 响应文件夹扩展名请求)
router.get('/fs/path/folderThumbnail', 获取文件夹第一张图片)
router.get('/metadata/exif', readExifCommentHandler)

// 将自定义路由器应用到 Express
app.use('/', router.routes());

// 启动服务器
app.listen(port, '127.0.0.1', () => {
    console.log(`服务器运行在 http://127.0.0.1:${port}`);
});
app.listen(port, 'localhost', () => {
    window.channel.postMessage('serverReady')
    console.log(`服务器运行在 http://localhost:${port}`);
});
