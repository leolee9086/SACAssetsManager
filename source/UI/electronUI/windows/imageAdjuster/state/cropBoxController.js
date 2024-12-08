import { ref } from "../../../../../../static/vue.esm-browser.js"
export const cropBox = ref(
    {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        maintainAspectRatio: false
    }
)
export const cropStartPos = ref({ x: 0, y: 0 })
export const cropResizeHandle = ref(null)
export const isDraggingCrop = ref(false)
export const 开始拖拽裁剪框 =()=>isDraggingCrop.value=true
export const 停止拖拽裁剪框 =()=>{
    isDraggingCrop.value = false
};

// 裁剪框的控制点
export const cropHandles = [
    { position: 'nw' }, { position: 'n' }, { position: 'ne' },
    { position: 'w' }, { position: 'e' },
    { position: 'sw' }, { position: 's' }, { position: 'se' }
];
export const 更新裁剪开始位置 =(e, position) => {
    cropResizeHandle.value = position;
    cropStartPos.value = {
        x: e.clientX,
        y: e.clientY,
        initialBox: { ...cropBox.value }
    };
};
export const 从图片元素和容器初始化裁剪框 = (container,processedImage)=>{
    if (!container || !processedImage) return;
    const rect = container.getBoundingClientRect();
    const imgRect = processedImage.getBoundingClientRect();
    // 计算实际的图像区域（考虑缩放和偏移）
    const imageArea = {
        x: imgRect.left - rect.left,
        y: imgRect.top - rect.top,
        width: imgRect.width,
        height: imgRect.height
    };
    // 初始化裁剪框
    裁剪框控制器.应用裁剪框(imageArea)
    裁剪框控制器.设置比例保持(false)
}

export const 裁剪框控制器 = {
    移动裁剪框: (x, y, width, height) => {
        const 安全数值 = (值, 最小值 = 0) => Math.max(最小值, Number(值) || 最小值)
        cropBox.value.x = 安全数值(x)
        cropBox.value.y = 安全数值(y)
        cropBox.value.width = 安全数值(width, 50)
        cropBox.value.height = 安全数值(height, 50)
    },
    应用裁剪框: (裁剪框) => {
        if (!裁剪框 || typeof 裁剪框 !== 'object') {
            console.warn('无效的裁剪框数据')
            return
        }
        
        裁剪框控制器.移动裁剪框(
            裁剪框.x,
            裁剪框.y,
            裁剪框.width,
            裁剪框.height
        )
    },
    设置比例保持: (flag) => {
        cropBox.value.maintainAspectRatio = Boolean(flag)
    },
    获取当前比例: () => {
        return cropBox.value.width / cropBox.value.height
    },
    按比例调整: (targetRatio) => {
        if (!targetRatio || targetRatio <= 0) return
        const currentHeight = cropBox.value.height
        cropBox.value.width = Math.max(50, currentHeight * targetRatio)
    },
    约束在边界: (maxWidth, maxHeight) => {
        cropBox.value.x = Math.min(Math.max(0, cropBox.value.x), maxWidth - cropBox.value.width)
        cropBox.value.y = Math.min(Math.max(0, cropBox.value.y), maxHeight - cropBox.value.height)
        cropBox.value.width = Math.min(cropBox.value.width, maxWidth - cropBox.value.x)
        cropBox.value.height = Math.min(cropBox.value.height, maxHeight - cropBox.value.y)
    },
    获取裁剪数据: () => {
        return {
            x: Math.round(cropBox.value.x),
            y: Math.round(cropBox.value.y),
            width: Math.round(cropBox.value.width),
            height: Math.round(cropBox.value.height),
            比例: cropBox.value.maintainAspectRatio
        }
    },
    归零: () => {
        cropBox.value = {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            maintainAspectRatio: false
        }
    },
    获取css尺寸样式:()=>{
        return {
            left: `${cropBox.value.x}px`,
            top: `${cropBox.value.y}px`,
            width: `${cropBox.value.width}px`,
            height: `${cropBox.value.height}px`
        }
    },
    相对归一坐标: (投影偏移向量, 参考矩形) => {
        if (!参考矩形 || !参考矩形.width || !参考矩形.height) {
            console.warn('无效的参考矩形')
            return null
        }
        return {
            x: (cropBox.value.x - 投影偏移向量.x) / 参考矩形.width,
            y: (cropBox.value.y - 投影偏移向量.y) / 参考矩形.height,
            width: cropBox.value.width / 参考矩形.width,
            height: cropBox.value.height / 参考矩形.height
        }
    },
    反归一化坐标:(归一化坐标,参考系)=>{
        if (!归一化坐标 || !参考系?.width || !参考系?.height) {
            console.warn('无效的参数')
            return null
        }
        return {
            x: Math.round(归一化坐标.x * 参考系.width),
            y: Math.round(归一化坐标.y * 参考系.height),
            width: Math.round(归一化坐标.width * 参考系.width),
            height: Math.round(归一化坐标.height * 参考系.height)
        }
    },
    坐标映射: (投影偏移向量, 源参考系, 目标参考系) => {
        if (!源参考系?.width || !源参考系?.height || 
            !目标参考系?.width || !目标参考系?.height) {
            console.warn('无效的参考系参数')
            return null
        }
        // 第一步：归一化
        const 归一化坐标 = 裁剪框控制器.相对归一坐标(
            投影偏移向量,
            源参考系
        )
        if (!归一化坐标) return null
        // 第二步：反归一化到目标系统
        return 裁剪框控制器.反归一化坐标(
            归一化坐标,
            目标参考系
        )
    },
}



