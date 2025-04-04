import { GPU } from 'gpu.js';
const workspaceDir = window.siyuan.config.system.workspaceDir
const sharpPath = require('path').join(workspaceDir, 'data', 'plugins', plugin.name, 'node_modules', 'sharp')
const sharp = require(sharpPath)

const gpu = new GPU();

/**
 * RGB 转 HSL 的 GPU 核心函数
 */
const rgbToHslKernel = gpu.createKernel(function(pixels) {
    const r = pixels[this.thread.y][this.thread.x][0] / 255;
    const g = pixels[this.thread.y][this.thread.x][1] / 255;
    const b = pixels[this.thread.y][this.thread.x][2] / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h, s, l];
});

/**
 * HSL 转 RGB 的 GPU 核心函数
 */
const hslToRgbKernel = gpu.createKernel(function(pixels) {
    const h = pixels[this.thread.y][this.thread.x][0];
    const s = pixels[this.thread.y][this.thread.x][1];
    const l = pixels[this.thread.y][this.thread.x][2];
    
    let r, g, b;

    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = function(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;

        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [r * 255, g * 255, b * 255];
});

/**
 * 智能饱和度调整的 GPU 核心函数
 */
const saturateKernel = gpu.createKernel(function(pixels, intensity) {
    const x = this.thread.x;
    const y = this.thread.y;
    
    // 获取原始 RGB 值
    const r = pixels[y][x][0];
    const g = pixels[y][x][1];
    const b = pixels[y][x][2];
    
    // 检测是否为肤色
    const isSkin = (r > 95 && g > 40 && b > 20) &&
                  (Math.max(r, g, b) - Math.min(r, g, b) > 15) &&
                  (Math.abs(r - g) > 15) && (r > g) && (r > b);
    
    // 根据是否为肤色调整饱和度强度
    const actualIntensity = isSkin ? Math.min(intensity * 0.5, 1.2) : intensity;
    
    // 计算亮度
    const luminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
    
    // 应用饱和度调整
    const factor = 1 + (actualIntensity - 1) * (1 - Math.abs(luminance - 0.5) * 2);
    
    const newR = Math.min(255, Math.max(0, luminance + (r - luminance * 255) * factor));
    const newG = Math.min(255, Math.max(0, luminance + (g - luminance * 255) * factor));
    const newB = Math.min(255, Math.max(0, luminance + (b - luminance * 255) * factor));
    
    return [newR, newG, newB];
}).setOutput([1024, 1024]); // 设置最大支持的图片尺寸

/**
 * GPU 加速的自然饱和度增强
 */
export const GPU自然饱和度增强 = async (inputPath, outputPath, options = {}) => {
    try {
        const {
            intensity = 1.3,          // 饱和度强度
            保护肤色 = true,          // 是否保护肤色
            智能调整 = true           // 是否根据图像内容智能调整
        } = options;

        // 读取图片数据
        const inputBuffer = await sharp(inputPath)
            .raw()
            .toBuffer({ resolveWithObject: true });

        const { data, info } = inputBuffer;
        const { width, height } = info;

        // 调整 kernel 输出大小
        saturateKernel.setOutput([width, height]);

        // 将图片数据转换为适合 GPU 处理的格式
        const pixels = new Float32Array(data.buffer);
        const reshapedPixels = [];
        for (let i = 0; i < height; i++) {
            const row = [];
            for (let j = 0; j < width; j++) {
                const idx = (i * width + j) * 3;
                row.push([pixels[idx], pixels[idx + 1], pixels[idx + 2]]);
            }
            reshapedPixels.push(row);
        }

        // GPU 处理
        const result = saturateKernel(reshapedPixels, intensity);

        // 将结果转回 Buffer
        const outputBuffer = Buffer.from(result.flat(2));

        // 保存处理后的图片
        await sharp(outputBuffer, {
            raw: {
                width,
                height,
                channels: 3
            }
        })
        .toFile(outputPath);

        return outputPath;
    } catch (error) {
        console.error(`GPU自然饱和度增强失败: ${error}`);
        return '';
    }
}

/**
 * 批量处理图片
 */
export const 批量增强 = async (inputPaths, outputDir, options = {}) => {
    try {
        const results = await Promise.all(
            inputPaths.map((inputPath, index) => {
                const outputPath = path.join(outputDir, `enhanced_${index}.jpg`);
                return GPU自然饱和度增强(inputPath, outputPath, options);
            })
        );
        return results.filter(Boolean);
    } catch (error) {
        console.error(`批量处理失败: ${error}`);
        return [];
    }
}