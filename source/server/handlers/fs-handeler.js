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