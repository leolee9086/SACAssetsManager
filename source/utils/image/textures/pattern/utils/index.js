export function 从晶格获取最小重复单元(lattice) {
    const { basis1, basis2 } = lattice;
    
    // 计算基向量的分量比
    const ratioX = Math.abs(basis2.x / basis1.x);
    const ratioY = Math.abs(basis2.y / basis1.y);
    
    // 找到最小的整数倍数使得两个基向量的分量比接近整数
    const findMinimalMultiple = (ratio) => {
        if (Math.abs(ratio) < 0.001) return 1;
        const precision = 1e-6;
        let i = 1;
        while (i < 10) {
            if (Math.abs(Math.round(ratio * i) - ratio * i) < precision) {
                return i;
            }
            i++;
        }
        return 1;
    };
    
    const mx = findMinimalMultiple(ratioX);
    const my = findMinimalMultiple(ratioY);
    
    // 计算最小无缝单元的尺寸
    return {
        width: Math.abs(basis1.x * mx) + Math.abs(basis2.x * my),
        height: Math.abs(basis1.y * mx) + Math.abs(basis2.y * my)
    };
}
 /**
* 生成晶格网格线数据
* @param {Object} 基向量1 - 晶格基向量1 {x: number, y: number}
* @param {Object} 基向量2 - 晶格基向量2 {x: number, y: number}
* @param {Object} 网格范围 - 网格索引范围 {minI: number, maxI: number, minJ: number, maxJ: number}
* @returns {Array<{startX: number, startY: number, endX: number, endY: number}>} 网格线数组
*/
export function 以基向量对生成网格线数据(基向量1, 基向量2, 网格范围) {
   const 网格线 = [];
   
   // 生成基向量1方向的平行线族
   for (let i = 网格范围.minI; i <= 网格范围.maxI; i++) {
       网格线.push({
           startX: 基向量1.x * i + 基向量2.x * 网格范围.minJ,
           startY: 基向量1.y * i + 基向量2.y * 网格范围.minJ,
           endX: 基向量1.x * i + 基向量2.x * 网格范围.maxJ,
           endY: 基向量1.y * i + 基向量2.y * 网格范围.maxJ
       });
   }

   // 生成基向量2方向的平行线族
   for (let j = 网格范围.minJ; j <= 网格范围.maxJ; j++) {
       网格线.push({
           startX: 基向量1.x * 网格范围.minI + 基向量2.x * j,
           startY: 基向量1.y * 网格范围.minI + 基向量2.y * j,
           endX: 基向量1.x * 网格范围.maxI + 基向量2.x * j,
           endY: 基向量1.y * 网格范围.maxI + 基向量2.y * j
       });
   }
   
   return 网格线;
}
