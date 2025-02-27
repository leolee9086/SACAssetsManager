import { loadImagesWithDefaults } from "./utils/image.js";
import { findClipPath } from "./utils/unitUtils.js";

/**
 * 生成cm晶体学群体的几何图形和光栅图像
 * @param {number} spacing - 网格间距
 * @param {number} precision - 网格精度
 * @param {Object} options - 可选参数，包括晶格向量调整
 * @returns {Object} 包含几何图形、光栅图像和中心点的对象
 */
export const generateUnits = (spacing, precision, options = {}) => {
    // 计算单位长度
    const unitLength = spacing / precision;

    // 从选项中获取晶格向量参数或使用默认值
    let vector1 = options.vector1 || { x: 1.0, y: 0.0 };
    let vector2 = options.vector2 || { x: 0.0, y: 1.0 };

    // 标准化向量长度，确保两个向量等长
    const normalizeVectors = (v1, v2) => {
        // 计算两个向量的长度
        const length1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const length2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

        // 取平均长度
        const targetLength = (length1 + length2) / 2;

        // 标准化两个向量到相同长度
        return {
            v1: {
                x: (v1.x / length1) * targetLength,
                y: (v1.y / length1) * targetLength
            },
            v2: {
                x: (v2.x / length2) * targetLength,
                y: (v2.y / length2) * targetLength
            }
        };
    };

    // 应用标准化，确保向量等长
    const normalizedVectors = normalizeVectors(vector1, vector2);
    vector1 = normalizedVectors.v1;
    vector2 = normalizedVectors.v2;

    // 生成晶格向量，应用自定义值
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

    // 计算对称轴方向（对称轴应沿着菱形的对角线）
    const symmetryAxis = {
        x: latticeVectors[0].x - latticeVectors[1].x,
        y: latticeVectors[0].y - latticeVectors[1].y
    };

    // 归一化对称轴向量
    const magnitude = Math.sqrt(symmetryAxis.x * symmetryAxis.x + symmetryAxis.y * symmetryAxis.y);
    const normalizedSymmetryAxis = {
        x: symmetryAxis.x / magnitude,
        y: symmetryAxis.y / magnitude
    };

    // 计算菱形的四个顶点
    const rhombusCenter = { x: 0, y: 0 };
    const rhombusVertices = [
        {
            id: 'vertex-1',
            x: rhombusCenter.x - latticeVectors[0].x / 2 - latticeVectors[1].x / 2,
            y: rhombusCenter.y - latticeVectors[0].y / 2 - latticeVectors[1].y / 2,
            labelOffsetX: -10,
            labelOffsetY: -10,
            label: '顶点1'
        },
        {
            id: 'vertex-2',
            x: rhombusCenter.x + latticeVectors[0].x / 2 - latticeVectors[1].x / 2,
            y: rhombusCenter.y + latticeVectors[0].y / 2 - latticeVectors[1].y / 2,
            labelOffsetX: 10,
            labelOffsetY: -10,
            label: '顶点2'
        },
        {
            id: 'vertex-3',
            x: rhombusCenter.x + latticeVectors[0].x / 2 + latticeVectors[1].x / 2,
            y: rhombusCenter.y + latticeVectors[0].y / 2 + latticeVectors[1].y / 2,
            labelOffsetX: 10,
            labelOffsetY: 10,
            label: '顶点3'
        },
        {
            id: 'vertex-4',
            x: rhombusCenter.x - latticeVectors[0].x / 2 + latticeVectors[1].x / 2,
            y: rhombusCenter.y - latticeVectors[0].y / 2 + latticeVectors[1].y / 2,
            labelOffsetX: -10,
            labelOffsetY: 10,
            label: '顶点4'
        }
    ];
    const unit1Vertices = [
        rhombusVertices[0],
        rhombusVertices[1],
        rhombusVertices[3]
    ];

    // 基本单元2：菱形的另一半（三角形）
    const unit2Vertices = [
        rhombusVertices[1],
        rhombusVertices[2],
        rhombusVertices[3]
    ];

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
            center: calculateCenter(unit1Vertices),
            // 对称轴方向
            mainAxe: {
                x: 0 - calculateCenter(unit1Vertices).x,
                y: 0 - calculateCenter(unit1Vertices).y
            },
            length: unitLength * 0.4,
            color: 'rgba(0,0,0,0.7)'
        }
    });

    // 第二个基本单元（通过反射得到）
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
            center: calculateCenter(unit2Vertices),
            // 对称轴方向
            mainAxe: {
                x: 0 - calculateCenter(unit2Vertices).x,
                y: 0 - calculateCenter(unit2Vertices).y
            },
            length: unitLength * 0.4,
            color: 'rgba(0,0,0,0.7)'
        }
    });

    // 添加对称轴（沿着菱形的对角线）
    geoms.push({
        id: 'symmetry-axis',
        type: 'symmetryElement',
        elementType: 'reflectionLine',
        color: { stroke: 'rgba(255,0,0,0.8)' },
        points: [
            rhombusVertices[1], // 对角顶点1
            rhombusVertices[3]  // 对角顶点2
        ],
        label: '反射轴'
    });

    // 计算所有单元的中心点
    const centers = geoms.filter(g => g.type === 'baseUnit').map(geom => {
        return {
            id: geom.id,
            center: calculateCenter(geom.vertices)
        };
    });

    // 生成光栅图像
    const rasterImages = [];

    /**
     * 计算cm群体的变换参数
     * @param {string} unitId - 单元ID
     * @returns {Object} 包含Konva兼容的变换参数
     */
    const calculateCmTransformation = (unitId) => {
        // 计算对称轴的角度，用于确定反射方向
        const symmetryAxisAngle = Math.atan2(normalizedSymmetryAxis.y, normalizedSymmetryAxis.x) * (180 / Math.PI);

        if (unitId === 'baseUnit-2') {
            // 对第二个单元应用反射变换
            // 首先旋转使对称轴与x轴对齐，然后进行反射，最后逆旋转回原来的方向
            return {
                rotation: symmetryAxisAngle,
                scaleX: 1,
                scaleY: -1, // y轴反转实现反射
            };
        }

        // 第一个单元无变换
        return {
            rotation: symmetryAxisAngle,
            scaleX: 1,
            scaleY: 1, // y轴反转实现反射
        };
    };

    // 为每个单元创建光栅图像
    geoms.filter(g => g.type === 'baseUnit').forEach((geom, index) => {
        const transformation = calculateCmTransformation(geom.id);

        rasterImages.push({
            id: `texture-${index + 1}`,
            label: `纹理${index + 1}`,
            relatedGeom: geom.id,
            labelOffsetX: 0,
            labelOffsetY: -20,

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

    // 计算cm晶格的无缝单元（整个菱形）
    const seamlessUnit = {
        id: 'seamless-unit',
        width: Math.abs(latticeVectors[0].x) + Math.abs(latticeVectors[1].x),
        height: Math.abs(latticeVectors[0].y) + Math.abs(latticeVectors[1].y),
        center: { x: 0, y: 0 },
        vertices: rhombusVertices,
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
        vectorParams: {
            vector1: { x: vector1.x, y: vector1.y },
            vector2: { x: vector2.x, y: vector2.y }
        },
        rectTileable: isRectTileable(),
        symmetryAxis: normalizedSymmetryAxis // 添加对称轴信息
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

    // 获取指向原点的向量
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