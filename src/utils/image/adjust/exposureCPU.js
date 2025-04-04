import { fromBuffer } from "../../fromDeps/sharpInterface/useSharp/toSharp.js";
import { getHistogramFromSharp } from "../histogram.js";
import { getHistogramWebGPU } from "../histogram/webgpu.js";
//const 亮度调整 = 亮度调整基础 * (0.8 + 0.4 * Math.sin(Math.PI * x));

async function 应用自动曝光与强度(buffer, 直方图, 宽度, 高度, 通道数, 强度 = 1.0, 迭代次数 = 1) {
    const 总像素 = 宽度 * 高度;
    const 累积分布函数 = new Array(256).fill(0);
    累积分布函数[0] = 直方图[0];
    for (let i = 1; i < 256; i++) {
        累积分布函数[i] = 累积分布函数[i - 1] + 直方图[i];
    }
    const 累积分布函数最小值 = 累积分布函数.find(value => value > 0) || 0;

    for  (let iter = 0; iter < 迭代次数; iter++) {
        // 使用蒙特卡洛采样进行局部亮度分析
        const 采样点集 = 蒙特卡洛采样(buffer, 900000, 通道数);
        const 局部亮度统计 = new Array(16).fill(0); // 将亮度范围分为16个区间
        
        for (const 点 of 采样点集) {
            const 亮度 = Math.round(0.299 * 点.r + 0.587 * 点.g + 0.114 * 点.b);
            const 区间索引 = Math.floor(亮度 / 16);
            局部亮度统计[区间索引]++;
        }
        
        // 使用局部亮度统计来优化调整参数
        const 局部动态范围 = 评估局部动态范围(局部亮度统计);
        const 局部调整系数 = 计算局部调整系数(局部动态范围);
        
        // 动态范围评估
        
        const 动态范围 = 评估动态范围(直方图);
        const { 高光, 阴影 } = 检测高光和阴影(直方图);

        // 设定目标曝光调整
        const 目标曝光调整 = 设定目标曝光(
            计算平均亮度(buffer),
            动态范围,
            高光,
            阴影
        );

        for (let i = 0; i < buffer.length; i += 通道数) {
            const r = buffer[i];
            const g = buffer[i + 1];
            const b = buffer[i + 2];

            const 原始亮度 = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            
            // 改进亮度映射，使用更平滑的曲线
            const 归一化亮度 = 原始亮度 / 255;
            const 目标亮度基础 = ((累积分布函数[原始亮度] - 累积分布函数最小值) / (总像素 - 累积分布函数最小值)) * 255;
            
            // 保护高光和暗部的动态范围
            const 保护系数 = Math.pow(Math.abs(归一化亮度 - 0.5) * 2, 0.5);
            const 目标亮度 = 原始亮度 * 保护系数 + 目标亮度基础 * (1 - 保护系数);

            // 更温和的S型曲线
            const x = 原始亮度 / 255;
            const s型曲线 = 1 / (1 + Math.exp(-8 * (x - 0.5))); // 降低曲线陡度

            const 亮度调整基础 = 强度 * (目标亮度 - 原始亮度 + 目标曝光调整);
            // 使用s型曲线调整亮度变化
            const 亮度调整 = 亮度调整基础 * (0.5 + s型曲线 * 0.5);

            // 更保守的调整因子
            const 调整因子 = 1 + (局部调整系数 * 动态范围 / 255) * 0.2;
            const 精细调整 = 亮度调整 * 调整因子;

            // 更灵活的限制调整
            const 基础限制 = 45; // 降低最大调整幅度
            const 动态限制 = 基础限制 * (1 - Math.pow(Math.abs(原始亮度 - 128) / 128, 2));
            const 限制调整 = Math.max(-动态限制, Math.min(动态限制, 精细调整));

            buffer[i] = Math.min(255, Math.max(0, Math.round(r + 限制调整)));
            buffer[i + 1] = Math.min(255, Math.max(0, Math.round(g + 限制调整)));
            buffer[i + 2] = Math.min(255, Math.max(0, Math.round(b + 限制调整)));
        }
        直方图 = await getHistogramWebGPU({ data:buffer,width:宽度,height:高度 })
    }
    return buffer;
}

// 其他辅助函数
function 评估动态范围(直方图, 采样置信度 = 0.95) {
    const 采样阈值 = Math.max(1, Math.floor(直方图.reduce((a, b) => a + b, 0) * (1 - 采样置信度)));
    
    let 累积计数 = 0;
    let 最小亮度 = 0;
    for (let i = 0; i < 直方图.length; i++) {
        累积计数 += 直方图[i];
        if (累积计数 > 采样阈值) {
            最小亮度 = i;
            break;
        }
    }
    
    累积计数 = 0;
    let 最大亮度 = 255;
    for (let i = 直方图.length - 1; i >= 0; i--) {
        累积计数 += 直方图[i];
        if (累积计数 > 采样阈值) {
            最大亮度 = i;
            break;
        }
    }
    
    return 最大亮度 - 最小亮度;
}

