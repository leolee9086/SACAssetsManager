import { loadImagesWithDefaults } from "../utils/image.js";
import { findClipPath } from "../utils/unitUtils.js";
// 计算单元的中心点
const calculateCenter = (vertices) => {
    const centerX = vertices.reduce((sum, vertex) => sum + vertex.x, 0) / vertices.length;
    const centerY = vertices.reduce((sum, vertex) => sum + vertex.y, 0) / vertices.length;
    return { x: centerX, y: centerY };
};

/**
 * 生成pgg晶体学群体的几何图形和光栅图像
 * @param {number} spacing - 网格间距
 * @param {number} precision - 网格精度
 * @param {Object} options - 可选参数，包括晶格向量调整
 * @returns {Object} 包含几何图形、光栅图像和中心点的对象
 */
export const generateUnits = (spacing, precision, options = {}) => {
    // 保持原始计算方式但最终规范化为1单位
    const baseUnitLength = spacing / precision;

    // 从选项中获取晶格向量参数或使用默认值
    let vector1 = options.vector1 || { x: 1.0, y: 0.0 };
    let vector2 = options.vector2 || { x: 0.0, y: 1.0 };

    // 标准化向量处理
    const normalizeVectors = (v1, v2) => {
        // 计算原始长度并保留方向
        const dir1 = v1.x !== 0 ? 'x' : 'y';
        const dir2 = v2.y !== 0 ? 'y' : 'x';

        // 生成正交单位向量
        return {
            v1: dir1 === 'x' ? { x: baseUnitLength, y: 0 } : { x: 0, y: baseUnitLength },
            v2: dir2 === 'y' ? { x: 0, y: baseUnitLength } : { x: baseUnitLength, y: 0 }
        };
    };

    // 应用标准化
    const normalizedVectors = normalizeVectors(vector1, vector2);
    vector1 = normalizedVectors.v1;
    vector2 = normalizedVectors.v2;

    // 生成中心对齐的1单位矩形
    const rectVertices = [
        { x: -baseUnitLength / 2, y: -baseUnitLength / 2 }, // 左下
        { x: baseUnitLength / 2, y: -baseUnitLength / 2 }, // 右下
        { x: baseUnitLength / 2, y: baseUnitLength / 2 },  // 右上
        { x: -baseUnitLength / 2, y: baseUnitLength / 2 }  // 左上
    ];

    // 晶格向量显示（实际使用1单位长度）
    const latticeVectors = [
        {
            id: 'lattice-vector-1',
            x: baseUnitLength, // 保持原始比例
            y: 0,
            label: `晶格向量1 (${vector1.x.toFixed(2)}, 0)`
        },
        {
            id: 'lattice-vector-2',
            x: 0,
            y: baseUnitLength,
            label: `晶格向量2 (0, ${vector2.y.toFixed(2)})`
        }
    ];

    const geoms = [];


    // 将矩形划分为四个象限单元
    const unitVertices = [
        { // 第一象限
            id: 'baseUnit-1',
            vertices: [
                { x: 0, y: 0 },       // 中心
                { x: 0.5 * baseUnitLength, y: 0 },     // 右中
                { x: 0.5 * baseUnitLength, y: 0.5 * baseUnitLength },   // 右上中
                { x: 0, y: 0.5 * baseUnitLength }      // 上中
            ]
        },
        { // 第二象限
            id: 'baseUnit-2',
            vertices: [
                { x: 0, y: 0 },       // 中心
                { x: 0, y: 0.5 * baseUnitLength },     // 上中
                { x: -0.5 * baseUnitLength, y: 0.5 * baseUnitLength },  // 左上中
                { x: -0.5 * baseUnitLength, y: 0 }     // 左中
            ]
        },
        { // 第三象限
            id: 'baseUnit-3',
            vertices: [
                { x: 0, y: 0 },       // 中心
                { x: -0.5 * baseUnitLength, y: 0 },    // 左中
                { x: -0.5 * baseUnitLength, y: -0.5 * baseUnitLength }, // 左下中
                { x: 0, y: -0.5 * baseUnitLength }     // 下中
            ]
        },
        { // 第四象限
            id: 'baseUnit-4',
            vertices: [
                { x: 0, y: 0 },       // 中心
                { x: 0, y: -0.5 * baseUnitLength },    // 下中
                { x: 0.5 * baseUnitLength, y: -0.5 * baseUnitLength },  // 右下中
                { x: 0.5 * baseUnitLength, y: 0 }      // 右中
            ]
        }
    ];

    const colors = [
        { fill: 'rgba(100,150,230,0.5)', stroke: 'rgba(70,120,200,0.8)' },
        { fill: 'rgba(230,150,100,0.5)', stroke: 'rgba(200,120,70,0.8)' },
        { fill: 'rgba(150,230,100,0.5)', stroke: 'rgba(120,200,70,0.8)' },
        { fill: 'rgba(230,100,150,0.5)', stroke: 'rgba(200,70,120,0.8)' }
    ];

    // 添加四个基本单元
    unitVertices.forEach((unit, index) => {
        geoms.push({
            id: unit.id,
            type: 'baseUnit',
            color: colors[index % 4],
            vertices: unit.vertices,
            center: { label: `基本单元${index + 1}` },
            internalAxes: {
                center: calculateCenter(unit.vertices),
                mainAxe: {
                    x: 0 - calculateCenter(unit.vertices),
                    y: 0 - calculateCenter(unit.vertices)
                },
                length: baseUnitLength * 0.4,
                color: 'rgba(0,0,0,0.7)'
            }
        });
    });

    // 生成光栅图像配置
    const rasterImages = [];
    // 为每个单元创建光栅图像

    geoms.filter(g => g.type === 'baseUnit').forEach((geom, index) => (
        rasterImages.push(
            {
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
                    rotation: index % 2 === 0 ? 0 : 180,
                    scaleX: 1,
                    scaleY: index > 1 ? 1 : -1,
                    transformsEnabled: 'all' // 确保所有变换都启用
                }
            })
    ));


    // 计算所有单元的中心点
    const centers = geoms.filter(g => g.type === 'baseUnit').map(geom => ({
        id: geom.id,
        center: calculateCenter(geom.vertices)
    }));

    // 计算无缝单元（新增）
    const seamlessUnit = {
        id: 'seamless-unit',
        width: Math.abs(latticeVectors[0].x) + Math.abs(latticeVectors[1].x),
        height: Math.abs(latticeVectors[0].y) + Math.abs(latticeVectors[1].y),
        center: { x: 0, y: 0 },
        vertices: rectVertices,
        color: {
            stroke: 'rgba(0,200,0,0.8)',
            fill: 'rgba(0,200,0,0.1)'
        },
        label: '无缝单元'
    };



    return {
        geoms,
        rasterImages,
        baseUnitCenters: centers, // 新增中心点信息
        loadImagesWithDefaults: (configs) => loadImagesWithDefaults(configs, { autoRotate: false }), // 补充参数
        latticeVectors,
        calculateInternalOffset, // 确保导出计算函数
        seamlessUnit, // 新增无缝单元
        findUnitClipPath: findClipPath,
        isAdjustable: false,
        vectorParams: { vector1, vector2 },
        rectTileable: true, // 新增可平铺判断
        symmetryAxes: [{ x: 1, y: 0 }]
    };
};

/**
 * PGG特有的偏移计算（考虑滑移反射）
 */
export const calculateInternalOffset = (geom, image, offset) => {

    return offset;
};
