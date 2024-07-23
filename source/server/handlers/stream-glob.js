const fs = require('fs');
const { Readable } = require('stream');
const fastGlob = require('fast-glob');
const { pipeline } = require('stream');

export const globStream= async (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    const folderPath = req.query.path.replace(/\\/g,'/').replace('//','/')
    console.log(folderPath)
    // 创建一个可读流，逐步读取文件路径
    const fileStream = fastGlob.stream(folderPath+'**/*',{suppressErrors:true});
    // 使用管道将文件流通过一个转换流发送到响应中
    const transformStream = new (require('stream').Transform)({
        objectMode: true,
        async transform(file, encoding, callback) {
            try {
                
                const stats = await fs.promises.stat(file);
                const fileInfo = {
                    path: file,
                    id:`localEntrie_${file}`,
                    type:'local',
                    size: stats.size,
                    mtime: new Date(stats.mtime).toLocaleString()
                  };
                callback(null, JSON.stringify(fileInfo)+'\n');
            } catch (err) {
                console.log(err)
                const fileInfo = {
                    path: file,
                    id:`localEntrie_${file}`,
                    type:'local',
                    size: null,
                    mtime: ''
                  };

                callback(null,JSON.stringify(fileInfo)+'\n');
            }
        }
    });

    // 将文件流通过转换流发送到HTTP响应中
    pipeline(
        fileStream,
        transformStream,
        res,
        (err) => {
            if (err) {
                console.error('Streaming error:', err);
                res.destroy(err);
            } else {
                console.log('Streaming completed');
            }
        }
    );
}
/*require('fs').watch('D:\\',{encoding:"utf8",recursive:true},(type,name)=>{
    const filePath=  require('path').join('D:\\',name)
    fs.stat(filePath,(err,stat)=>{
        console.log(stat)
    })
}))*/
