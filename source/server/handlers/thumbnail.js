import { listLoaders as listThumbnailLoaders } from '../processors/thumbnail/loader.js '
import { globalTaskQueue } from '../middlewares/runtime_queue.js'
const express = require('express')
const router = express.Router()
import {
    默认图片响应,
    getSourcePath,
    生成缩略图响应,
    生成默认缩略图路径
} from '../middlewares/defaultIcon.js'
router.get('/', async (req, res, next) => {
    globalTaskQueue.paused = true
    console.log(req, res)
    try {
        await next()
    } catch (e) {
        console.error(e)
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