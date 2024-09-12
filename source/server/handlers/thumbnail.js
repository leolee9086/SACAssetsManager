import { listLoaders as listThumbnailLoaders } from '../processors/thumbnail/loader.js '
import { statPromisesArray } from '../processors/fs/disk/tree.js'
import { globalTaskQueue } from '../middlewares/runtime_queue.js'
const express = require('express')
const router = express.Router()
import {
    默认图片响应,
    checkAndSendWritedIconWithCacheWrite,
    getSourcePath,
    文件缩略图内存缓存中间件,
    生成缩略图响应,
    生成默认缩略图路径
} from '../middlewares/defaultIcon.js'
import { checkAndSendExtensionIcon } from '../middlewares/thumbnails/withdiskCache.js'
router.get('/', async(req, res, next) => {
        // 暂停所有文件状态获取
        statPromisesArray.paused = true
        // 前端保留15秒的缓存
        console.log(req, res)
        res.setHeader('Cache-Control', 'public, max-age=15')
        try {
            await next()
        } catch (e) {
            console.error(e)
        }
        return

    },
    getSourcePath,
    文件缩略图内存缓存中间件,
    checkAndSendWritedIconWithCacheWrite,
    checkAndSendExtensionIcon,
    生成缩略图响应,
    默认图片响应
);
const multer = require('multer')
const upload = multer({ dest: require('path').join(window.siyuanConfig.system.workspaceDir, 'temp', 'sac', 'upload') });

router.post('/upload', upload.single('image'), async (req, res, next) => {
    console.log(req)
    try {
        const file = req.file;
        const { path, localPath } = req.query;
        console.log(path, localPath)
        if (!file) {
            return res.status(400).json({ error: '没有上传文件' });
        }

        const thumbnailPath = await 生成默认缩略图路径(path || localPath)
        require('fs').renameSync(file.path, thumbnailPath)
        // 这里可以添加将缩略图路径保存到数据库的逻辑

        res.json({ success: true, thumbnailPath });
    } catch (error) {
        console.error('缩略图生成失败:', error);
        res.status(500).json({ error: '缩略图生成失败' });
    }

})
export const genThumbnailRouter = router

export function listLoaders(req, res) {
    res.json(listThumbnailLoaders())
}