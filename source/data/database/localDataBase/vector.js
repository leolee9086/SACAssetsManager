import { 计算归一化向量余弦相似度 } from "../../../../src/utils/vector/similarity.js";


export async function 查找最相似点(输入点, 点数据集, 查找阈值 = 10, 相似度算法=计算归一化向量余弦相似度, 过滤条件) {
    let 拷贝点 = new Float32Array(输入点)
    let tops = [];
    for (let v of 点数据集) {
        if (过滤条件 && !过滤条件(v)) continue;
        let similarity =await 相似度算法(拷贝点, v.vector);
        if (tops.length < 查找阈值 || similarity > tops[tops.length - 1].score) {
            tops.push({ data: v, score: similarity });
            tops.sort((a, b) => b.score - a.score);
            if (tops.length > 查找阈值) {
                tops.pop();
            }
        }
    }
    return tops;
}

export {查找最相似点 as findSimilarity}