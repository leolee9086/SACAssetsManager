/**
 * API服务核心
 * 提供REST API和路由处理功能
 */

const express = require('express');
const app = express();
const path = require('path')
const cors = require('cors'); // 引入cors中间件
import { 日志 } from '../../../src/toolBox/base/useEcma/forLogs/useLogger.js';

// 引入自定义路由器
import { createRouter } from '../../utils/useDeps/useRadix3/forExpressLikeRouter.js';
const router = createRouter();

// 导入处理器和中间件
import { genThumbnailRouter, listLoaders } from '../handlers/thumbnail.js';
import "../services/license/licenseChecker.js"
import { globStream, fileListStream } from '../handlers/stream-glob.js';
import { entryCounter } from '../handlers/entry-counter.js';
import { listDisk } from '../handlers/listDisk.js';
import { statWithCatch } from '../processors/fs/stat.js';
import * as headers from '../middlewares/headers.js';
import { genColor, getFilesByColor } from '../handlers/get-color.js'
import { createSiyuanBroadcastChannel } from '../processors/web/siyuanWebSocket.js'
import { globalTaskQueue } from '../middlewares/runtime_queue.js';
import { 删除文件颜色记录 } from '../processors/color/colorIndex.js';
import { buildCache } from '../middlewares/runtime_cache.js';
import { 响应文件夹扩展名请求, 获取文件夹第一张图片 } from '../handlers/fs-handeler.js';
import { readExifCommentHandler } from '../handlers/metaData.js';
import { 查找文件所在素材库路径, 从文件系统获取eagle素材库标签列表 } from '../../utils/thirdParty/eagle.js';

// 获取端口号
const port = window.port

// 创建思源广播通道
const siyuanBroadcastChannel = await createSiyuanBroadcastChannel('sacAssetsManager', window.siyuanPort)
siyuanBroadcastChannel.onmessage = (e) => {
    日志.信息(e, 'SiyuanChannel');
}

/**
 * 启用跨域支持
 */
app.use(cors());

/**
 * 配置路由
 */
// 文件和目录操作相关路由
router.get('/glob-stream', globStream)
router.get('/file-list-stream', headers.types.textPlain, fileListStream)
router.post('/file-list-stream', headers.types.textPlain, fileListStream)
router.get('/count-etries', entryCounter)
router.get('/listDisk', listDisk)
router.get('/loaders', listLoaders)

// Eagle 相关路由
router.get('/eagle-path', (req, res) => {
    res.json({
        finded: 查找文件所在素材库路径(req?.query?.path)
    })
})
router.get('/eagle-tags', (req, res) => {
    res.json({
        tags: 从文件系统获取eagle素材库标签列表(req?.query?.path)
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
    日志.信息(`删除文件颜色记录: ${源文件地址}`, 'MetaRecords');
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
router.use('/thumbnail', genThumbnailRouter)

// 原始文件和文件系统相关路由
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

// 将自定义路由器应用到Express
app.use('/', router.routes());

/**
 * 启动API服务器
 */
const startAPIServer = () => {
    app.listen(port, '127.0.0.1', () => {
        日志.信息(`服务器运行在 http://127.0.0.1:${port}`, 'Server');
    });
    
    app.listen(port, 'localhost', () => {
        window.channel.postMessage('serverReady')
        日志.信息(`服务器运行在 http://localhost:${port}`, 'Server');
    });
}

// 启动服务器
startAPIServer(); 