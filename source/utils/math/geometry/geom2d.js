import { 
    计算点距离和角度,
    按距离采样点序列,
    xywhRect2ltwhRect as xywh2ltwh, 
    ltwhRect2xywhRect as ltwh2xywh
} from "../../../../src/toolBox/base/forMath/forGeometry/forGeometryExports.js";
export {计算点距离和角度,按距离采样点序列,xywh2ltwh,ltwh2xywh}





/**
 * 将LTRB边界格式转换为XYWH格式
 * @param {{left: number, top: number, right: number, bottom: number}} bounds - LTRB边界对象
 * @returns {{x: number, y: number, width: number, height: number}|null} XYWH格式对象或null
 */
export const ltrb2xywh = (bounds) => {
    if (!bounds || typeof bounds !== 'object') {
        console.warn('无效的边界格式数据')
        return null
    }

    return {
        x: bounds.left,
        y: bounds.top,
        width: bounds.right - bounds.left,
        height: bounds.bottom - bounds.top
    }
}

/**
 * 将XYWH格式转换为LTRB边界格式
 * @param {{x: number, y: number, width: number, height: number}} xywh - XYWH格式对象
 * @returns {{left: number, top: number, right: number, bottom: number}|null} LTRB边界对象或null
 */
export const xywh2ltrb = (xywh) => {
    if (!xywh || typeof xywh !== 'object') {
        console.warn('无效的XYWH格式数据')
        return null
    }

    return {
        left: xywh.x,
        top: xywh.y,
        right: xywh.x + xywh.width,
        bottom: xywh.y + xywh.height
    }
}



/**
 * 计算宽高比
 * @param {{width: number, height: number}} wh - 包含width和height的对象
 * @returns {number} 宽高比(width/height)
 */
export const genRatioWh=(wh)=>{
    return wh.width/wh.height
}