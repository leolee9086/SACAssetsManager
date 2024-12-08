// 修改预览生成函数
const generatePreview = async (sharpObj) => {
    try {
        // 检查 DOM 引用是否存在
        if (!processedImg.value) {
            console.warn('processedImg reference not found');
            return;
        }
        // 生成处理后的图像
        const processedBuffer = await sharpObj.clone().png().toBuffer();
        // 清理旧的 Blob URLs
        if (processedImg.value.src?.startsWith('blob:')) {
            URL.revokeObjectURL(processedImg.value.src);
        }
        if (originalImg.value?.src?.startsWith('blob:')) {
            URL.revokeObjectURL(originalImg.value.src);
        }

        // 更新处理后的图像
        const processedUrl = URL.createObjectURL(
            new Blob([processedBuffer], { type: 'image/png' })
        );
        processedImg.value.src = processedUrl;

        // 如果启用了裂像预览，确保原始图像也被更新
        if (isSplitViewEnabled.value) {
            try {
                const originalImage = await fromFilePath(imagePath.value);
                const originalBuffer = await originalImage.png().toBuffer();

                if (originalImg.value) {
                    const originalUrl = URL.createObjectURL(
                        new Blob([originalBuffer], { type: 'image/png' })
                    );
                    originalImg.value.src = originalUrl;
                }
            } catch (error) {
                console.error('生成原始图像预览失败:', error);
            }
        } else if (originalImg.value) {
            originalImg.value.src = '';
        }

    } catch (error) {
        console.error('生成预览图失败:', error);
    }
};
