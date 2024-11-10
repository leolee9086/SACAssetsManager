import { 柯里化 } from "../../../../../utils/functions/currying.js";
import { 坐标系 } from "./CoordinateSystemDefines.js";
/**
 * @typedef {Object} 二维点
 * @property {number} x - X坐标
 * @property {number} y - Y坐标
 */

/**
 * @typedef {Object} 三维点
 * @property {number} x - X坐标
 * @property {number} y - Y坐标
 * @property {number} z - Z坐标
 */

/**
 * @typedef {Object} 极坐标点
 * @property {number} r - 半径
 * @property {number} theta - 角度
 */


/**
 * 将对象形式的点转换为数组形式
 * @template {readonly string[]} T
 * @param {T} 坐标符号
 * @returns {(点对象: { [K in T[number]]: number }) => number[]}
 */
export const 点对象转数组 = 柯里化((坐标符号) => (点对象) => 
    坐标符号.map(符号 => 点对象[符号])
);

/**
 * 将数组形式的点转换为对象形式
 * @template {readonly string[]} T
 * @param {T} 坐标符号
 * @returns {(点数组: number[]) => { [K in T[number]]: number }}
 */
export const 点数组转对象 = 柯里化((坐标符号) => (点数组) =>
    Object.fromEntries(坐标符号.map((符号, 索引) => [符号, 点数组[索引]]))
);

/**
 * 将多个对象形式的点转换为一维数组
 * @template {readonly string[]} T
 * @param {T} 坐标符号
 * @returns {(点对象数组: { [K in T[number]]: number }[]) => number[]}
 */
export const 点对象数组转一维数组 = 柯里化((坐标符号) => {
    const 转换器 = 点对象转数组(坐标符号);
    return (点对象数组) => 点对象数组.flatMap(转换器);
});

/**
 * 将一维数组转换为对象形式的点数组
 * @template {readonly string[]} T
 * @param {T} 坐标符号
 * @returns {(一维数组: number[]) => { [K in T[number]]: number }[]}
 */
export const 一维数组转点对象数组 = 柯里化((坐标符号) => {
    const 维度 = 坐标符号.length;
    const 转换器 = 点数组转对象(坐标符号);
    
    return (一维数组) => {
        const 结果 = [];
        for (let i = 0; i < 一维数组.length; i += 维度) {
            结果.push(转换器(一维数组.slice(i, i + 维度)));
        }
        return 结果;
    };
});

/**
 * 创建坐标系统的转换器
 * @template {readonly string[]} T
 * @param {T} 坐标符号
 * @returns {{ 
 *   点对象转数组: (点对象: { [K in T[number]]: number }) => number[],
 *   点数组转对象: (点数组: number[]) => { [K in T[number]]: number },
 *   点对象数组转一维数组: (点对象数组: { [K in T[number]]: number }[]) => number[],
 *   一维数组转点对象数组: (一维数组: number[]) => { [K in T[number]]: number }[]
 * }}
 */
function 创建转换器(坐标符号) {
    return {
        点对象转数组: 点对象转数组(坐标符号),
        点数组转对象: 点数组转对象(坐标符号),
        点对象数组转一维数组: 点对象数组转一维数组(坐标符号),
        一维数组转点对象数组: 一维数组转点对象数组(坐标符号)
    };
}

// 为每个坐标系统创建转换器
export const 一维转换器 = 创建转换器(坐标系.一维);
export const 二维转换器 = 创建转换器(坐标系.二维);
export const 三维转换器 = 创建转换器(坐标系.三维);
export const 四维转换器 = 创建转换器(坐标系.四维);
export const 极坐标转换器 = 创建转换器(坐标系.极坐标);
export const 柱坐标转换器 = 创建转换器(坐标系.柱坐标);
export const 球坐标转换器 = 创建转换器(坐标系.球坐标);
export const UV转换器 = 创建转换器(坐标系.UV);
export const UVW转换器 = 创建转换器(坐标系.UVW);
export const RGB转换器 = 创建转换器(坐标系.RGB);
export const RGBA转换器 = 创建转换器(坐标系.RGBA);
export const HSL转换器 = 创建转换器(坐标系.HSL);
export const HSV转换器 = 创建转换器(坐标系.HSV);
export const CMYK转换器 = 创建转换器(坐标系.CMYK);
export const AABB二维转换器 = 创建转换器(坐标系.AABB二维);
export const AABB三维转换器 = 创建转换器(坐标系.AABB三维);
export const 四元数转换器 = 创建转换器(坐标系.四元数);
export const 欧拉角转换器 = 创建转换器(坐标系.欧拉角);
export const 屏幕坐标转换器 = 创建转换器(坐标系.屏幕坐标);
export const 客户端坐标转换器 = 创建转换器(坐标系.客户端坐标);
export const 页面坐标转换器 = 创建转换器(坐标系.页面坐标);
export const 像素转换器 = 创建转换器(坐标系.像素);
export const 像素RGBA转换器 = 创建转换器(坐标系.像素RGBA);