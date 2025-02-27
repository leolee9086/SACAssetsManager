import { loadImagesWithDefaults } from "./utils/image.js";
import { findClipPath } from "./utils/unitUtils.js";

/**
 * 生成pg晶体学群体的几何图形和光栅图像
 * @param {number} spacing - 网格间距
 * @param {number} precision - 网格精度
 * @param {Object} options - 可选参数，包括晶格向量调整
 * @returns {Object} 包含几何图形、光栅图像和中心点的对象
 */
export const generateUnits = (spacing, precision, options = {}) => {
    // 计算单位长度
    const unitLength = spacing / precision;

    // 从选项中获取晶格向量参数或使用默认值
    // 为了保证pg群的滑移反射性质，晶格向量1应该与滑移方向平行
    const vector1 = options.vector1 || { x: 1.0, y: 0.0 };
    const vector2 = options.vector2 || { x: 0.0, y: 1.0 };

    // 生成晶格向量，应用自定义值
    // 由于pg群的约束，我们应该确保vector1与滑移方向平行（通常是x轴）
    const latticeVectors = [
        {
            id: 'lattice-vector-1',
            x: unitLength * vector1.x,
            y: unitLength * vector1.y,
            label: '晶格向量1'
        },
        {
            id: 'lattice-vector-2',
            x: unitLength * vector2.x,
            y: unitLength * vector2.y,
            label: '晶格向量2'
        }
    ];

    const commonEdgeVector = {
        x: latticeVectors[0].x / 2,
        y: latticeVectors[0].y / 2
    };

    const perpVector = {
        x: latticeVectors[1].x / 2,
        y: latticeVectors[1].y / 2
    };

    // 第一个基本单元的顶点
    const unit1Vertices = [
        {
            id: 'vertex-1',
            x: -commonEdgeVector.x - perpVector.x,
            y: -commonEdgeVector.y - perpVector.y,
            labelOffsetX: -10,
            labelOffsetY: -10,
            label: `(${(-commonEdgeVector.x - perpVector.x) / unitLength.toFixed(2)},${(-commonEdgeVector.y - perpVector.y) / unitLength.toFixed(2)})`
        },
        {
            id: 'vertex-2',
            x: commonEdgeVector.x - perpVector.x,
            y: commonEdgeVector.y - perpVector.y,
            labelOffsetX: 10,
            labelOffsetY: -10,
            label: `(${(commonEdgeVector.x - perpVector.x) / unitLength.toFixed(2)},${(commonEdgeVector.y - perpVector.y) / unitLength.toFixed(2)})`
        },
        {
            id: 'vertex-3',
            x: commonEdgeVector.x,
            y: commonEdgeVector.y,
            labelOffsetX: 10,
            labelOffsetY: 10,
            label: `(${(commonEdgeVector.x) / unitLength.toFixed(2)},${(commonEdgeVector.y) / unitLength.toFixed(2)})`
        },
        {
            id: 'vertex-4',
            x: -commonEdgeVector.x,
            y: -commonEdgeVector.y,
            labelOffsetX: -10,
            labelOffsetY: 10,
            label: `(${(-commonEdgeVector.x) / unitLength.toFixed(2)},${(-commonEdgeVector.y) / unitLength.toFixed(2)})`
        }
    ];

    // 第二个基本单元的顶点（通过滑移反射得到）
    // 滑移反射: 直接按晶格向量2/2移动单元1
    const unit2Vertices = unit1Vertices.map(vertex => {
        return {
            id: `${vertex.id}-glide`,
            x: vertex.x + perpVector.x,
            y: vertex.y + perpVector.y,
            labelOffsetX: vertex.labelOffsetX,
            labelOffsetY: vertex.labelOffsetY,
            label: `(${(vertex.x + perpVector.x) / unitLength.toFixed(2)},${(vertex.y + perpVector.y) / unitLength.toFixed(2)})`
        };
    });

    const geoms = [];
    const color1 = { fill: 'rgba(100,150,230,0.5)', stroke: 'rgba(70,120,200,0.8)', pointFill: 'rgba(70,120,200,0.8)' };
    const color2 = { fill: 'rgba(230,150,100,0.5)', stroke: 'rgba(200,120,70,0.8)', pointFill: 'rgba(200,120,70,0.8)' };

    // 计算单元的中心点
    const calculateCenter = (vertices) => {
        const centerX = vertices.reduce((sum, vertex) => sum + vertex.x, 0) / vertices.length;
        const centerY = vertices.reduce((sum, vertex) => sum + vertex.y, 0) / vertices.length;
        return { x: centerX, y: centerY };
    };

    // 第一个基本单元
    geoms.push({
        id: 'baseUnit-1',
        type: 'baseUnit',
        color: color1,
        vertices: unit1Vertices,
        center: {
            label: '基本单元1'
        },
        // 添加内部坐标轴
        internalAxes: {
            // 计算单元中心点
            center: {
                x: calculateCenter(unit1Vertices).x,
                y: calculateCenter(unit1Vertices).y
            },
            // 垂直于向量1的向量
            mainAxe: {
                x: -vector1.y,
                y: vector1.x
            },
            length: unitLength * 0.4,
            color: 'rgba(0,0,0,0.7)'
        }
    });

    // 第二个基本单元
    geoms.push({
        id: 'baseUnit-2',
        type: 'baseUnit',
        color: color2,
        vertices: unit2Vertices,
        center: {
            label: '基本单元2'
        },
        // 添加内部坐标轴
        internalAxes: {
            // 计算单元中心点
            center: {
                x: calculateCenter(unit2Vertices).x,
                y: calculateCenter(unit2Vertices).y
            },
            // 垂直于向量1的向量
            mainAxe: {
                x: vector1.y,
                y: -vector1.x
            },
            length: unitLength * 0.4,
            color: 'rgba(0,0,0,0.7)'
        }
    });

    // 计算所有单元的中心点
    const centers = geoms.map(geom => {
        return {
            id: geom.id,
            center: calculateCenter(geom.vertices)
        };
    });

    // 生成光栅图像
    const rasterImages = [];

    /**
     * 计算pg群体的变换参数
     * @param {string} unitId - 单元ID
     * @returns {Object} 包含Konva兼容的变换参数
     */
    const calculatePgTransformation = (unitId) => {
        // 计算vector1的角度，用于确定滑移方向
        const vector1Angle = Math.atan2(vector1.y, vector1.x) * (180 / Math.PI);
        
        if (unitId === 'baseUnit-2') {
            // 对第二个单元应用滑移反射变换
            return {
                scaleX: -1,
                scaleY: 1, // y轴反转实现反射
                rotation: 180 // 先旋转，再反射，最后逆旋转
            };
        }

        // 第一个单元无变换
        return {
            scaleX: 1,
            scaleY: 1
        };
    };

    // 为每个单元创建光栅图像
    geoms.forEach((geom, index) => {
        const transformation = calculatePgTransformation(geom.id);

        rasterImages.push({
            id: `texture-${index + 1}`,
            label: `纹理${index + 1}`,
            relatedGeom: geom.id,
            labelOffsetX: 0,
            labelOffsetY: -20,
            onUpdate: (image, context) => {
                const { latticeVector1 } = context;
                const unitId = image.relatedGeom;
                const vector1Angle = Math.atan2(latticeVector1.y, latticeVector1.x) * (180 / Math.PI);

                if (unitId === 'baseUnit-2') {
                    // 旋转到滑移方向，反射y轴，然后旋转回来
                    image.config.rotation = vector1Angle+180;

                } else {
                    image.config.rotation = vector1Angle;
                }
            },
            config: {
                x: 0, // 将在后面更新
                y: 0, // 将在后面更新
                image: null, // 将在loadImages中加载
                width: 60,
                height: 60,
                offsetX: 30,
                offsetY: 30,
                draggable: true,
                shadowColor: 'black',
                shadowBlur: 5,
                shadowOpacity: 0.3,
                shadowOffsetX: 2,
                shadowOffsetY: 2,
                rotation: transformation.rotation,
                scaleX: transformation.scaleX,
                scaleY: transformation.scaleY,
                rotationAfterScale: transformation.rotationAfterScale
            }
        });
    });

    // 更新图像位置，使其与对应单元的中心点对齐
    rasterImages.forEach(image => {
        const relatedCenter = centers.find(c => c.id === image.relatedGeom);
        if (relatedCenter) {
            image.config.x = relatedCenter.center.x;
            image.config.y = relatedCenter.center.y;
        }
    });

    // 计算pg晶格的无缝单元
    const seamlessUnit = {
        id: 'seamless-unit',
        width: Math.abs(latticeVectors[0].x) + Math.abs(latticeVectors[1].x),
        height: Math.abs(latticeVectors[0].y) + Math.abs(latticeVectors[1].y),
        center: { x: 0, y: 0 },
        vertices: [
            {
                x: -Math.abs(latticeVectors[0].x) / 2 - Math.abs(latticeVectors[1].x) / 2,
                y: -Math.abs(latticeVectors[0].y) / 2 - Math.abs(latticeVectors[1].y) / 2
            },
            {
                x: Math.abs(latticeVectors[0].x) / 2 + Math.abs(latticeVectors[1].x) / 2,
                y: -Math.abs(latticeVectors[0].y) / 2 - Math.abs(latticeVectors[1].y) / 2
            },
            {
                x: Math.abs(latticeVectors[0].x) / 2 + Math.abs(latticeVectors[1].x) / 2,
                y: Math.abs(latticeVectors[0].y) / 2 + Math.abs(latticeVectors[1].y) / 2
            },
            {
                x: -Math.abs(latticeVectors[0].x) / 2 - Math.abs(latticeVectors[1].x) / 2,
                y: Math.abs(latticeVectors[0].y) / 2 + Math.abs(latticeVectors[1].y) / 2
            }
        ],
        color: {
            stroke: 'rgba(255,0,0,0.8)',
            fill: 'rgba(255,0,0,0.1)'
        },
        label: '无缝单元'
    };

    // 计算两个晶格向量是否可以形成正交矩形（与坐标轴平行）
    const isRectTileable = () => {
        // 考虑浮点误差，使用小阈值
        const epsilon = 0.001;
        
        // 检查向量是否与坐标轴平行（一个分量接近0）
        const vector1AxisAligned = Math.abs(latticeVectors[0].x) < epsilon || Math.abs(latticeVectors[0].y) < epsilon;
        const vector2AxisAligned = Math.abs(latticeVectors[1].x) < epsilon || Math.abs(latticeVectors[1].y) < epsilon;
        
        return vector1AxisAligned && vector2AxisAligned;
    };

    return {
        geoms,
        rasterImages,
        baseUnitCenters: centers,
        loadImagesWithDefaults: (rasterImagesConfig) => { return loadImagesWithDefaults(rasterImagesConfig, { autoRotate: false }) },
        latticeVectors,
        calculateInternalOffset,
        seamlessUnit,
        findUnitClipPath: findClipPath,
        isAdjustable: true, // 晶格向量可调整
        vectorParams: { // 添加当前向量参数
            vector1: { x: vector1.x, y: vector1.y },
            vector2: { x: vector2.x, y: vector2.y }
        },
        rectTileable: isRectTileable(),
    };
};

