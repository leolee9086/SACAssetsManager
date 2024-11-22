import {
    调整锐度, 调整平滑度, 调整清晰度,
    调整锐化半径, 调整细节保护, 调整细节
} from '../../../../utils/fromDeps/sharpInterface/useSharp/adjust/clarity.js';
import { 调整亮度, 调整对比度, 调整阴影 } from '../../../../utils/fromDeps/sharpInterface/useSharp/adjust/light.js';
import { 调整色相偏移 } from '../../../../utils/fromDeps/sharpInterface/useSharp/adjust/color.js';
import { 自动曝光 } from '../../../../utils/image/adjust/exposure.js';
export const 参数定义注册表 = [
    {
        key: '自动曝光', label: '自动曝光矫正', defaultValue: 0, min: 0, max: 1, step: 0.01, enabled: false,
        处理函数: 自动曝光
    },

    {
        key: 'lightness', label: '亮度', defaultValue: 0, min: -1, max: 1, step: 0.1, enabled: false,
        处理函数: 调整亮度
    },
    {
        key: '调整对比度', label: '对比度', defaultValue: 0, min: -1, max: 1, step: 0.1, enabled: false,
        处理函数: 调整对比度
    },
    {
        key: '调整阴影', label: '阴影', defaultValue: 0, min: -10, max: 10, step: 0.1, enabled: false,
        处理函数: 调整阴影
    },
    {
        key: '调整色相偏移', label: '色相', defaultValue: 0, min: -180, max: 180, step: 0.1, enabled: false,
        处理函数: 调整色相偏移
    },

    {
        key: 'sharpness', label: '锐度', defaultValue: 0, min: -1, max: 1, step: 0.1, enabled: false,
        处理函数: 调整锐度
    },
    {
        key: 'smoothness', label: '平滑度', defaultValue: 0, min: 0, max: 20, step: 1, enabled: false,
        处理函数: 调整平滑度
    },
    {
        key: 'clarity', label: '清晰度', defaultValue: 0, min: -1, max: 1, step: 0.1, enabled: false,
        处理函数: 调整清晰度
    },
    {
        key: 'radius', label: '锐化半径', defaultValue: 1, min: 0.5, max: 5, step: 0.1, enabled: false,
        处理函数: 调整锐化半径
    },
    {
        key: 'detail', label: '细节', defaultValue: 0, min: -1, max: 1, step: 0.1, enabled: false,
        处理函数: 调整细节
    },
    {
        key: 'protection', label: '细节保护', defaultValue: 0.5, min: 0, max: 1, step: 0.1, enabled: false,
        处理函数: 调整细节保护
    }
]