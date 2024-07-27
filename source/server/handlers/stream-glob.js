const fs = require('fs');
const { Readable } = require('stream');
const fastGlob = require('fast-glob');
const { pipeline } = require('stream');

export const globStream= async (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    const scheme = JSON.parse(req.query.setting)
    // 创建一个可读流，逐步读取文件路径
       // 创建一个 AbortController 实例
       const controller = new AbortController();
       const { signal } = controller;
       // 当请求关闭时，触发中止信号
       req.on('close', () => {
           controller.abort();
       });
    const fileStream =await fastGlob.stream(scheme.pattern,{...scheme.options,suppressErrors:true,dot:false},signal);
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
                    mtime:stats.mtime,
                    mtimems: stats.mtime.getTime(),
                  };
                callback(null, JSON.stringify(fileInfo)+'\n');
            } catch (err) {
                const fileInfo = {
                    path: file,
                    id:`localEntrie_${file}`,
                    type:'local',
                    size: null,
                    mtime: '',
                    mtimems:'',
                    error:err
                  };
                callback(null,JSON.stringify(fileInfo)+'\n');
            }
        }
    });
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
