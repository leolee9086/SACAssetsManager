export const 计算向量相似度=(输入点, 点数据集, 相似度算法)=>{
    let 拷贝点
    if (!Array.isArray(输入点)) {
        拷贝点 = JSON.parse(输入点)
    } else {
        拷贝点 = 输入点
    }
    let similarityScores = [];
    for (let v of 点数据集) {
        let similarity = 相似度算法(拷贝点, v.vector);
        similarityScores.push({
            data: v,
            score: similarity
        });
    }
    return similarityScores;
}