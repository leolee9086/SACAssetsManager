export function 计算灰度图像数据哈希(data) {
    let hash = 0;
    for (let i = 0; i < data.length; i += 4) {
        const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
        hash = ((hash << 5) - hash + gray) | 0;
    }
    return hash.toString(16);
}
