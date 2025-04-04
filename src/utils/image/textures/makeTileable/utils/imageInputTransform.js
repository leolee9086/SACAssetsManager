/**
 * 将ImageData对象转换为自定义的图像输入格式。
 * @param {ImageData} imageData - 包含像素数据的ImageData对象。ImageData对象应包含属性width、height和data。
 * @param {function} mapFunc - 用于处理每个通道值的映射函数，默认为恒等函数。该函数接收一个数字参数并返回一个数字。
 * @returns {Object} 返回一个包含四个通道数据（红、绿、蓝、Alpha）和图像尺寸的对象。结构如下：
 * {
 *   dataR: Array<Array<number>>, // 红色通道数据，二维数组，每个内部数组代表一行像素
 *   dataG: Array<Array<number>>, // 绿色通道数据，同上
 *   dataB: Array<Array<number>>, // 蓝色通道数据，同上
 *   dataA: Array<Array<number>>, // Alpha通道数据，同上
 *   width: number, // 图像宽度
 *   height: number // 图像高度
 * }
 */
export function imageDataToImageInput(imageData, mapFunc = x => x) {
    let imageInput = {
        dataR: [],
        dataG: [],
        dataB: [],
        dataA: [], // 添加Alpha通道数组
        width: imageData.width,
        height: imageData.height
    };

    for (let j = 0; j < imageData.height; j++) {
        imageInput.dataR[j] = [];
        imageInput.dataG[j] = [];
        imageInput.dataB[j] = [];
        imageInput.dataA[j] = []; // 初始化Alpha通道数组
        for (let i = 0; i < imageData.width; i++) {
            let index = (i + j * imageData.width) * 4;
            imageInput.dataR[j][i] = mapFunc(imageData.data[index]);
            imageInput.dataG[j][i] = mapFunc(imageData.data[index + 1]);
            imageInput.dataB[j][i] = mapFunc(imageData.data[index + 2]);
            imageInput.dataA[j][i] = mapFunc(imageData.data[index + 3]); // 存储Alpha通道数据
        }
    }

    return imageInput;
}

/**
 * 将自定义的图像输入格式转换回ImageData对象。
 * @param {Object} imageInput - 包含四个通道数据（红、绿、蓝、Alpha）和图像尺寸的对象。
 * @param {function} mapFunc - 用于处理每个通道值的映射函数，默认为恒等函数。
 * @returns {ImageData} 返回新的ImageData对象，包含处理后的像素数据。
 */
export function imageInputToImageData(imageInput, mapFunc = x => x) {
    let imageData = new ImageData(imageInput.width, imageInput.height);
    for (let j = 0; j < imageInput.height; j++) {
        for (let i = 0; i < imageInput.width; i++) {
            let index = (i + j * imageInput.width) * 4;
            imageData.data[index] = mapFunc(imageInput.dataR[j][i]);
            imageData.data[index + 1] = mapFunc(imageInput.dataG[j][i]);
            imageData.data[index + 2] = mapFunc(imageInput.dataB[j][i]);
            imageData.data[index + 3] =(imageInput.dataA&&mapFunc(imageInput.dataA[j][i]))||255; // 设置Alpha通道
        }
    }

    return imageData;
}

export function emptyImageInput(width, height) {
    let output = {
        dataR: [], 
        dataG: [], 
        dataB: [], 
        dataA: [], // Add Alpha channel array
        width: width, 
        height: height
    };
    for (var j = 0; j < output.height; ++j) {
        output.dataR[j] = [];
        output.dataG[j] = [];
        output.dataB[j] = [];
        output.dataA[j] = []; // Initialize Alpha channel array
        for (var i = 0; i < output.width; ++i) {
            output.dataR[j][i] = 0;
            output.dataG[j][i] = 0;
            output.dataB[j][i] = 0;
            output.dataA[j][i] = 255; // Set Alpha channel to 255
        }
    }
    return output;
}