import { Vector2 } from "../../../../src/utils/image/textures/pattern/geometry-utils.js"
export const genPatternConfig = (basis1, basis2, nodeTransform, fillImageUrl, fillTransform, lineColor, lineWidth) => {
    return {
        lattice: {
            basis1: new Vector2(basis1.x, basis1.y),
            basis2: new Vector2(basis2.x, basis2.y),
            shape: 'parallelogram',
            clipMotif: true
        },
        nodeImage: processedNodeImage ? {
            imageUrl: processedNodeImage,
            transform: {
                ...nodeTransform,
                rotation: nodeTransform.rotation
            },
            fitMode: 'contain'
        } : null,
        fillImage: fillImageUrl ? {
            imageUrl: fillImageUrl,
            transform: {
                ...fillTransform,
                rotation: fillTransform.rotation
            },
            fitMode: 'contain'
        } : null,
        render: {
            backgroundColor: 'transparent',
            showGrid: true,
            gridStyle: {
                color: lineColor,
                width: lineWidth,
                dash: []
            },
            scale: 1,
            smoothing: true
        }
    }
}

export const 生成晶格设置 = (基向量1, 基向量2) => {
    return {
        basis1: new Vector2(基向量1.x, 基向量1.y),
        basis2: new Vector2(基向量2.x, 基向量2.y),
        shape: 'parallelogram',
        clipMotif: true
    }
}


export const 生成图片绘制设置 = (晶格点图像, 变换向量, 填充模式) => {
    return 晶格点图像 ? {
        imageUrl: 晶格点图像,
        transform: 变换向量,
        fitMode: 填充模式
    } : null
}



export const 生成图案渲染配置 = (lineColor, lineWidth) => {
    return {
        backgroundColor: 'transparent',
        showGrid: true,
        gridStyle: {
            color: lineColor,
            width: lineWidth,
            dash: []
        },
        scale: 1,
        smoothing: true
    }
}







/**
 * 用于为指定渲染函数和canvas创建双缓冲渲染
 * 
 */
export const 创建双缓冲渲染器 = (渲染函数, 目标画布) => {
    // 创建离屏缓冲画布
    const 缓冲画布 = document.createElement('canvas')
    const 缓冲上下文 = 缓冲画布.getContext('2d')
    // 获取目标画布的上下文
    const 目标上下文 = 目标画布.getContext('2d')
    // 更新缓冲画布尺寸的函数
    const 更新画布尺寸 = () => {
        缓冲画布.width = 目标画布.width
        缓冲画布.height = 目标画布.height
    }
    // 初始化尺寸
    更新画布尺寸()
    // 返回实际的渲染函数
    return (参数) => {
        // 确保画布尺寸同步
        更新画布尺寸()
        // 清空缓冲画布
        缓冲上下文.clearRect(0, 0, 缓冲画布.width, 缓冲画布.height)
        // 在缓冲画布上执行渲染
        渲染函数(缓冲上下文, 参数)
        // 清空目标画布
        目标上下文.clearRect(0, 0, 目标画布.width, 目标画布.height)
        // 将缓冲画布内容复制到目标画布
        目标上下文.drawImage(缓冲画布, 0, 0)
    }
}


