import { requirePluginDeps } from '../../../../module/requireDeps.js';
import { GPU } from '../../../../../../static/gpu.js';
const sharp = requirePluginDeps('sharp')
/**
 * 从高度图生成法线贴图
 * @param {Sharp} img Sharp实例
 * @param {Object} options 选项
 * @param {number} options.strength 法线强度
 * @param {number} options.blur 模糊程度
 * @returns {Promise<Sharp>} 处理后的Sharp实例
 */
export async function 生成法线图(img, options = {}) {
    console.time('生成法线图总耗时'); // 开始记录总时间

    let {
        strength = 1.0,
        blur = 0
    } = options;
    strength = 50 - strength * 10
    // 获取图像元数据
    const metadata = await img.metadata();
    const { width, height } = metadata;

    // 确保输入图像是灰度图
    let processedImg = img.clone().grayscale();

    // 如果需要模糊，进行模糊处理
    if (blur > 0) {
        processedImg = processedImg.blur(blur);
    }

    // 创建X方向的Sobel算子
    const xKernel = [
        [-1, 0, 1],
        [-2, 0, 2],
        [-1, 0, 1]
    ].flat();

    // 创建Y方向的Sobel算子
    const yKernel = [
        [-1, -2, -1],
        [0, 0, 0],
        [1, 2, 1]
    ].flat();

    // 并行计算X和Y方向梯度
    const [dx, dy] = await Promise.all([
        processedImg.clone()
            .convolve({
                width: 3,
                height: 3,
                kernel: xKernel,
                scale: strength,
                offset: 128
            })
            .extractChannel(0)
            .raw()
            .toBuffer(),
        processedImg.clone()
            .convolve({
                width: 3,
                height: 3,
                kernel: yKernel,
                scale: strength,
                offset: 128
            })
            .extractChannel(0)
            .raw()
            .toBuffer()
    ]);

    // 创建Z通道（固定值255表示完全向上的法线）
    const dz = Buffer.alloc(width * height, 255);

    // 创建包含所有通道数据的单个缓冲区
    const normalMap = Buffer.alloc(width * height * 3);

    // 将 dx, dy, dz 数据复制到对应的通道
    for (let i = 0; i < width * height; i++) {
        normalMap[i * 3] = dx[i];     // R 通道 - X 方向
        normalMap[i * 3 + 1] = dy[i]; // G 通道 - Y 方向
        normalMap[i * 3 + 2] = dz[i]; // B 通道 - Z 方向
    }
    console.timeEnd('生成法线图总耗时'); // 开始记录总时间

    return await sharp(normalMap, {
        raw: {
            width,
            height,
            channels: 3
        }
    })
        .toColorspace('srgb')
        .png(); // 确保输出为PNG格式
}

/**
 * 从高度图生成法线贴图
 * @param {Sharp} img Sharp实例
 * @param {Object} options 选项
 * @param {number} options.strength 法线强度
 * @param {number} options.blur 模糊程度
 * @returns {Promise<Sharp>} 处理后的Sharp实例
 */
export async function 生成法线图GPU(img, options = {}) {
    console.time('生成法线图总耗时GPU'); // 开始记录总时间

    let {
        strength = 1.0,
        blur = 0
    } = options;
    strength = 50 - strength * 10
    // 获取图像元数据
    const metadata = await img.metadata();
    const { width, height } = metadata;

    // 确保输入图像是灰度图
    let processedImg = img.clone().grayscale();

    // 如果需要模糊，进行模糊处理
    if (blur > 0) {
        processedImg = processedImg.blur(blur);
    }

    // 创建X方向的Sobel算子
    const xKernel = [
        [-1, 0, 1],
        [-2, 0, 2],
        [-1, 0, 1]
    ].flat();

    // 创建Y方向的Sobel算子
    const yKernel = [
        [-1, -2, -1],
        [0, 0, 0],
        [1, 2, 1]
    ].flat();

    // 并行计算X和Y方向梯度
    const [dx, dy] = await Promise.all([
        processedImg.clone()
            .convolve({
                width: 3,
                height: 3,
                kernel: xKernel,
                scale: strength,
                offset: 128
            })
            .extractChannel(0)
            .raw()
            .toBuffer(),
        processedImg.clone()
            .convolve({
                width: 3,
                height: 3,
                kernel: yKernel,
                scale: strength,
                offset: 128
            })
            .extractChannel(0)
            .raw()
            .toBuffer()
    ]);

    // 创建Z通道（固定值255表示完全向上的法线）
    const dz = Buffer.alloc(width * height, 255);


    const gpu = new GPU();

    // 创建GPU内核函数来处理法线图数据
    const generateNormalMapKernel = gpu.createKernel(function (dx, dy, dz, width) {
        const i = this.thread.x;
        const channel = i % 3; // 每三个一循环，0对应dx, 1对应dy, 2对应dz
        if (channel === 0) {
            return dx[Math.floor(i / 3)];
        } else if (channel === 1) {
            return dy[Math.floor(i / 3)];
        } else {
            return dz[Math.floor(i / 3)];
        }
    }, {
        output: [width * height * 3], // 输出为线性数组
        graphical: false
    })

    // 使用GPU内核函数替换原有的循环
    const normalMapData = generateNormalMapKernel(dx, dy, dz, width);
    const normalMap = Buffer.from(normalMapData);    // 直接使用组合好的通道数据创建图像
    console.timeEnd('生成法线图总耗时GPU'); // 开始记录总时间

    return await sharp(normalMap, {
        raw: {
            width,
            height,
            channels: 3
        }
    })
        .toColorspace('srgb')
        .png(); // 确保输出为PNG格式
}
