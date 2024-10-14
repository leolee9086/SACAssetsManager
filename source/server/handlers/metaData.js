const fs = require('fs');
const ExifParser = require('exif-reader');

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
        console.log('EXIF Comment:', comment);
    } else {
        console.log('No EXIF Comment found.');
    }
}
export const readExifCommentHandler = (req, res) => {
    let 源文件地址 = '';
    if (req.query.localPath) {
        源文件地址 = req.query.localPath;
    } else {
        源文件地址 = path.join(siyuanConfig.system.workspaceDir, 'data', req.query.path);
    }

    try {
        // 调用 readExifComment 函数
        const comment = readExifComment(源文件地址);
        // 返回结果给客户端
        res.status(200).json({ comment: comment || 'No EXIF Comment found.' });
    } catch (error) {
        // 处理错误
        res.status(500).json({ error: 'Error reading EXIF data.' });
    }
}