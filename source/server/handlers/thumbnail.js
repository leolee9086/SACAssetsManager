import { listLoaders as listThumbnailLoaders } from '../processors/thumbnail/loader.js '
import { statPromisesArray } from '../processors/fs/disk/tree.js'
const express = require('express')
const router = express.Router()
import {
    默认图片响应,
    checkAndSendWritedIconWithCacheWrite,
    getSourcePath,
    文件缩略图内存缓存中间件,
    生成缩略图响应,
} from '../middlewares/defaultIcon.js'
import { checkAndSendExtensionIcon } from '../middlewares/thumbnails/withdiskCache.js'
router.get('/',
    async (req, res, next) => {
        // 暂停所有文件状态获取
        statPromisesArray.paused = true
        // 前端保留15秒的缓存
        res.setHeader('Cache-Control', 'public, max-age=15')
        try {
            await next()
        } catch (e) {
            console.log(e)
        }
        statPromisesArray.paused = false
        return
    },
    getSourcePath,
    文件缩略图内存缓存中间件,
    checkAndSendExtensionIcon,
    checkAndSendWritedIconWithCacheWrite,
    生成缩略图响应,
    默认图片响应
);
export const genThumbnailRouter = router

export function listLoaders(req, res) {
    res.json(listThumbnailLoaders())
}