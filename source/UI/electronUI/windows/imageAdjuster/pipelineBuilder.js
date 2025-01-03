import {
    调整锐度, 调整平滑度, 调整清晰度,
    调整锐化半径, 调整细节保护, 调整细节
} from '../../../../utils/fromDeps/sharpInterface/useSharp/adjust/clarity.js';
import { 调整亮度, 调整对比度, 调整阴影 } from '../../../../utils/fromDeps/sharpInterface/useSharp/adjust/light.js';
import { 调整色相偏移 } from '../../../../utils/fromDeps/sharpInterface/useSharp/adjust/color.js';
import { 自动曝光 } from '../../../../utils/image/adjust/exposure.js';
import { 生成法线图 } from '../../../../utils/fromDeps/sharpInterface/useSharp/Generator/normalMap.js';
import { 去雾滤镜 } from '../../../../utils/fromDeps/sharpInterface/useSharp/adjust/dehazing.js';
import * as kernels from '../../../../utils/fromDeps/sharpInterface/kernels.js';
import { getValueType } from '../../../../utils/object/type.js';
import { 显式类型转换 } from '../../../../utils/converters/index.js';
/**
 * 创建类型安全的参数更新函数
 * @param {string} expectedType 期望的类型
 * @returns {Function} 参数更新函数
 */
export function createTypeSafeUpdater(expectedType) {
  return function(value) {
    const inputType = getValueType(value);
    return 显式类型转换(value, inputType, expectedType);
  };
}



/**
 * 从卷积核定义创建预设项目
 * @param {Object} preset 卷积核预设定义
 * @returns {Object} 处理后的预设项目
 */
function createKernelProcessor(kernel, name) {
    const width = kernel[0].length;
    const height = kernel.length;
    const sum = kernel.flat().reduce((acc, val) => acc + Math.abs(val), 0);
    const defaultScale = sum === 0 ? 1 : 1 / sum;
    return {
        key: `卷积_${name}`,
        label:  `卷积_${name}`,
        type: 'matrix',
        needClone: true,
        params: [
            {
                key: 'scale',
                label: '强度',
                type: 'slider',
                defaultValue: defaultScale,
                min: 0,
                max: 100,
                step: 0.1
            },
            {
                key: 'offset',
                label: '偏移',
                type: 'slider',
                defaultValue: 0,
                min: -128,
                max: 128,
                step: 1
            }
        ],
        处理函数: async (img, scale, offset) => {
            return img.convolve({
                width,
                height,
                kernel: kernel.flat(),
                scale,
                offset
            });
        }
    };
}

// 法线图生成预处理函数
const applyPreprocess = (imageData, options = {}) => {
    const { 
        invert = false,
        contrast = 0,
        brightness = 0,
        smooth = 0
    } = options;
    
    const pixels = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // 创建新的数组以存储处理后的数据
    const processed = new Uint8ClampedArray(pixels.length);
    
    // 对比度和亮度调整函数
    const adjustPixel = (value) => {
        // 亮度调整
        value += brightness * 255;
        
        // 对比度调整
        if (contrast !== 0) {
            const factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100));
            value = factor * (value - 128) + 128;
        }
        
        // 确保值在有效范围内
        return Math.max(0, Math.min(255, value));
    };
    
    // 平滑处理函数
    const smoothPixel = (x, y) => {
        if (smooth <= 0) return pixels[(y * width + x) * 4];
        
        let sum = 0;
        let count = 0;
        const radius = Math.ceil(smooth * 2);
        
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    sum += pixels[(ny * width + nx) * 4];
                    count++;
                }
            }
        }
        
        return sum / count;
    };
    
    // 应用处理
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            
            // 获取平滑后的值
            let value = smoothPixel(x, y);
            
            // 应用对比度和亮度调整
            value = adjustPixel(value);
            
            // 应用反转
            if (invert) value = 255 - value;
            
            // 存储处理后的值
            processed[i] = value;
            processed[i + 1] = value;
            processed[i + 2] = value;
            processed[i + 3] = pixels[i + 3];
        }
    }
    
    return new ImageData(processed, width, height);
};

