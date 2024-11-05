export function 计算图像感知哈希(data,THUMBNAIL_SIZE) {
    const size = THUMBNAIL_SIZE;
    const dctSize = 8; // DCT 的大小

    // 转换为灰度图像
    const grayData = new Float64Array(size * size);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        grayData[j] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    }

    // 计算 DCT
    const dct = 应用离散余弦变换(grayData, size);

    // 提取低频部分
    const dctLow = new Float64Array(dctSize * dctSize);
    for (let i = 0; i < dctSize; i++) {
        for (let j = 0; j < dctSize; j++) {
            dctLow[i * dctSize + j] = dct[i * size + j];
        }
    }

    // 计算平均值（不包括第一个元素，因为它代表直流分量）
    const avg = dctLow.slice(1).reduce((sum, val) => sum + val, 0) / (dctSize * dctSize - 1);

    // 生成哈希
    let hash = '';
    for (let i = 0; i < dctLow.length; i++) {
        hash += dctLow[i] > avg ? '1' : '0';
    }

    return hash;
}
export function 计算图像相似度(hash1, hash2) {
    if (hash1.length !== hash2.length) {
        throw new Error('哈希值长度不一致，无法计算相似度');
    }
    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] !== hash2[i]) {
            distance++;
        }
    }
    // 计算相似度，1 - (汉明距离 / 哈希长度)
    const similarity = 1 - (distance / hash1.length);
    return similarity;
}
function 应用离散余弦变换(data, N) {
    const output = new Float64Array(N * N);
    for (let u = 0; u < N; u++) {
        for (let v = 0; v < N; v++) {
            let sum = 0;
            for (let i = 0; i < N; i++) {
                for (let j = 0; j < N; j++) {
                    sum += data[i * N + j] * 
                           Math.cos(((2 * i + 1) * u * Math.PI) / (2 * N)) * 
                           Math.cos(((2 * j + 1) * v * Math.PI) / (2 * N));
                }
            }
            sum *= (2 / N) * (u === 0 ? 1 / Math.sqrt(2) : 1) * (v === 0 ? 1 / Math.sqrt(2) : 1);
            output[u * N + v] = sum;
        }
    }
    return output;
}