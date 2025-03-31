const fs = require('fs');
const ExifParser = require('exif-reader');
import { 日志 } from '../../../src/toolBox/base/useEcma/forLogs/useLogger.js';

function readExifComment(filePath) {
    // 读取文件
    const buffer = fs.readFileSync(filePath);

    // 创建解析器
    const parser = ExifParser.create(buffer);

    // 解析EXIF数据
    const result = parser.parse();

    // 获取注释信息
    const comment = result.tags.UserComment;

    if (comment) {
        日志.信息(`找到EXIF注释: ${comment}`, 'MetaData');
    } else {
        日志.信息('未找到EXIF注释', 'MetaData');
    }
    return comment;
}

export const readExifCommentHandler = (req, res) => {
    let 源文件地址 = '';
    if (req.query.localPath) {
        源文件地址 = req.query.localPath;
    } else {
        源文件地址 = path.join(siyuanConfig.system.workspaceDir, 'data', req.query.path);
    }

    try {
        日志.信息(`开始读取EXIF数据: ${源文件地址}`, 'MetaData');
        // 调用 readExifComment 函数
        const comment = readExifComment(源文件地址);
        // 返回结果给客户端
        res.status(200).json({ comment: comment || 'No EXIF Comment found.' });
    } catch (error) {
        日志.错误(`读取EXIF数据时出错: ${error}`, 'MetaData');
        // 处理错误
        res.status(500).json({ error: 'Error reading EXIF data.' });
    }
}