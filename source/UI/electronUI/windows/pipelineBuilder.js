import {
    调整锐度, 调整平滑度, 调整清晰度,
    调整锐化半径, 调整细节保护, 调整细节
} from '../../../utils/fromDeps/sharpInterface/useSharp/adjust/clarity.js';
import { 调整亮度, 调整对比度, 调整阴影 } from '../../../utils/fromDeps/sharpInterface/useSharp/adjust/light.js';
import { 调整色相偏移 } from '../../../utils/fromDeps/sharpInterface/useSharp/adjust/color.js';
import { 自动曝光 } from '../../../utils/image/adjust/exposure.js';
import { 生成法线图 } from '../../../utils/fromDeps/sharpInterface/useSharp/Generator/normalMap.js';
import { 去雾滤镜 } from '../../../utils/fromDeps/sharpInterface/useSharp/adjust/dehazing.js';
import * as kernels from '../../../utils/fromDeps/sharpInterface/kernels.js';
// 类型转换器定义
const converters = {
  'string-number': value => Number(value),
  'number-string': value => String(value),
  'string-boolean': value => value === 'true',
  'boolean-string': value => value.toString(),
  'string-array': value => JSON.parse(value),
  'array-string': value => JSON.stringify(value),
  // 可以根据需要添加更多转换器
};

/**
 * 获取值的类型
 * @param {*} value 需要检测类型的值
 * @returns {string} 类型名称
 */
export function getValueType(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return (typeof value).toLowerCase();
}

/**
 * 类型转换函数
 * @param {*} value 要转换的值
 * @param {string} fromType 源类型
 * @param {string} toType 目标类型
 * @returns {*} 转换后的值
 */
export function convert(value, fromType, toType) {
  // 如果类型相同,直接返回
  if (fromType === toType) return value;
  
  // 获取转换器key
  const converterKey = `${fromType}-${toType}`;
  const converter = converters[converterKey];
  
  if (!converter) {
    console.warn(`No converter found for ${converterKey}`);
    return value;
  }
  
  try {
    return converter(value);
  } catch (error) {
    console.error(`Error converting ${fromType} to ${toType}:`, error);
    return value;
  }
}

/**
 * 创建类型安全的参数更新函数
 * @param {string} expectedType 期望的类型
 * @returns {Function} 参数更新函数
 */
export function createTypeSafeUpdater(expectedType) {
  return function(value) {
    const inputType = getValueType(value);
    return convert(value, inputType, expectedType);
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
        处理函数: async (img, strength, blur) => {
            return await 生成法线图(img, {
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
    }
]