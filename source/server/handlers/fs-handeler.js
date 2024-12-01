/**
 * 这里需要实现文件系统的原子操作
 * 需要支持撤销和重做
 */
import { 提取所有子目录文件扩展名 } from "../dataBase/mainDb.js";
const path = require('path')
const 图片扩展名列表 = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'];

const 是图片文件 = (文件名) => {
    return 图片扩展名列表.includes(path.extname(文件名).toLowerCase());
};

const 查找第一个图片 = async (目录路径) => {
    const fs = require('fs').promises;
    const path = require('path');
    
    const 文件列表 = await fs.readdir(目录路径);
    
    for (const 文件名 of 文件列表) {
        const 完整路径 = path.join(目录路径, 文件名);
        const 文件信息 = await fs.stat(完整路径);
        
        if (文件信息.isFile() && 是图片文件(文件名)) {
            return 完整路径;
        }
    }
    
    return 文件列表.length > 0 ? path.join(目录路径, 文件列表[0]) : null;
};

const 读取图片并发送 = async (图片路径, res) => {
    const fs = require('fs').promises;
    const path = require('path');
    
    const 图片数据 = await fs.readFile(图片路径);
    const 文件类型 = `image/${path.extname(图片路径).slice(1)}`;
    res.set('Content-Type', 文件类型);
    return res.send(图片数据);
};

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
    const { dirPath } = req.query;
    if (!dirPath) {
        return res.status(400).json({ error: 'dirPath 参数是必须的' });
    }
    
    try {
        const 找到的图片路径 = await 查找第一个图片(dirPath);
        
        if (!找到的图片路径) {
            return res.status(404).json({ error: '文件夹为空' });
        }
        
        if (是图片文件(找到的图片路径)) {
            await 读取图片并发送(找到的图片路径, res);
        } else {
            res.redirect(`/thumbnail?localPath=${encodeURIComponent(找到的图片路径)}`);
        }
    } catch (error) {
        console.error('获取文件夹第一张图片时出错:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
};