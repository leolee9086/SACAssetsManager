export const 获取相对图像边界 = (容器元素, 图像元素) => {
    const rect = 容器元素.getBoundingClientRect();
    const imgRect = 图像元素.getBoundingClientRect();
    // 计算图像边界
    const bounds = {
        left: imgRect.left - rect.left,
        top: imgRect.top - rect.top,
        right: imgRect.right - rect.left,
        bottom: imgRect.bottom - rect.top
    };
    return bounds
}
import { xywh2ltwh } from "../../../../../../src/utils/math/geometry/geom2d.js";
import { 裁剪框控制器 } from "../state/cropBoxController.js";
export const 获取实际裁剪区域 = (container,processedImg, originalRect)=>{
    if (!container || !processedImg) return null;
    const rect = container.getBoundingClientRect();
    const imgRect = processedImg.getBoundingClientRect();
    const 映射结果 = 裁剪框控制器.坐标映射(
        {
            x: imgRect.left - rect.left,
            y: imgRect.top - rect.top
        },
        {
            width: imgRect.width,
            height: imgRect.height
        },
        {
            width: originalRect.width,
            height: originalRect.height
        }
    );
    if (!映射结果) return null;
    return xywh2ltwh(映射结果);
}