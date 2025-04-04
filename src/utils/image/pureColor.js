const colorThreshold = 0; // 颜色差异阈值
const sampleSize = 100; // 采样大小
export const isPureColor = (imagePath) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const width = img.width;
            const height = img.height;

            // 计算采样间隔
            const stepX = Math.max(1, Math.floor(width / Math.sqrt(sampleSize)));
            const stepY = Math.max(1, Math.floor(height / Math.sqrt(sampleSize)));

            // 获取第一个像素的颜色作为基准
            const baseColor = ctx.getImageData(0, 0, 1, 1).data;
            const [baseR, baseG, baseB] = baseColor;

            // 采样并比较颜色
            for (let y = 0; y < height; y += stepY) {
                for (let x = 0; x < width; x += stepX) {
                    const pixel = ctx.getImageData(x, y, 1, 1).data;
                    const [r, g, b] = pixel;

                    if (
                        Math.abs(r - baseR) > colorThreshold ||
                        Math.abs(g - baseG) > colorThreshold ||
                        Math.abs(b - baseB) > colorThreshold
                    ) {
                        resolve(false); // 颜色差异超过阈值，不是纯色
                        return;
                    }
                }
            }

            resolve(true); // 所有采样像素颜色相近，认为是纯色
        };

        img.onerror = (error) => {
            console.error('加载图片失败:', imagePath, error);
            resolve(false); // 加载失败时默认不是纯色
        };

        img.src = imagePath;
    });
};
