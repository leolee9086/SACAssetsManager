export const 计算归一化向量余弦相似度 = (向量1, 向量2) => {


    

    // 计算点积
    let 点积 = 0;
    for (let i = 0; i < 向量1.length; i++) {
        点积 += 向量1[i] * 向量2[i];
    }
    
    // 计算向量模长
    const 模长1 = Math.sqrt(向量1.reduce((sum, val) => sum + val * val, 0));
    const 模长2 = Math.sqrt(向量2.reduce((sum, val) => sum + val * val, 0));
    

    // 计算并返回余弦相似度
    return 点积 / (模长1 * 模长2);
}
