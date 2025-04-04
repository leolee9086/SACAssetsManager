export const bufferToImageBitmap = async(buffer)=> {
    const blob = new Blob([buffer], { type: 'image/png' });
    try {
        // 使用 createImageBitmap 直接创建可用于 Canvas 的位图对象
        // 这比创建 Image 对象更高效，因为它是为 Canvas 渲染优化的
        const bitmap = await createImageBitmap(blob);
        return bitmap;
    } catch (error) {
        throw new Error('图片处理失败: ' + error.message);
    }
}