function 检测高光和阴影(直方图) {
    const 高光阈值 = 240;
    const 阴影阈值 = 15;
    let 高光 = 0;
    let 阴影 = 0;
    for (let i = 高光阈值; i < 直方图.length; i++) {
        高光 += 直方图[i];
    }
    for (let i = 0; i <= 阴影阈值; i++) {
        阴影 += 直方图[i];
    }
    return { 高光, 阴影 };
}

function 计算平均亮度(buffer) {
    // 使用蒙特卡洛采样代替全像素计算
    const 采样数量 = Math.min(1000000, Math.floor(buffer.length / 4 * 0.1)); // 采样10%的像素或最多10000个点
    const 采样点 = 蒙特卡洛采样(buffer, 采样数量, 4);
    
    let 总亮度 = 0;
    for (const 点 of 采样点) {
        const 亮度 = Math.round(0.299 * 点.r + 0.587 * 点.g + 0.114 * 点.b);
        总亮度 += 亮度;
    }
    
    return 总亮度 / 采样点.length;
}

function 设定目标曝光(平均亮度, 动态范围, 高光, 阴影) {
    const 理想平均值 = 128;
    const 理想标准差 = 55; // 增加标准差以允许更大的动态范围

    const 亮度偏差 = 理想平均值 - 平均亮度;
    
    // 更温和的正态分布权重
    const 正态分布权重 = Math.exp(-Math.pow(平均亮度 - 理想平均值, 2) / (2 * Math.pow(理想标准差, 2)));
    
    // 更保守的基础曝光调整
    let 目标曝光 = 亮度偏差 * 0.3 * (1 - 正态分布权重);

    // 更宽松的动态范围要求
    const 理想动态范围 = 200; // 增加理想动态范围
    if (动态范围 < 理想动态范围) {
        目标曝光 += (理想动态范围 - 动态范围) * 0.05; // 降低调整强度
    }

    // 更温和的高光阴影平衡
    const 高光阴影比 = 高光 / (阴影 + 1);
    if (高光阴影比 > 2) {
        目标曝光 -= Math.log(高光阴影比) * 0.3;
    } else if (高光阴影比 < 0.5) {
        目标曝光 += Math.log(1/高光阴影比) * 0.3;
    }

    return 目标曝光;
}

// 添加蒙特卡洛采样辅助函数
function 蒙特卡洛采样(buffer, 采样数量, 通道数) {
    const 采样点 = [];
    const 总像素数 = buffer.length / 通道数;
    
    for (let i = 0; i < 采样数量; i++) {
        const 随机索引 = Math.floor(Math.random() * 总像素数) * 通道数;
        采样点.push({
            r: buffer[随机索引],
            g: buffer[随机索引 + 1],
            b: buffer[随机索引 + 2]
        });
    }
    return 采样点;
}

// 新增辅助函数
function 评估局部动态范围(局部亮度统计) {
    const 总采样数 = 局部亮度统计.reduce((a, b) => a + b, 0);
    const 有效区间阈值 = 总采样数 * 0.02; // 2%的采样点作为有效区间的判断标准
    
    let 最小区间 = 0;
    let 最大区间 = 15;
    
    for (let i = 0; i < 局部亮度统计.length; i++) {
        if (局部亮度统计[i] > 有效区间阈值) {
            最小区间 = i;
            break;
        }
    }
    
    for (let i = 局部亮度统计.length - 1; i >= 0; i--) {
        if (局部亮度统计[i] > 有效区间阈值) {
            最大区间 = i;
            break;
        }
    }
    
    return (最大区间 - 最小区间) * 16; // 转换回亮度范围
}

function 计算局部调整系数(局部动态范围) {
    // 根据局部动态范围调整系数
    const 基准动态范围 = 128;
    return Math.min(1.5, Math.max(0.5, 基准动态范围 / 局部动态范围));
}

export const 自动曝光 = async (sharpObj, 强度) => {
    const { data, info, histogram } = await getHistogramFromSharp(sharpObj);
    const { width, height, channels } = info;
    console.log(width, height, channels)
    // 应用自动曝光调整
    const newData =await 应用自动曝光与强度(data, histogram.brightness, width, height, channels, 强度);
    
    // 将调整后的数据转换回 sharp 对象
    const newSharpObj = await fromBuffer(newData, {
        raw: {
            width: width,
            height: height,
            channels: channels
        }
    });

    return newSharpObj;
}