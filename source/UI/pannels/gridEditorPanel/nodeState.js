import { ref,computed } from "../../../../static/vue.esm-browser.js"
import { createShapeMask } from "../../../utils/canvas/helpers/mask.js"

export const useNodeImage = () => {
    const nodeImageUrl = ref('')
    const nodeTransform = ref({
        scale: 1,
        rotation: 0,
        translate: { x: 0, y: 0 }
    })
    const nodeShape = ref('circle')
    const polygonSettings = ref({
        sides: 6, // 默认6边形
        radius: 20,
        rotation: 0
    })
    const nodeStrokeWidth = ref(1)
    const nodeStrokeColor = ref('#000000')
    const processedNodeImage = computed(async () => {
        return nodeImageUrl.value&&await 绘制形状遮罩的图像(
            nodeImageUrl.value,
            nodeShape.value,
            polygonSettings.value,
            nodeStrokeWidth.value,
            nodeStrokeColor.value,
            nodeTransform.value
        )
    })
    return {
        nodeImageUrl,
        nodeShape,
        polygonSettings,
        nodeStrokeWidth,
        nodeStrokeColor,
        nodeTransform,
        processedNodeImage
    }
}



/**
 * 处理节点图像并应用形状遮罩
 * @param {string} 图片地址 - 图片的URL
 * @param {Object} 节点形状 - 节点的形状配置
 * @param {Object} 多边形设置 - 多边形的配置参数
 * @param {number} 边框宽度 - 节点边框宽度
 * @param {string} 边框颜色 - 节点边框颜色
 * @param {Object} 变换参数 - 节点的变换参数(缩放、旋转等)
 * @returns {Promise<string>} 处理后的图片数据URL
 */
export const 绘制形状遮罩的图像 = async (图片地址, 节点形状, 多边形设置, 边框宽度, 边框颜色, 变换参数) => {
    console.log(图片地址, 节点形状, 多边形设置, 边框宽度, 边框颜色, 变换参数)
    return new Promise((resolve) => {
        const img = new Image();
        img.src = 图片地址;
        img.onload = () => {
            const tempCanvas = document.createElement('canvas');
            const size = Math.max(img.width, img.height);
            tempCanvas.width = size;
            tempCanvas.height = size;
            const ctx = tempCanvas.getContext('2d');
            // 居中绘制原始图像
            ctx.drawImage(img,
                (size - img.width) / 2,
                (size - img.height) / 2,
                img.width,
                img.height
            );
            const shape = {
                type: 'polygon',
                sides: 多边形设置.sides
            }
            // 应用裁剪遮罩
            const clipMask = createShapeMask(
                节点形状 === "polygon" ? shape : 节点形状,
                size,
                true,
                边框宽度,
                边框颜色,
                变换参数
            );
            ctx.globalCompositeOperation = 'destination-in';
            ctx.drawImage(clipMask, 0, 0);
            // 添加边框
            ctx.globalCompositeOperation = 'source-over';
            const strokeMask = createShapeMask(
                节点形状 === "polygon" ? shape : 节点形状,
                size,
                false,
                边框宽度,
                边框颜色,
                变换参数
            );
            ctx.drawImage(strokeMask, 0, 0);
            resolve(tempCanvas.toDataURL());
        };
    });
};


