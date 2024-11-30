import { initializeWebGPU } from './webgpuSetup.js';
import { createTextures, destroyResources } from './resources.js';
import { createComputePipeline, createBindGroup } from './pipeline.js';
import { uploadData, readResult } from './dataHandlers.js';

/**
 * 使用 LUT 处理图像
 * @param {Object} image - 输入图像对象
 * @param {Uint8Array} image.data - 图像像素数据
 * @param {number} image.width - 图像宽度
 * @param {number} image.height - 图像高度
 * @param {Uint8Array} lutData - LUT 数据
 * @param {number} [intensity=1.0] - LUT 效果强度 (0.0 到 1.0)
 * @returns {Promise<{success: boolean, result?: Uint8Array, error?: string}>} 处理结果
 */
export async function processImageWithLUT(image, lutData, intensity = 1.0) {
    let resources = null;
    try {
        if (!image || !lutData) {
            throw new Error('输入图像或 LUT 数据无效');
        }
        const { device } = await initializeWebGPU();
        const textures = createTextures(device, image);
        resources = textures;
        const uniformBuffer = device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(
            uniformBuffer,
            0,
            new Float32Array([intensity])
        );
        const pipeline = createComputePipeline(device);
        const bindGroup = createBindGroup(device, pipeline, textures, uniformBuffer);
        await uploadData(device, textures, image, lutData);
        const commandEncoder = device.createCommandEncoder();
        const computePass = commandEncoder.beginComputePass();
        computePass.setPipeline(pipeline);
        computePass.setBindGroup(0, bindGroup);
        computePass.dispatchWorkgroups(
            Math.ceil(image.width / 8),
            Math.ceil(image.height / 8)
        );
        computePass.end();
        device.queue.submit([commandEncoder.finish()]);
        const resultData = await readResult(
            device,
            textures.outputTexture,
            image.width,
            image.height
        );
        destroyResources(textures);
        uniformBuffer.destroy();
        return { success: true, result: resultData };
    } catch (error) {
        console.error('LUT 处理失败:', error);
        if (resources) {
            destroyResources(resources);
        }
        return { success: false, error: error.message };
    }
}



/**
 * 处理图像和 LUT 文件
 * @param {string} imagePath - 图像文件路径
 * @param {string} lutPath - LUT 文件路径
 * @returns {Promise<{
 *   image: {
 *     data: Uint8Array,
 *     width: number,
 *     height: number,
 *     blob: Blob,
 *     blobURL: string,
 *     fileName: string,
 *     fileSize: number
 *   },
 *   lut: {
 *     data: Uint8Array,
 *     blob: Blob,
 *     blobURL: string,
 *     fileName: string,
 *     fileSize: number
 *   }
 * }>}
 */
export async function processFiles(imagePath, lutPath) {
    try {
        // 并行处理图像和 LUT 文件
        const [imageResult, lutResult] = await Promise.all([
            processImageFile(imagePath),
            processLUTFile(lutPath)
        ]);
        return {
            image: imageResult,
            lut: lutResult
        };
    } catch (error) {
        console.error('处理文件时发生错误:', error);
        throw new Error(`文件处理失败: ${error.message}`);
    }
}

/**
 * 处理图像文件
 * @private
 * @param {string} imagePath - 图像文件路径
 */
async function processImageFile(imagePath) {
    
        // 获取文件基本信息
        console.log(imagePath)
        const response = await fetch(imagePath);
        const blob = await response.blob();
        const fileName = imagePath.split('/').pop();
        const blobURL = URL.createObjectURL(blob);
        const fileSize = blob.size;
        // 加载图像并获取像素数据
        const image = await createImageBitmap(blob);
        const canvas = new OffscreenCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, image.width, image.height);
        return {
            data: imageData.data,
            width: image.width,
            height: image.height,
            blob,
            blobURL,
            fileName,
            fileSize
        };

}

/**
 * 处理 LUT 文件
 * @private
 * @param {string} lutPath - LUT 文件路径
 */
async function processLUTFile(lutPath) {
    try {
        // 获取文件基本信息
        const response = await fetch(lutPath);
        const blob = await response.blob();
        const fileName = lutPath.split('/').pop();
        const blobURL = URL.createObjectURL(blob);
        const fileSize = blob.size;
        // 读取.cube文件内容
        const text = await blob.text();
        const lutData = parseCubeFile(text);
        // 验证解析后的LUT数据
        const expectedSize = 32 * 32 * 32 * 4; // RGBA 格式
        if (lutData.length !== expectedSize) {
            throw new Error(`解析后的LUT数据大小不正确: ${lutData.length} bytes (应为 ${expectedSize} bytes)`);
        }
        return {
            data: lutData,
            blob,
            blobURL,
            fileName,
            fileSize
        };
    } catch (error) {
        throw new Error(`LUT 处理失败: ${error.message}`);
    }
}

/**
 * 解析 .cube 格式的 LUT 文件
 * @private
 * @param {string} content - .cube 文件的文本内容
 * @returns {Uint8Array} 解析后的 LUT 数据数组 (RGBA 格式)
 */
