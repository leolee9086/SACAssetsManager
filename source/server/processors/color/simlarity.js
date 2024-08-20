//最小堆
import { MinHeap } from "../../../utils/array/minHeap.js";
import { RGBA2LAB } from "./colorSpace.js";
import { CIDE2000 } from "./colorDistance.js";
/**
 * 根据rgba颜色标记排序
 * @param {Array<number>} 目标颜色 
 * @param {Array<{rgba:Array<number>}>} rgba颜色数组映射表,其中必须有rgba属性作为排序依据
 * @returns 
 */
export function 根据rgba颜色标记排序(目标颜色,rgba颜色数组映射表){
    const lab颜色数组=rgba颜色数组映射表.map(item=>{
        return {
            lab:RGBA2LAB(item.rgba),
            ...item
        }
    })
    const lab目标颜色=RGBA2LAB(目标颜色)
    return lab颜色数组.sort((a,b)=>{
        return CIDE2000(lab目标颜色,a.lab)-CIDE2000(lab目标颜色,b.lab)
    })
}

