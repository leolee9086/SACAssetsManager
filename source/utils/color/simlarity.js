//颜色数组距离计算
//使用CIEDE2000算法计算颜色之间的距离
// 将RGBA颜色转换为LAB颜色
import { RGBA2LAB } from "./colorSpace.js";
export {CIEDE2000} from '../../../src/toolBox/feature/forColors/useSimilarityExports.js'
export function CIE76(color1,color2){
    // 将颜色值转换为整数
    let r1 = color1[0]
    let g1 = color1[1]
    let b1 = color1[2]
  
    let r2 = color2[0]
    let g2 = color2[1]
    let b2 = color2[2]
  
    // 计算CIE76色差公式
    let deltaR = r1 - r2;
    let deltaG = g1 - g2;
    let deltaB = b1 - b2;
    let deltaE = Math.sqrt(deltaR * deltaR + deltaG * deltaG + deltaB * deltaB);
  
    //返回色差值
    return deltaE 
}

const cache = new Map();
export function CIEDE2000RGBA(pix1, pix2) {

    pix1 = pix1.map(item=>Math.floor(item))
    pix2 = pix2.map(item=>Math.floor(item))
    const key1 = pix1.join(',');
    const key2 = pix2.join(',');
    const cacheKey = key1 < key2 ? key1 + '|' + key2 : key2 + '|' + key1;
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }
    const lab1 = RGBA2LAB(pix1[0], pix1[1], pix1[2], pix1[3] || 0);
    const lab2 = RGBA2LAB(pix2[0], pix2[1], pix2[2], pix2[3] || 0);
    const result = CIEDE2000(lab1, lab2);
    cache.set(cacheKey, result);
    return result;
}
