/**
 * 这里需要实现文件系统的原子操作
 * 需要支持撤销和重做
 */
import { 提取所有子目录文件扩展名 } from "../dataBase/mainDb.js";

export const 响应文件夹扩展名请求 =async (req,res,next)=>{
    const { dirPath } = req.query;
    if (!dirPath) {
        return res.status(400).json({ error: 'dirPath 参数是必须的' });
    }

    try {
        const extensions = await 提取所有子目录文件扩展名(dirPath);
        res.json({ extensions });
    } catch (error) {
        console.error('提取文件扩展名时出错:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
}



export const 获取文件夹第一张图片 = async (req, res, next) => {
    const fs = require('fs').promises
    const path = require('path')
    const { dirPath } = req.query;
    if (!dirPath) {
        return res.status(400).json({ error: 'dirPath 参数是必须的' });
    }

    try {
        const files = await fs.readdir(dirPath);
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'];
        
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stat = await fs.stat(filePath);
            
            if (stat.isFile() && imageExtensions.includes(path.extname(file).toLowerCase())) {
                const imageBuffer = await fs.readFile(filePath);
                const mimeType = `image/${path.extname(file).slice(1)}`;
                res.set('Content-Type', mimeType);
                return res.send(imageBuffer);
            }
        }
        
        // 如果没有找到图片，使用第一个文件作为localPath并重定向到thumbnail
        if (files.length > 0) {
            const firstFilePath = path.join(dirPath, files[0]);
            res.redirect(`/thumbnail?localPath=${encodeURIComponent(firstFilePath)}`);
        } else {
            res.status(404).json({ error: '文件夹为空' });
        }
    } catch (error) {
        console.error('获取文件夹第一张图片时出错:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
};