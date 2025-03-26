export const 全量计算文件MD5=async (filePath) => {
    const fs = require('fs').promises;
    const crypto = require('crypto');
    const data = await fs.readFile(filePath);
    return crypto.createHash('md5').update(data).digest('hex');
};
export const 宽松计算文件MD5 = async (filePath) => {
    const fs = require('fs').promises;
    const crypto = require('crypto');
    const hash = crypto.createHash('md5');
    const fd = await fs.open(filePath, 'r');
    
    try {
        const { size: fileSize } = await fd.stat();

        const chunkSize = 4096;
        const samplesCount = Math.min(10, Math.ceil(fileSize / chunkSize));
        const step = Math.floor(fileSize / samplesCount);

        // 生成随机种子，这里使用文件大小和当前时间戳
        const seed = fileSize 
        const randomOffset = crypto.createHash('md5').update(seed.toString()).digest('hex');
        const offsetMultiplier = parseInt(randomOffset, 16) % samplesCount;

        for (let i = 0; i < samplesCount; i++) {
            // 计算每个样本的起始位置，加上随机偏移量
            const position = (i * step + offsetMultiplier) % fileSize;
            const buffer = Buffer.alloc(chunkSize);
            await fd.read(buffer, 0, chunkSize, position);
            hash.update(buffer);
        }

        return hash.digest('hex');
    } finally {
        await fd.close();
    }

};
