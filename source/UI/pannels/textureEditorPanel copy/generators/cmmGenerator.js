import { loadImagesWithDefaults } from "./utils/image.js";
import { findClipPath } from "./utils/unitUtils.js";

/**
 * 生成cmm晶体学群体的几何图形和光栅图像
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

    // 计算对称轴方向（两条垂直的反射轴）
    const symmetryAxis1 = {
        x: latticeVectors[0].x - latticeVectors[1].x,
        y: latticeVectors[0].y - latticeVectors[1].y
    };

    // 计算第二条对称轴（与第一条垂直）
    const symmetryAxis2 = {
        x: -symmetryAxis1.y,
        y: symmetryAxis1.x
    };

    // 归一化对称轴向量
    const magnitude1 = Math.sqrt(symmetryAxis1.x * symmetryAxis1.x + symmetryAxis1.y * symmetryAxis1.y);
    const normalizedSymmetryAxis1 = {
        x: symmetryAxis1.x / magnitude1,
        y: symmetryAxis1.y / magnitude1
    };

    const magnitude2 = Math.sqrt(symmetryAxis2.x * symmetryAxis2.x + symmetryAxis2.y * symmetryAxis2.y);
    const normalizedSymmetryAxis2 = {
        x: symmetryAxis2.x / magnitude2,
        y: symmetryAxis2.y / magnitude2
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

    // 为cmm群体，我们需要将菱形分成四个相等的部分（四个对称单元）
    // 计算菱形中心点
    const rhombusCenterPoint = {
        id: 'center-point',
        x: 0,
        y: 0,
        label: '中心点'
    };

    // 基本单元1：菱形的1/4（第一象限）
    const unit1Vertices = [
        rhombusCenterPoint,
        rhombusVertices[1],
        rhombusVertices[2]
    ];

    // 基本单元2：菱形的1/4（第二象限）（通过垂直反射得到）
    const unit2Vertices = [
        rhombusCenterPoint,
        rhombusVertices[2],
        rhombusVertices[3]
    ];

    // 基本单元3：菱形的1/4（第三象限）（通过180度旋转得到）
    const unit3Vertices = [
        rhombusCenterPoint,
        rhombusVertices[3],
        rhombusVertices[0]
    ];

    // 基本单元4：菱形的1/4（第四象限）（通过水平反射得到）
    const unit4Vertices = [
        rhombusCenterPoint,
        rhombusVertices[0],
        rhombusVertices[1]
    ];

    const geoms = [];
    const color1 = { fill: 'rgba(100,150,230,0.5)', stroke: 'rgba(70,120,200,0.8)', pointFill: 'rgba(70,120,200,0.8)' };
    const color2 = { fill: 'rgba(230,150,100,0.5)', stroke: 'rgba(200,120,70,0.8)', pointFill: 'rgba(200,120,70,0.8)' };
    const color3 = { fill: 'rgba(150,230,100,0.5)', stroke: 'rgba(120,200,70,0.8)', pointFill: 'rgba(120,200,70,0.8)' };
    const color4 = { fill: 'rgba(230,100,150,0.5)', stroke: 'rgba(200,70,120,0.8)', pointFill: 'rgba(200,70,120,0.8)' };

    // 计算单元的中心点
    const calculateCenter = (vertices) => {
        const centerX = vertices.reduce((sum, vertex) => sum + vertex.x, 0) / vertices.length;
        const centerY = vertices.reduce((sum, vertex) => sum + vertex.y, 0) / vertices.length;
        return { x: centerX, y: centerY };
    };

    // 添加四个基本单元
    geoms.push({
        id: 'baseUnit-1',
        type: 'baseUnit',
        color: color1,
        vertices: unit1Vertices,
        center: {
            label: '基本单元1'
        },
        internalAxes: {
            center: calculateCenter(unit1Vertices),
            mainAxe: {
                x: 0 - normalizedSymmetryAxis1.x,
                y: 0 - normalizedSymmetryAxis1.y
            },
            length: unitLength * 0.4,
            color: 'rgba(0,0,0,0.7)'
        }
    });

    geoms.push({
        id: 'baseUnit-2',
        type: 'baseUnit',
        color: color2,
        vertices: unit2Vertices,
        center: {
            label: '基本单元2'
        },
        internalAxes: {
            center: calculateCenter(unit2Vertices),
            mainAxe: {
                x:  normalizedSymmetryAxis1.x,
                y:  normalizedSymmetryAxis1.y
            },
            length: unitLength * 0.4,
            color: 'rgba(0,0,0,0.7)'
        }
    });

    geoms.push({
        id: 'baseUnit-3',
        type: 'baseUnit',
        color: color3,
        vertices: unit3Vertices,
        center: {
            label: '基本单元3'
        },
        internalAxes: {
            center: calculateCenter(unit3Vertices),
            mainAxe: {
                x:  normalizedSymmetryAxis1.x,
                y:  normalizedSymmetryAxis1.y
            },
            length: unitLength * 0.4,
            color: 'rgba(0,0,0,0.7)'
        }
    });

    geoms.push({
        id: 'baseUnit-4',
        type: 'baseUnit',
        color: color4,
        vertices: unit4Vertices,
        center: {
            label: '基本单元4'
        },
        internalAxes: {
            center: calculateCenter(unit4Vertices),
            mainAxe: {
                x: 0 - normalizedSymmetryAxis1.x,
                y: 0 - normalizedSymmetryAxis1.y
            },
            length: unitLength * 0.4,
            color: 'rgba(0,0,0,0.7)'
        }
    });

    // 添加两条垂直的对称轴
    // 第一条反射轴
    geoms.push({
        id: 'symmetry-axis-1',
        type: 'symmetryElement',
        elementType: 'reflectionLine',
        color: { stroke: 'rgba(255,0,0,0.8)' },
        points: [
            // 沿着对角线方向
            { x: rhombusVertices[1].x, y: rhombusVertices[1].y },
            { x: rhombusVertices[3].x, y: rhombusVertices[3].y }
        ],
        label: '反射轴1'
    });

    // 第二条反射轴（与第一条垂直）
    geoms.push({
        id: 'symmetry-axis-2',
        type: 'symmetryElement',
        elementType: 'reflectionLine',
        color: { stroke: 'rgba(0,0,255,0.8)' },
        points: [
            // 沿着另一条对角线方向
            { x: rhombusVertices[0].x, y: rhombusVertices[0].y },
            { x: rhombusVertices[2].x, y: rhombusVertices[2].y }
        ],
        label: '反射轴2'
    });

    // 添加旋转中心（反射轴交点处的180度旋转）
    geoms.push({
        id: 'rotation-center',
        type: 'symmetryElement',
        elementType: 'rotationCenter',
        order: 2, // 2次旋转对称（180度）
        color: { fill: 'rgba(255,0,255,0.8)', stroke: 'rgba(200,0,200,0.8)' },
        point: { x: 0, y: 0 },
        radius: unitLength * 0.1,
        label: '2次旋转中心'
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
     * 计算cmm群体的变换参数
     * @param {string} unitId - 单元ID
     * @returns {Object} 包含Konva兼容的变换参数
     */
    const calculateCmmTransformation = (unitId) => {
        // 根据不同的单元ID应用不同的变换
        switch(unitId) {
            case 'baseUnit-1': // 第一象限 - 原始单元
                return {
                    rotation: 0,
                    scaleX: 1,
                    scaleY: 1
                };
            case 'baseUnit-2': // 第二象限 - 水平反射
                return {
                    rotation: 0,
                    scaleX: 1,
                    scaleY: -1
                };
            case 'baseUnit-3': // 第三象限 - 180度旋转
                return {
                    rotation: 0,
                    scaleX: -1,
                    scaleY: -1
                };
            case 'baseUnit-4': // 第四象限 - 垂直反射
                return {
                    rotation: 0,
                    scaleX: -1,
                    scaleY: 1
                };
            default:
                return {
                    rotation: 0,
                    scaleX: 1,
                    scaleY: 1
                };
        }
    };

    // 为每个单元创建光栅图像
    geoms.filter(g => g.type === 'baseUnit').forEach((geom, index) => {
        const transformation = calculateCmmTransformation(geom.id);

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
                transformsEnabled: 'all' // 确保所有变换都启用
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

    // 计算cmm晶格的无缝单元（整个菱形）
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
        symmetryAxes: [normalizedSymmetryAxis1, normalizedSymmetryAxis2] // 添加两条对称轴信息
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

    // 基于单元ID确定坐标系
    switch(geom.id) {
        case 'baseUnit-1': // 第一象限 - 右手坐标系
            xAxis = {
                x: yAxis.y,
                y: -yAxis.x
            };
            break;
        case 'baseUnit-2': // 第二象限 - 左手坐标系（水平反射）
            xAxis = {
                x: -yAxis.y,
                y: yAxis.x
            };
            break;
        case 'baseUnit-3': // 第三象限 - 右手坐标系（180度旋转）
            xAxis = {
                x: yAxis.y,
                y: -yAxis.x
            };
            break;
        case 'baseUnit-4': // 第四象限 - 左手坐标系（垂直反射）
            xAxis = {
                x: -yAxis.y,
                y: yAxis.x
            };
            break;
        default:
            // 默认右手坐标系
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