/**
 * 计算内部坐标系中的偏移
 * @param {Object} geom - 几何图形对象
 * @param {Object} image - 图像对象
 * @param {Object} offset - 偏移量 {x, y}
 * @returns {Object} 计算后的偏移量 {x, y}
 */
export const calculateInternalOffset = (geom, image, offset) => {
    if (!geom || !geom.internalAxes) {
        // 如果没有内部坐标轴信息，则返回原始偏移
        return offset;
    }

    const mainAxe = geom.internalAxes.mainAxe;

    // 计算指向原点的单位向量（这是内部Y轴的方向，因为Y轴偏移减小时图像向原点移动）
    const magnitude = Math.sqrt(mainAxe.x * mainAxe.x + mainAxe.y * mainAxe.y);
    const yAxis = {
        x: mainAxe.x / magnitude,
        y: mainAxe.y / magnitude
    };

    // 计算X轴方向
    let xAxis;

    // 基于单元ID确定手性：baseUnit-1使用右手坐标系，baseUnit-2使用左手坐标系
    if (geom.id === 'baseUnit-2') {
        // 左手坐标系：Y轴逆时针旋转90度得到X轴
        xAxis = {
            x: -yAxis.y,
            y: yAxis.x
        };
    } else {
        // 右手坐标系：Y轴顺时针旋转90度得到X轴
        xAxis = {
            x: yAxis.y,
            y: -yAxis.x
        };
    }

    // 应用X和Y轴偏移
    const result = {
        x: offset.x * xAxis.x + offset.y * yAxis.x,
        y: offset.x * xAxis.y + offset.y * yAxis.y
    };

    return result;
}; 