// 更新法线图生成函数
const 生成法线图FromCanvas = async (canvas, options = {}) => {
    const { 
        strength = 1.0, 
        blur = 0, 
        seamStrength = 1.0,
        flipX = false,
        flipY = false,
        preprocess = {},
        normalScale = 1.0,
        normalBias = 0.5
    } = options;
    
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = canvas.width;
    normalCanvas.height = canvas.height;
    const ctx = normalCanvas.getContext('2d');
    
    // 获取并预处理高度图数据
    const srcCtx = canvas.getContext('2d');
    let imageData = srcCtx.getImageData(0, 0, canvas.width, canvas.height);
    imageData = applyPreprocess(imageData, preprocess);
    
    const pixels = imageData.data;
    const normalData = ctx.createImageData(canvas.width, canvas.height);
    const normalPixels = normalData.data;
    
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const left = x > 0 ? pixels[((y * canvas.width) + (x - 1)) * 4] : pixels[((y * canvas.width) + x) * 4];
            const right = x < canvas.width - 1 ? pixels[((y * canvas.width) + (x + 1)) * 4] : pixels[((y * canvas.width) + x) * 4];
            const top = y > 0 ? pixels[(((y - 1) * canvas.width) + x) * 4] : pixels[((y * canvas.width) + x) * 4];
            const bottom = y < canvas.height - 1 ? pixels[(((y + 1) * canvas.width) + x) * 4] : pixels[((y * canvas.width) + x) * 4];
            
            // 计算梯度并应用缩放和偏移
            let dx = ((left - right) / 255) * strength * normalScale;
            let dy = ((top - bottom) / 255) * strength * normalScale;
            
            // 应用方向翻转
            if (flipX) dx = -dx;
            if (flipY) dy = -dy;
            
            // 计算法线
            const length = Math.sqrt(dx * dx + dy * dy + 1);
            const nx = dx / length;
            const ny = dy / length;
            const nz = 1 / length;
            
            // 存储法线，应用偏移
            const idx = (y * canvas.width + x) * 4;
            normalPixels[idx] = (nx * normalBias + normalBias) * 255;
            normalPixels[idx + 1] = (ny * normalBias + normalBias) * 255;
            normalPixels[idx + 2] = (nz * normalBias + normalBias) * 255;
            normalPixels[idx + 3] = 255;
        }
    }
    
    // 应用模糊
    if (blur > 0) {
        const blurRadius = Math.floor(blur * 3);
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCtx.putImageData(normalData, 0, 0);
        ctx.filter = `blur(${blurRadius}px)`;
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.filter = 'none';
    } else {
        ctx.putImageData(normalData, 0, 0);
    }
    
    return normalCanvas;
};

// 更新砖块法线生成器配置
export const 砖块法线生成器配置 = {
    key: '砖块法线生成器',
    label: '砖块法线生成器',
    description: '从砖块高度图生成法线贴图',
    type: 'generate',
    needClone: true,
    params: [
        {
            key: 'strength',
            label: '强度',
            type: 'slider',
            defaultValue: 1.0,
            min: 0.1,
            max: 5,
            step: 0.1
        },
        {
            key: 'blur',
            label: '预模糊',
            type: 'slider',
            defaultValue: 0,
            min: 0,
            max: 5,
            step: 0.1
        },
        {
            key: 'seamStrength',
            label: '砖缝强度',
            type: 'slider',
            defaultValue: 1.0,
            min: 0.1,
            max: 3.0,
            step: 0.1
        },
        {
            key: 'flipX',
            label: 'X轴反转',
            type: 'checkbox',
            defaultValue: false
        },
        {
            key: 'flipY',
            label: 'Y轴反转',
            type: 'checkbox',
            defaultValue: false
        },
        {
            key: 'normalScale',
            label: '法线缩放',
            type: 'slider',
            defaultValue: 1.0,
            min: 0.1,
            max: 2.0,
            step: 0.1
        },
        {
            key: 'normalBias',
            label: '法线偏移',
            type: 'slider',
            defaultValue: 0.5,
            min: 0,
            max: 1,
            step: 0.1
        },
        {
            key: 'preprocess',
            label: '预处理',
            type: 'group',
            params: [
                {
                    key: 'invert',
                    label: '反转高度',
                    type: 'checkbox',
                    defaultValue: false
                },
                {
                    key: 'contrast',
                    label: '对比度',
                    type: 'slider',
                    defaultValue: 0,
                    min: -1,
                    max: 1,
                    step: 0.1
                },
                {
                    key: 'brightness',
                    label: '亮度',
                    type: 'slider',
                    defaultValue: 0,
                    min: -1,
                    max: 1,
                    step: 0.1
                },
                {
                    key: 'smooth',
                    label: '平滑',
                    type: 'slider',
                    defaultValue: 0,
                    min: 0,
                    max: 2,
                    step: 0.1
                }
            ]
        }
    ],
    处理函数: async (canvas, strength, blur, seamStrength, flipX, flipY, normalScale, normalBias, preprocess) => {
        return await 生成法线图FromCanvas(canvas, {
            strength: strength * seamStrength,
            blur,
            flipX,
            flipY,
            normalScale,
            normalBias,
            preprocess
        });
    }
}

