export const 覆盖保存 = async (newPath, processedBuffer) => {
    const fs = window.require('fs').promises;
 
    await fs.writeFile(newPath, processedBuffer);
}
