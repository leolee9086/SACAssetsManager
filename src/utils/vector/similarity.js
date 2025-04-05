export const 计算归一化向量余弦相似度 = (向量1, 向量2) => {
    // 检查输入有效性
    if (!向量1 || !向量2) {
        return 0; // 当任一向量为空时返回0
    }
    
    // 检查向量长度
    if (向量1.length !== 向量2.length) {
        // 如果向量长度不相同但都不为空，取最小长度进行计算
        const 最小长度 = Math.min(向量1.length, 向量2.length);
        if (最小长度 === 0) {
            return 0;
        }
        
        // 截取相同长度的部分
        const 截取向量1 = 向量1.length > 最小长度 ? 向量1.slice(0, 最小长度) : 向量1;
        const 截取向量2 = 向量2.length > 最小长度 ? 向量2.slice(0, 最小长度) : 向量2;
        
        // 递归调用自身计算截取后的向量相似度
        return 计算归一化向量余弦相似度(截取向量1, 截取向量2);
    }
    
    // 如果两个向量都是空的，则返回1（认为完全相同）
    if (向量1.length === 0 && 向量2.length === 0) {
        return 1;
    }
    
    // 计算点积
    let 点积 = 0;
    for (let i = 0; i < 向量1.length; i++) {
        点积 += 向量1[i] * 向量2[i];
    }
    
    // 计算向量模长
    const 模长1 = Math.sqrt(向量1.reduce((sum, val) => sum + val * val, 0));
    const 模长2 = Math.sqrt(向量2.reduce((sum, val) => sum + val * val, 0));
    
    // 避免除以零的情况
    if (模长1 === 0 || 模长2 === 0) {
        return 0; // 如果任一向量模长为0，则认为相似度为0
    }
    
    // 计算并返回余弦相似度
    return 点积 / (模长1 * 模长2);
}