// 修改预设卷积核的注册方式
export const 参数定义注册表 = [
    ...Object.entries(kernels).map(([name, kernel]) => createKernelProcessor(kernel, name)),
    {
        key: '自动曝光',
        label: '自动曝光矫正',
        type: 'adjust',
        needClone: true,
        params: [{
            key: 'strength',
            label: '强度',
            type: 'slider',
            defaultValue: 0,
            min: 0,
            max: 10,
            step: 0.01
        }],
        enabled: false,
        处理函数: 自动曝光
    },
    {
        key: 'lightness',
        label: '亮度',
        type: 'adjust',
        expectedType: 'number',
        params: [{
            key: 'value',
            label: '亮度值',
            type: 'slider',
            defaultValue: 0,
            min: -1,
            max: 1,
            step: 0.1,
            updateValue: createTypeSafeUpdater('number')
        }],
        enabled: false,
        处理函数: 调整亮度
    },
    {
        key: '调整对比度',
        label: '对比度',
        type: 'adjust',
        params: [{
            key: 'value',
            label: '对比度值',
            type: 'slider',
            defaultValue: 0,
            min: -1,
            max: 1,
            step: 0.1
        }],
        enabled: false,
        处理函数: 调整对比度
    },
    {
        key: '调整阴影',
        label: '阴影',
        type: 'adjust',
        params: [{
            key: 'value',
            label: '阴影值',
            type: 'slider',
            defaultValue: 0,
            min: -10,
            max: 10,
            step: 0.1
        }],
        enabled: false,
        处理函数: 调整阴影
    },
    {
        key: '调整色相偏移',
        label: '色相',
        type: 'adjust',
        params: [{
            key: 'value',
            label: '色相值',
            type: 'slider',
            defaultValue: 0,
            min: -180,
            max: 180,
            step: 0.1
        }],
        enabled: false,
        处理函数: 调整色相偏移
    },
    {
        key: 'sharpness',
        label: '锐度',
        type: 'adjust',
        params: [{
            key: 'value',
            label: '锐度值',
            type: 'slider',
            defaultValue: 0,
            min: -1,
            max: 1,
            step: 0.1
        }],
        enabled: false,
        处理函数: 调整锐度
    },
    {
        key: 'smoothness',
        label: '平滑度',
        type: 'adjust',
        params: [{
            key: 'value',
            label: '平滑度值',
            type: 'slider',
            defaultValue: 0,
            min: 0,
            max: 20,
            step: 1
        }],
        enabled: false,
        处理函数: 调整平滑度
    },
    {
        key: 'clarity',
        label: '清晰度',
        type: 'adjust',
        params: [{
            key: 'value',
            label: '清晰度值',
            type: 'slider',
            defaultValue: 0,
            min: -1,
            max: 1,
            step: 0.1
        }],
        enabled: false,
        处理函数: 调整清晰度
    },
    {
        key: 'radius',
        label: '锐化半径',
        type: 'adjust',
        params: [{
            key: 'value',
            label: '锐化半径值',
            type: 'slider',
            defaultValue: 1,
            min: 0.5,
            max: 5,
            step: 0.1
        }],
        enabled: false,
        处理函数: 调整锐化半径
    },
    {
        key: 'detail',
        label: '细节',
        type: 'adjust',
        params: [{
            key: 'value',
            label: '细节值',
            type: 'slider',
            defaultValue: 0,
            min: -1,
            max: 1,
            step: 0.1
        }],
        enabled: false,
        处理函数: 调整细节
    },
    {
        key: 'protection',
        label: '细节保护',
        type: 'adjust',
        params: [{
            key: 'value',
            label: '保护程度',
            type: 'slider',
            defaultValue: 0.5,
            min: 0,
            max: 1,
            step: 0.1
        }],
        enabled: false,
        处理函数: 调整细节保护
    },
    {
        key: '法线图生成器',
        label: '法线图生成器',
        description: '从高度图生成法线贴图',
        type: 'generate',
        needClone: true,
        params: [
            {
                key: 'strength',
                label: '强度',
                type: 'slider',
                defaultValue: 1.0,
                min: 0.1,
                max: 5,
                step: 0.1
            },
            {
                key: 'blur',
                label: '预模糊',
                type: 'slider',
                defaultValue: 0,
                min: 0,
                max: 5,
                step: 0.1
            }
        ],
        处理函数: async (canvas, strength, blur) => {
            return await 生成法线图FromCanvas(canvas, {
                strength,
                blur
            });
        }
    },
    {
        key: 'dehaze',
        label: '去雾',
        description: '减少图像中的雾霾，提高清晰度',
        type: 'adjust',
        needClone: true,
        params: [
            {
                key: 'strength',
                label: '强度',
                type: 'slider',
                defaultValue: 1.0,
                min: 0.1,
                max: 2.0,
                step: 0.1
            }
        ],
        enabled: true,
        处理函数: 去雾滤镜
    },
    砖块法线生成器配置
]


export const buildFlipPipeLine=(flips)=>{
    return (img)=>{
        if (flips.horizontal) {
            img = img.flop()
        }
        if (flips.vertical) {
            img = img.flip()
        }
        return img
    }
}