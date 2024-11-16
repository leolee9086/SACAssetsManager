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
        console.log(imagePath, lutPath)

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
    const lutData = new Uint8Array(32 * 32 * 32 * 4);
    let dataIndex = 0;
    let currentIndex = 0;

    for (const line of lines) {
        // 跳过注释和元数���行
        if (line.trim().startsWith('#') || line.trim().startsWith('TITLE') ||
            line.trim().startsWith('LUT_3D_SIZE') || line.trim().startsWith('DOMAIN_MIN') ||
            line.trim().startsWith('DOMAIN_MAX') || line.trim() === '') {
            continue;
        }

        // 解析RGB值
        const [r, g, b] = line.trim().split(/\s+/).map(Number);

        // 转换为0-255范围的值
        lutData[currentIndex++] = Math.round(r * 255);
        lutData[currentIndex++] = Math.round(g * 255);
        lutData[currentIndex++] = Math.round(b * 255);
        lutData[currentIndex++] = 255; // Alpha 通道设为255
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
let result = await processImageWithLUTFile("file:///D:/%E5%8D%95%E4%BD%93%E6%A8%A1%E5%9E%8B%E7%B4%A0%E6%9D%90/%E5%8E%A8%E5%8D%AB/%E5%8E%A8%E6%88%BF/%E9%A4%90%E5%85%B7/%20(15).png", 'C:/D5 WorkSpace/customlut/beach7.cube', 0.1)
fetch(result.blobURL)