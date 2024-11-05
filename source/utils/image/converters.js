// 处理图像缩放
const applyScale = (sharpInstance, metadata, scale) => {
    if (scale && scale !== 100) {
        const targetWidth = Math.round(metadata.width * (scale / 100));
        sharpInstance.resize({ width: targetWidth, withoutEnlargement: true });
    }
};

// 处理图像压缩
const applyCompression = (sharpInstance, format, quality) => {
    const qualityValue = parseInt(quality);
    switch (format) {
        case 'jpeg':
            sharpInstance.jpeg({ quality: qualityValue });
            break;
        case 'png':
            sharpInstance.png({ quality: qualityValue });
            break;
        case 'webp':
            sharpInstance.webp({ quality: qualityValue });
            break;
        default:
            sharpInstance.jpeg({ quality: qualityValue });
    }
};

// 将 buffer 转换为 base64 图片
export const bufferToBase64Image = async (buffer, options = {}) => {
    try {
        const sharpInstance = sharp(buffer);
        const metadata = await sharpInstance.metadata();

        // 应用缩放
        applyScale(sharpInstance, metadata, options.scale);

        // 应用压缩
        if (options.quality) {
            applyCompression(sharpInstance, metadata.format, options.quality);
        }

        const data = await sharpInstance.toBuffer();
        return `data:image/${metadata.format};base64,${data.toString('base64')}`;
    } catch (error) {
        console.error('图片处理失败:', error);
        throw error;
    }
};
// 将文件转换为 buffer
export const fileToBuffer = async (file) => {
    return await file.arrayBuffer();
  };
  
  