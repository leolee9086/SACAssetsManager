import { 计算归一化向量余弦相似度 } from "../../../../../src/utils/vector/similarity.js"
import { 获取数据项向量字段值 } from "./item.js";

export function 计算数据项距离(数据项1, 数据项2, 模型名称) {
    // 如果任一数据项为null，或者不包含必要的向量数据，则返回最大距离1
    if (!数据项1 || !数据项2) {
        return 1; // 对于缺失的数据项，返回最大距离
    }
    
    let 向量1 = 获取数据项向量字段值(数据项1, 模型名称);
    let 向量2 = 获取数据项向量字段值(数据项2, 模型名称);
    
    // 检查向量是否为空
    if (!向量1.length || !向量2.length) {
        return 1; // 如果任一向量为空，返回最大距离
    }
    
    let 距离 = 1 - 计算归一化向量余弦相似度(向量1, 向量2);
    return 距离 || 1; // 确保返回有效距离，避免NaN或undefined
}
