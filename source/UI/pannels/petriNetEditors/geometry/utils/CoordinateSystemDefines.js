
/**
 * 预定义常用坐标系统
 * @type {const}
 */
export const 坐标系 = {
    // 笛卡尔坐标系
    一维: ['x'],
    二维: ['x', 'y'],
    三维: ['x', 'y', 'z'],
    四维: ['x', 'y', 'z', 'w'],  // 齐次坐标
    //css常用坐标系
    CSS相对: ['left', 'top', 'right', 'bottom'],
    CSS变换: ['translateX', 'translateY', 'translateZ'],
    CSS旋转: ['rotateX', 'rotateY', 'rotateZ'],
    CSS缩放: ['scaleX', 'scaleY', 'scaleZ'],
    // 极坐标系
    极坐标: ['r', 'theta'],
    柱坐标: ['r', 'theta', 'z'],
    球坐标: ['r', 'theta', 'phi'],
    // 纹理坐标
    UV: ['u', 'v'],
    UVW: ['u', 'v', 'w'],
    // 颜色空间
    RGB: ['r', 'g', 'b'],
    RGBA: ['r', 'g', 'b', 'a'],
    HSL: ['h', 's', 'l'],
    HSV: ['h', 's', 'v'],
    CMYK: ['c', 'm', 'y', 'k'],
    // 边界框
    AABB二维: ['minX', 'minY', 'maxX', 'maxY'],
    AABB三维: ['minX', 'minY', 'minZ', 'maxX', 'maxY', 'maxZ'],
    // 四元数
    四元数: ['x', 'y', 'z', 'w'],
    // 欧拉角
    欧拉角: ['pitch', 'yaw', 'roll'],
    // 屏幕/窗口坐标
    屏幕坐标: ['screenX', 'screenY'],
    客户端坐标: ['clientX', 'clientY'],
    页面坐标: ['pageX', 'pageY'],
    // 图像处理
    像素: ['x', 'y', 'value'],
    像素RGBA: ['x', 'y', 'r', 'g', 'b', 'a']
} 
//这些不是坐标系但是有类似的数组转换要求的
export const 非坐标系数组转对象标志 ={
    css长宽:['width','height']
}