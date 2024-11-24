export const 覆盖保存 = async (newPath, processedBuffer) => {
    const fs = window.require('fs').promises;
    try {
        await fs.access(newPath);
        await fs.unlink(newPath);
    } catch (err) {
        // 文件不存在,可以忽略错误
    }
    await fs.writeFile(newPath, processedBuffer);
}
