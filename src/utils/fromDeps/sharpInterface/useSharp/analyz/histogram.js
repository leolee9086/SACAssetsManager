
/**
 * 转换为像素直方图
 * @param {Sharp} sharpObj - Sharp对象
 * @param {Object} [options] - 输出选项
 * @returns {Promise<Object>} 直方图数据
 * @example
 * const histogram = await toHistogram(sharpObj);
 */
export const toHistogram = async (sharpObj, options = {}) => {
    const { data } = await sharpObj.raw().toBuffer({ resolveWithObject: true });
    const histogram = {
        r: new Array(256).fill(0),
        g: new Array(256).fill(0),
        b: new Array(256).fill(0),
        a: new Array(256).fill(0)
    };
    
    for (let i = 0; i < data.length; i += 4) {
        histogram.r[data[i]]++;
        histogram.g[data[i + 1]]++;
        histogram.b[data[i + 2]]++;
        histogram.a[data[i + 3]]++;
    }
    
    return histogram;
};