function parseCubeFile(content) {
    const lines = content.split('\n');
    let lutSize = 32; // 默认大小
    let domainMin = [0, 0, 0];
    let domainMax = [1, 1, 1];
    
    // 首先解析头部信息
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('LUT_3D_SIZE')) {
            lutSize = parseInt(trimmedLine.split(/\s+/)[1]);
        } else if (trimmedLine.startsWith('DOMAIN_MIN')) {
            domainMin = trimmedLine.split(/\s+/).slice(1).map(Number);
        } else if (trimmedLine.startsWith('DOMAIN_MAX')) {
            domainMax = trimmedLine.split(/\s+/).slice(1).map(Number);
        }
    }

    // 创建适当大小的数组
    const lutData = new Uint8Array(lutSize * lutSize * lutSize * 4);
    let currentIndex = 0;
    let dataCount = 0;

    // 解析数据行
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine === '' || trimmedLine.startsWith('#') || 
            trimmedLine.startsWith('TITLE') || trimmedLine.startsWith('LUT_3D_SIZE') ||
            trimmedLine.startsWith('DOMAIN_MIN') || trimmedLine.startsWith('DOMAIN_MAX')) {
            continue;
        }

        const [r, g, b] = trimmedLine.split(/\s+/).map(Number);
        
        // 根据 domain 范围进行归一化
        const normalizedR = (r - domainMin[0]) / (domainMax[0] - domainMin[0]);
        const normalizedG = (g - domainMin[1]) / (domainMax[1] - domainMin[1]);
        const normalizedB = (b - domainMin[2]) / (domainMax[2] - domainMin[2]);

        lutData[currentIndex++] = Math.round(normalizedR * 255);
        lutData[currentIndex++] = Math.round(normalizedG * 255);
        lutData[currentIndex++] = Math.round(normalizedB * 255);
        lutData[currentIndex++] = 255;
        
        dataCount++;
    }

    // 验证数据完整性
    const expectedCount = lutSize * lutSize * lutSize;
    if (dataCount !== expectedCount) {
        throw new Error(`LUT 数据不完整: 期望 ${expectedCount} 个颜色点, 实际读取到 ${dataCount} 个`);
    }

    return lutData;
}

/**
 * 清理文件资源
 * @param {...string} blobURLs - 要清理的 blob URL 数组
 */
export function cleanupFiles(...blobURLs) {
    blobURLs.forEach(url => {
        if (url) {
            URL.revokeObjectURL(url);
        }
    });
}

/**
 * 使用 LUT 文件处理图像文件
 * @param {string} imagePath - 图像文件路径
 * @param {string} lutPath - LUT 文件路径
 * @param {number} [intensity=1.0] - LUT 效果强度 (0.0 到 1.0)
 * @returns {Promise<{
 *   success: boolean,
 *   width?: number,
 *   height?: number,
 *   blob?: Blob,
 *   blobURL?: string,
 *   fileSize?: number,
 *   originalFileName?: string,
 *   lutFileName?: string,
 *   error?: string
 * }>}
 */
export async function processImageWithLUTFile(imagePath, lutPath, intensity = 1.0) {
    let imageURL = null;
    let lutURL = null;

    try {
        // 处理文件
        const { image, lut } = await processFiles(imagePath, lutPath);
        imageURL = image.blobURL;
        lutURL = lut.blobURL;

        // 使用处理后的数据执行 LUT 转换
        const result = await processImageWithLUT(
            {
                data: image.data,
                width: image.width,
                height: image.height
            },
            lut.data,
            intensity
        );

        if (result.success) {
            // 创建用于预览的 Canvas
            const canvas = new OffscreenCanvas(image.width, image.height);
            const ctx = canvas.getContext('2d');

            // 正确创建 ImageData 对象
            const imageData = new ImageData(
                new Uint8ClampedArray(result.result), // 将 Uint8Array 转换为 Uint8ClampedArray
                image.width,
                image.height
            );

            ctx.putImageData(imageData, 0, 0);

            // 转换 Canvas 为 Blob
            const processedBlob = await canvas.convertToBlob({
                type: 'image/png'
            });

            // 创建预览URL
            const previewURL = URL.createObjectURL(processedBlob);

            let $result = {
                ...result,
                width: image.width,
                height: image.height,
                blob: processedBlob,
                blobURL: previewURL,
                fileSize: processedBlob.size,
                originalFileName: image.fileName,
                lutFileName: lut.fileName

            };
            console.error($result)
            return $result;

        }
        return result;
    } catch (error) {
        console.error('处理失败:', error);
        throw error;
    } finally {
        // 清理资源
        cleanupFiles(imageURL, lutURL);
    }
}

// 注意：使用完预览URL后需要清理
export function cleanupPreview(result) {
    if (result?.preview?.blobURL) {
        URL.revokeObjectURL(result.preview.blobURL);
    }
}
