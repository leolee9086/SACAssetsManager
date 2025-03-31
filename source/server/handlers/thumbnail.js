import { listLoaders as listThumbnailLoaders } from '../processors/thumbnail/loader.js '
import { globalTaskQueue } from '../middlewares/runtime_queue.js'
import { 日志 } from '../utils/logger.js';

const express = require('express')
const router = express.Router()


import {
    默认图片响应,
    getSourcePath,
    生成缩略图响应,
    生成默认缩略图路径
} from '../middlewares/defaultIcon.js'
import { buildCache, statWithCatch } from '../middlewares/runtime_cache.js'
import { 获取哈希并写入数据库 } from '../processors/fs/stat.js'
router.get('/', async (req, res, next) => {
    globalTaskQueue.paused = true
    try {
        await next()
    } catch (e) {
        日志.错误(e, 'Thumbnail');
    }
    return
},
    getSourcePath,
    生成缩略图响应,
    默认图片响应
);

const multer = require('multer')
const upload = multer({ dest: require('path').join(window.siyuanConfig.system.workspaceDir, 'temp', 'sac', 'upload') });
router.post('/upload', upload.single('image'), async (req, res, next) => {
    try {
        const file = req.file;
        const { path, localPath } = req.query;
        if (!file) {
            日志.警告('没有上传文件', 'Thumbnail');
            return res.status(400).json({ error: '没有上传文件' });
        }
        const thumbnailPath = await 生成默认缩略图路径(path || localPath)
        // 使用 copyFileSync 和 unlinkSync 代替 renameSync
        require('fs').copyFileSync(file.path, thumbnailPath);
        require('fs').unlinkSync(file.path);
        const tumbnailCache = buildCache('thumbnailCache')
        const stat = await statWithCatch(path||localPath)
        const rawBuffer = require('fs').readFileSync(thumbnailPath)
        const hash = await 获取哈希并写入数据库(stat)
        tumbnailCache.set(hash,rawBuffer)
        日志.信息(`缩略图生成成功: ${thumbnailPath}`, 'Thumbnail');
        res.json({ success: true, thumbnailPath });
    } catch (error) {
        日志.错误(`缩略图生成失败: ${error}`, 'Thumbnail');
        res.status(500).json({ error: '缩略图生成失败' });
    }
})
export const genThumbnailRouter = router
export function listLoaders(req, res) {
    res.json(listThumbnailLoaders())
}
const sharp= require('sharp')
router.get('/dimensions', async (req, res) => {
    try {
        const { path, localPath } = req.query
        const imagePath = path || localPath
        if (!imagePath) {
            日志.警告('未提供图片路径', 'Thumbnail');
            return res.status(400).json({ error: '未提供图片路径' })
        }
        const metadata = await sharp(imagePath).metadata()
        日志.信息(`获取图片尺寸成功: ${imagePath}`, 'Thumbnail');
        res.json({
            width: metadata.width,
            height: metadata.height,
            format: metadata.format
        })
    } catch (error) {
        日志.错误(`获取图片尺寸失败: ${error}`, 'Thumbnail');
        res.status(500).json({ error: '获取图片尺寸失败' })
    }
})
