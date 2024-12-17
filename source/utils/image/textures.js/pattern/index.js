import {
    Vector2,
    Transform2D,
    polygonsOverlap,
    calculateBounds,
    boundingBoxesOverlap
} from './geometry-utils.js';
export { Transform2D, Vector2 }
// core/pattern/lattice.js
export class Lattice {
    constructor(basis1, basis2) {
        // 定义二维晶格的基向量
        this.basis1 = basis1;  // Vector2
        this.basis2 = basis2;  // Vector2
    }

    // 获取晶格点
    getLatticePoint(m, n) {
        return this.basis1.scale(m).add(this.basis2.scale(n));
    }
}

// core/pattern/fundamental-domain.js
export class FundamentalDomain {
    constructor() {
        // 基本区域中的多边形集合
        this.polygons = new Map();
        // 对称操作
        this.symmetries = new Set();
    }

    // 添加多边形，返回唯一ID
    addPolygon(vertices, properties = {}) {
        const id = this.generateId();
        this.polygons.set(id, {
            vertices,    // Vector2[]
            properties  // 可以包含颜色、材质等属性
        });
        return id;
    }
    addSymmetry(transform) {
        this.symmetries.add(transform);
    }
    generateId() {
        return '_' + Math.random().toString(36).substr(2, 9);
    }

    validate() {
        // 验证多边形的有效性
        for (const [id, polygon] of this.polygons) {
            if (!this.isValidPolygon(polygon)) {
                throw new Error(`多边形 ${id} 无效`);
            }
        }

        // 验证对称操作的有效性
        for (const symmetry of this.symmetries) {
            if (!this.isValidSymmetry(symmetry)) {
                throw new Error('存在无效的对称操作');
            }
        }
    }

    isValidPolygon(polygon) {
        return polygon.vertices.length >= 3 &&
            polygon.vertices.every(v => v instanceof Vector2);
    }

    isValidSymmetry(symmetry) {
        return symmetry instanceof Transform2D;
    }

    // 添加对称性验证方法
    validateSymmetry(transform) {
        for (const [id, polygon] of this.polygons) {
            const transformedVertices = polygon.vertices.map(v => transform.apply(v));
            if (!this.isValidTransformation(polygon.vertices, transformedVertices)) {
                return false;
            }
        }
        return true;
    }

    // 添加变换有效性检查
    isValidTransformation(originalVertices, transformedVertices) {
        // 检查变换后的顶点是否保持多边形的拓扑结构
        if (originalVertices.length !== transformedVertices.length) {
            return false;
        }

        // 检查边长是否保持
        for (let i = 0; i < originalVertices.length; i++) {
            const j = (i + 1) % originalVertices.length;
            const originalLength = originalVertices[i].subtract(originalVertices[j]).length();
            const transformedLength = transformedVertices[i].subtract(transformedVertices[j]).length();
            if (Math.abs(originalLength - transformedLength) > 1e-6) {
                return false;
            }
        }

        return true;
    }
}

// core/pattern/wallpaper-group.js
export class WallpaperGroup {
    constructor(type, fundamentalDomain, lattice) {
        this.type = type;
        this.fundamentalDomain = fundamentalDomain;
        this.lattice = lattice;
        this.generators = new Set();
    }
    getSymmetryInfo() {
        const basis1Length = this.lattice.basis1.length();
        const basis2Length = this.lattice.basis2.length();
        switch (this.type) {
            case 'p1':
                return (cellX = 0, cellY = 0) => ({
                    glideVector: [
                        this.lattice.basis1,
                        this.lattice.basis2
                    ],
                    // p1群没有其他对称元素
                    mirrorLines: [],
                    rotationCenters: [],
                });

            case 'pmg':
                return (cellX = 0, cellY = 0) => {
                    const cellOrigin = this.lattice.getLatticePoint(cellX, cellY);
                    return {
                        // 垂直镜像线（在单元格边界和中心）
                        mirrorLines: [
                            {
                                point: new Vector2(cellOrigin.x, cellOrigin.y),
                                direction: new Vector2(0, 1)
                            },
                            {
                                point: new Vector2(
                                    cellOrigin.x + basis1Length / 2,
                                    cellOrigin.y
                                ),
                                direction: new Vector2(0, 1)
                            }
                        ],
                        // 2重旋转中心（在镜像线之间的中点）
                        rotationCenters: [
                            new Vector2(
                                cellOrigin.x + basis1Length / 4,
                                cellOrigin.y + basis2Length / 4
                            ),
                            new Vector2(
                                cellOrigin.x + basis1Length / 4,
                                cellOrigin.y + 3 * basis2Length / 4
                            ),
                            new Vector2(
                                cellOrigin.x + 3 * basis1Length / 4,
                                cellOrigin.y + basis2Length / 4
                            ),
                            new Vector2(
                                cellOrigin.x + 3 * basis1Length / 4,
                                cellOrigin.y + 3 * basis2Length / 4
                            )
                        ],
                        // 滑移反射（垂直方向偏移半个单元格）
                        glideVector: new Vector2(0, basis2Length / 2)
                    };

                };
            default:
                return () => ({
                    mirrorLine: null,
                    rotationCenters: [],
                    glideVector: null
                });
        }
    }

    calculateDeterminant(matrix) {
        // 对于3x3矩阵
        return matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) -
            matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0]) +
            matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]);
    }

    // 同时建议添加其他验证方法
    validateMirrorSymmetry(transform) {
        // 验证镜像对称性
        const matrix = transform.matrix;
        // 检查是否存在镜像变换的特征（行列式为-1）
        return Math.abs(this.calculateDeterminant(matrix) + 1) < 1e-6;
    }

    validateRotationSymmetry(transform) {
        // 验证2重旋转对称性
        const matrix = transform.matrix;
        // 检查是否为180度旋转（矩阵的迹为-2）
        const trace = matrix[0][0] + matrix[1][1];
        return Math.abs(trace + 2) < 1e-6;
    }

    validateGlideSymmetry(transform) {
        // 验证滑移对称性
        const matrix = transform.matrix;
        // 检查是否包含平移分量
        const hasTranslation = Math.abs(matrix[0][2]) > 1e-6 || Math.abs(matrix[1][2]) > 1e-6;
        // 检查是否包含镜像分量
        const hasMirror = Math.abs(this.calculateDeterminant(matrix) + 1) < 1e-6;

        return hasTranslation && hasMirror;
    }

    // 计算图案边界
    calculatePatternBounds() {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        for (const region of this.fundamentalDomain.polygons.values()) {
            for (const vertex of region.vertices) {
                minX = Math.min(minX, vertex.x);
                minY = Math.min(minY, vertex.y);
                maxX = Math.max(maxX, vertex.x);
                maxY = Math.max(maxY, vertex.y);
            }
        }
        return {
            width: maxX - minX,
            height: maxY - minY,
            min: new Vector2(minX, minY),
            max: new Vector2(maxX, maxY)
        };
    }

    // PMG群对称性验证
    validatePMGSymmetry(transform) {
        // 1. 验证变换矩阵的行列式是否为 ±1
        const det = this.calculateDeterminant(transform.matrix);
        const epsilon = 1e-6;

        // 2. 验证是否为PMG群的有效变换
        const trace = transform.matrix[0][0] + transform.matrix[1][1];
        const hasTranslation = Math.abs(transform.matrix[0][2]) > epsilon ||
            Math.abs(transform.matrix[1][2]) > epsilon;

        return (
            // 恒等变换
            (Math.abs(det - 1) < epsilon && Math.abs(trace - 2) < epsilon) ||
            // 镜像变换
            (Math.abs(det + 1) < epsilon && !hasTranslation) ||
            // 2重旋转
            (Math.abs(det - 1) < epsilon && Math.abs(trace + 2) < epsilon) ||
            // 滑移反射
            (Math.abs(det + 1) < epsilon && hasTranslation)
        );
    }

    getAllSymmetries() {
        let symmetries = new Set();
        const epsilon = 1e-10;  // 定义精度常量
        const cachedTransforms = new Map();

        switch (this.type) {
            case 'p1':
                // 1. 单位变换
                symmetries.add(new Transform2D());

                // 2. 水平方向平移
                symmetries.add(Transform2D.translation(
                    this.lattice.basis1.x,
                    this.lattice.basis1.y
                ));

                // 3. 垂直方向平移 
                symmetries.add(Transform2D.translation(
                    this.lattice.basis2.x,
                    this.lattice.basis2.y
                ));

                // 4. 对角线方向平移(基向量之和)
                symmetries.add(Transform2D.translation(
                    this.lattice.basis1.x + this.lattice.basis2.x,
                    this.lattice.basis1.y + this.lattice.basis2.y
                ));
                break;
            case 'pmm':
                // 添加水平和垂直反射
                symmetries.add(new Transform2D()); // 单位变换
                symmetries.add(Transform2D.rotation(Math.PI)); // 180度旋转
                symmetries.add(new Transform2D([[1, 0, 0], [0, -1, 0], [0, 0, 1]])); // 水平射
                symmetries.add(new Transform2D([[-1, 0, 0], [0, 1, 0], [0, 0, 1]])); // 垂反射
                break;
            case 'p2':
                symmetries.add(new Transform2D()); // 单位变
                symmetries.add(Transform2D.rotation(Math.PI)); // 180度旋转
                break;
            case 'p4':
                symmetries.add(new Transform2D()); // 单位变换
                symmetries.add(Transform2D.rotation(Math.PI / 2)); // 90度旋转
                symmetries.add(Transform2D.rotation(Math.PI)); // 180度旋转
                symmetries.add(Transform2D.rotation(3 * Math.PI / 2)); // 270度旋转
                break;
            case 'pmg':
                // PMG群包含 8 个基本对称操作
                const unitCell = {
                    width: this.lattice.basis1.length(),
                    height: this.lattice.basis2.length()
                };

                // 记录所有添加的变换用于验证
                const addedTransforms = [];

                // 1. 恒等变换 E
                const identityTransform = new Transform2D([
                    [1, 0, 0],
                    [0, 1, 0],
                    [0, 0, 1]
                ]);
                symmetries.add(identityTransform);
                addedTransforms.push({ name: "恒等变换", transform: identityTransform });

                // 2. 垂直镜像 m (x = w/2)
                const mirrorTransform = new Transform2D([
                    [-1, 0, unitCell.width / 2],
                    [0, 1, 0],
                    [0, 0, 1]
                ]);
                symmetries.add(mirrorTransform);
                addedTransforms.push({ name: "垂直镜像", transform: mirrorTransform });

                // 3-4. 两个2重旋转中心 (左侧)
                const rotationPositions = [1 / 4, 3 / 4];
                rotationPositions.forEach((pos, index) => {
                    const rotationTransform = new Transform2D([
                        [-1, 0, 0],
                        [0, -1, pos * unitCell.height],
                        [0, 0, 1]
                    ]);
                    symmetries.add(rotationTransform);
                    addedTransforms.push({ name: `左侧旋转${index + 1}`, transform: rotationTransform });
                });

                // 5. 滑移反射 g
                const glideTransform = new Transform2D([
                    [-1, 0, unitCell.width / 2],
                    [0, 1, unitCell.height / 2],
                    [0, 0, 1]
                ]);

                symmetries.add(glideTransform);
                addedTransforms.push({ name: "滑移反射", transform: glideTransform });

                // 6-7. 两个2重旋转中心 (右侧)
                rotationPositions.forEach((pos, index) => {
                    const rotationTransform = new Transform2D([
                        [-1, 0, unitCell.width],
                        [0, -1, pos * unitCell.height],
                        [0, 0, 1]
                    ]);
                    symmetries.add(rotationTransform);
                    addedTransforms.push({ name: `右侧旋转${index + 1}`, transform: rotationTransform });
                });

                // 8. 第二个垂直镜像 (x = 3w/2)
                const secondMirrorTransform = new Transform2D([
                    [-1, 0, 3 * unitCell.width / 2],
                    [0, 1, 0],
                    [0, 0, 1]
                ]);
                symmetries.add(secondMirrorTransform);
                addedTransforms.push({ name: "第二垂直镜像", transform: secondMirrorTransform });

                // 验证对称操作数量和正确性
                if (symmetries.size !== 8) {
                    console.error('添加的变换:', addedTransforms.map(t => ({
                        name: t.name,
                        matrix: t.transform.matrix.map(row => row.map(v => Math.round(v * 1e6) / 1e6)),
                        determinant: this.calculateDeterminant(t.transform.matrix)
                    })));
                    throw new Error(`PMG群对称操作数量错误: 期望 8 个, 实际 ${symmetries.size} 个`);
                }
                // 验证每个变换的有效性
                addedTransforms.forEach(({ name, transform }) => {
                    if (!this.validatePMGSymmetry(transform)) {
                        throw new Error(`无效的PMG群变换: ${name}`);
                    }
                });
                break;
            default:
                throw new Error(`不支持的墙纸群类型: ${this.type}`);
        }

        return symmetries;
    }

    // 添加新的辅助方法
    generateTranslations(unitCell) {
        const translations = [];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                translations.push(Transform2D.translation(
                    dx * unitCell.width,
                    dy * unitCell.height
                ));
            }
        }
        return translations;
    }

    getTransformKey(transform, epsilon) {
        return transform.matrix.map(row =>
            row.map(val => Math.round(val / epsilon) * epsilon).join(',')
        ).join(';');
    }

    isTransformDuplicate(transform, existingTransforms) {
        const scale = Math.max(
            this.lattice.basis1.length(),
            this.lattice.basis2.length()
        );
        const epsilon = scale * 1e-10;

        return this.compareTransformsWithTolerance(
            transform,
            existingTransforms,
            epsilon
        );
    }

    compareTransformsWithTolerance(transform, existingTransforms, epsilon) {
        return existingTransforms.some(existing => {
            // 比较阵元素
            const matrixEqual = transform.matrix.every((row, i) =>
                row.every((val, j) =>
                    Math.abs(val - existing.matrix[i][j]) < epsilon
                )
            );

            if (!matrixEqual) return false;

            // 额外检查��换效果
            const testPoints = [
                new Vector2(0, 0),
                new Vector2(1, 0),
                new Vector2(0, 1)
            ];

            return testPoints.every(p => {
                const p1 = transform.apply(p);
                const p2 = existing.apply(p);
                return Math.abs(p1.x - p2.x) < epsilon &&
                    Math.abs(p1.y - p2.y) < epsilon;
            });
        });
    }

    calculateDomainBounds(domain) {
        if (!domain || !domain.polygons || domain.polygons.size === 0) {
            throw new Error('无的基本区域');
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        // 遍历所有多边形的顶点来确定边界
        for (const [_, polygon] of domain.polygons) {
            for (const vertex of polygon.vertices) {
                minX = Math.min(minX, vertex.x);
                minY = Math.min(minY, vertex.y);
                maxX = Math.max(maxX, vertex.x);
                maxY = Math.max(maxY, vertex.y);
            }
        }

        return {
            min: new Vector2(minX, minY),
            max: new Vector2(maxX, maxY)
        };
    }

}
// core/pattern/pattern-definition.js
export class PatternDefinition {
    constructor() {
        this.lattice = null;              // 晶格
        this.fundamentalDomain = null;    // 基本区域
        this.wallpaperGroup = null;       // 墙纸群
        this.boundaryConditions = new Map(); // 边界条件
    }
    transformFundamentalDomain(point) {
        if (!this.fundamentalDomain) {
            throw new Error('未设置基本区域');
        }

        const transformedRegion = {
            polygons: []
        };

        // 获取所有对称操作
        const symmetries = this.wallpaperGroup.getAllSymmetries();
        const epsilon = Math.min(
            this.lattice.basis1.length(),
            this.lattice.basis2.length()
        ) * 1e-10;

        // 修改：先应用对称操作，再进行平移
        for (const [id, polygon] of this.fundamentalDomain.polygons) {
            for (const symmetry of symmetries) {
                // 先应用称变换
                const symmetryTransformed = polygon.vertices.map(v =>
                    symmetry.apply(v)
                );

                // 再应用平移
                const transformedVertices = symmetryTransformed.map(v =>
                    v.add(point)
                );

                // 验证变换后的多边形
                if (isValidTransformedPolygon(
                    transformedVertices,
                    transformedRegion.polygons,
                    epsilon
                )) {
                    transformedRegion.polygons.push({
                        vertices: transformedVertices,
                        properties: { ...polygon.properties }
                    });
                }

            }
        }

        return transformedRegion;
    }

    // 修改生成方法以确保完整覆盖
    generate(bounds) {
        const pattern = new Pattern(this.lattice, this.wallpaperGroup);

        // 扩大生成范围以确保完整覆盖
        const expandedBounds = {
            min: new Vector2(
                bounds.min.x - this.lattice.basis1.length(),
                bounds.min.y - this.lattice.basis2.length()
            ),
            max: new Vector2(
                bounds.max.x + this.lattice.basis1.length(),
                bounds.max.y + this.lattice.basis2.length()
            )
        };

        // 获取扩展范围内的所有晶格点
        const latticePoints = this.getLatticePointsInBounds(expandedBounds);

        // 在每个晶格点应用基本区域
        for (const point of latticePoints) {
            const transformed = this.transformFundamentalDomain(point);
            transformed.polygons.forEach(polygon => {
                pattern.addRegion(polygon);
            });
        }

        return pattern;
    }

    // 改进晶格点计算方法
    getLatticePointsInBounds(bounds) {
        const basis1Len = this.lattice.basis1.length();
        const basis2Len = this.lattice.basis2.length();

        // 计算需要的晶格点范围
        const mMin = Math.floor(bounds.min.x / basis1Len) - 1;
        const mMax = Math.ceil(bounds.max.x / basis1Len) + 1;
        const nMin = Math.floor(bounds.min.y / basis2Len) - 1;
        const nMax = Math.ceil(bounds.max.y / basis2Len) + 1;

        const points = new Set();
        const epsilon = Math.min(basis1Len, basis2Len) * 1e-10;

        // 生成所有需要的晶格点
        for (let m = mMin; m <= mMax; m++) {
            for (let n = nMin; n <= nMax; n++) {
                const point = this.lattice.getLatticePoint(m, n);

                // 使用Set避免重点
                const isUnique = Array.from(points).every(p =>
                    point.distanceTo(p) > epsilon
                );

                if (isUnique) {
                    points.add(point);
                }
            }
        }

        return Array.from(points);
    }

    isValidTransformedPolygon(vertices, existingPolygons, epsilon) {
        // 检查多边形是否有效
        if (!vertices || vertices.length < 3) return false;

        // 检查顶点是否重合
        for (let i = 0; i < vertices.length; i++) {
            for (let j = i + 1; j < vertices.length; j++) {
                if (vertices[i].distanceTo(vertices[j]) < epsilon) {
                    return false;
                }
            }
        }

        // 检查与现有多边形的重叠
        return !existingPolygons.some(polygon =>
            polygonsOverlap(vertices, polygon.vertices, epsilon)
        );
    }

    // 设置晶格结构
    setLattice(basis1, basis2) {
        this.lattice = new Lattice(basis1, basis2);
    }

    // 设基本区域
    setFundamentalDomain(domain) {
        this.fundamentalDomain = domain;
    }

    // 设置对称群
    setWallpaperGroup(type) {
        this.type = type;
        if (!this.lattice || !this.fundamentalDomain) {
            throw new Error('在设置墙纸群之前必须先设置晶格和基本区域');
        }
        console.log(this.lattice)
        // 创建新的墙纸群对象
        this.wallpaperGroup = new WallpaperGroup(type, this.fundamentalDomain, this.lattice);

        // 添加: 确保为 PMG 群设置正确的对称信息
        if (type === 'pmg') {
            const unitCell = {
                width: this.lattice.basis1.length(),
                height: this.lattice.basis2.length()
            };

            // PMG 群的对称元素
            this.symmetryInfo = {
                // 垂直镜像线
                mirrorLine: {
                    point: new Vector2(unitCell.width / 2, 0),
                    direction: new Vector2(0, 1)
                },
                // 滑移向量
                glideVector: new Vector2(0, unitCell.height / 2),
                // 旋转中心
                rotationCenters: [
                    new Vector2(0, unitCell.height / 4),
                    new Vector2(0, 3 * unitCell.height / 4),
                    new Vector2(unitCell.width, unitCell.height / 4),
                    new Vector2(unitCell.width, 3 * unitCell.height / 4)
                ]
            };
        }
    }

    // 添加边界条件
    addBoundaryCondition(edge1, edge2, relation) {
        this.boundaryConditions.set(edge1, { target: edge2, relation });
    }

    // 生成完整图案
    generate(bounds) {
        const pattern = new Pattern(this.lattice, this.wallpaperGroup);

        // 1. 获取范围内的所有晶格点
        const latticePoints = this.getLatticePointsInBounds(bounds);

        // 2. 在每个晶格点应用基本区域
        for (const point of latticePoints) {
            const transformed = this.transformFundamentalDomain(point);
            // 添加每个变换后的多边形
            transformed.polygons.forEach(polygon => {
                pattern.addRegion(polygon);
            });
        }

        // 3. 应用对称操作
        this.applySymmetries(pattern);

        // 4. 处理边界条件
        this.applyBoundaryConditions(pattern);

        return pattern;
    }

    getLatticePointsInBounds(bounds) {
        if (!bounds || !bounds.min || !bounds.max) {
            throw new Error('效的边界参数');
        }

        // 计算基本区域边界
        const domainBounds = this.calculateDomainBounds(this.fundamentalDomain);
        const domainWidth = domainBounds.max.x - domainBounds.min.x;
        const domainHeight = domainBounds.max.y - domainBounds.min.y;

        // 计算晶基向量的长度
        const basis1Len = this.lattice.basis1.length();
        const basis2Len = this.lattice.basis2.length();

        // 扩展边界以确保完整覆盖
        const mMin = Math.floor((bounds.min.x - domainWidth) / basis1Len);
        const mMax = Math.ceil((bounds.max.x + domainWidth) / basis1Len);
        const nMin = Math.floor((bounds.min.y - domainHeight) / basis2Len);
        const nMax = Math.ceil((bounds.max.y + domainHeight) / basis2Len);

        const points = new Set();
        const epsilon = Math.min(basis1Len, basis2Len) * 1e-10;

        for (let m = mMin; m <= mMax; m++) {
            for (let n = nMin; n <= nMax; n++) {
                const point = this.lattice.getLatticePoint(m, n);

                // 使用Set来避免重复点，并用epsilon进行比较
                const isUnique = Array.from(points).every(p =>
                    Math.abs(p.x - point.x) > epsilon ||
                    Math.abs(p.y - point.y) > epsilon
                );

                if (isUnique) {
                    points.add(point);
                }
            }
        }

        return Array.from(points);
    }
    calculateDomainBounds(domain) {
        if (!domain || !domain.polygons || domain.polygons.size === 0) {
            throw new Error('无效的基本区域');
        }

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for (const [_, polygon] of domain.polygons) {
            for (const vertex of polygon.vertices) {
                minX = Math.min(minX, vertex.x);
                minY = Math.min(minY, vertex.y);
                maxX = Math.max(maxX, vertex.x);
                maxY = Math.max(maxY, vertex.y);
            }
        }

        return {
            min: new Vector2(minX, minY),
            max: new Vector2(maxX, maxY),
            width: maxX - minX,
            height: maxY - minY,
            center: new Vector2((minX + maxX) / 2, (minY + maxY) / 2)
        };
    }

    transformFundamentalDomain(point) {
        if (!this.fundamentalDomain) {
            throw new Error('未设置基本区域');
        }

        const transformedRegion = {
            polygons: []
        };

        const symmetries = this.wallpaperGroup.getAllSymmetries();
        const domainBounds = this.calculateDomainBounds(this.fundamentalDomain);
        const epsilon = Math.min(
            this.lattice.basis1.length(),
            this.lattice.basis2.length()
        ) * 1e-10;

        for (const [id, polygon] of this.fundamentalDomain.polygons) {
            for (const symmetry of symmetries) {
                // 组合变换：先对称变换，再平移
                const combinedTransform = Transform2D.compose(
                    Transform2D.translation(point.x, point.y),
                    symmetry
                );

                const transformedVertices = polygon.vertices.map(v =>
                    combinedTransform.apply(v)
                );

                // 验证变换后的边形
                if (this.isValidTransformedPolygon(
                    transformedVertices,
                    transformedRegion.polygons,
                    epsilon
                )) {
                    transformedRegion.polygons.push({
                        vertices: transformedVertices,
                        properties: { ...polygon.properties }
                    });
                }
            }
        }

        return transformedRegion;
    }

    isValidTransformedPolygon(vertices, existingPolygons, epsilon) {
        // 检查多边形是有效
        if (!vertices || vertices.length < 3) return false;

        // 检查顶点是否重合
        for (let i = 0; i < vertices.length; i++) {
            for (let j = i + 1; j < vertices.length; j++) {
                if (vertices[i].distanceTo(vertices[j]) < epsilon) {
                    return false;
                }
            }
        }

        // 检查与现有多边形的重叠
        return !existingPolygons.some(polygon =>
            polygonsOverlap(vertices, polygon.vertices, epsilon)
        );
    }


    applySymmetries(pattern) {
        const symmetries = this.wallpaperGroup.getAllSymmetries();
        const newRegions = [];

        for (const region of pattern.getAllRegions()) {
            for (const symmetry of symmetries) {
                const transformedRegion = this.applyTransform(region, symmetry);
                if (!this.isDuplicateRegion(newRegions, transformedRegion)) {
                    newRegions.push(transformedRegion);
                }
            }
        }

        pattern.regions = new Set(newRegions);
    }

    applyBoundaryConditions(pattern) {
        for (const [edge1, { target: edge2, relation }] of this.boundaryConditions) {
            this.matchBoundaryCondition(pattern, edge1, target, relation);
        }
    }

    // 辅助方法
    isPointInBounds(point, bounds) {
        return point.x >= bounds.min.x && point.x <= bounds.max.x &&
            point.y >= bounds.min.y && point.y <= bounds.max.y;
    }

    applyTransform(region, transform) {
        return {
            vertices: region.vertices.map(v => transform.apply(v)),
            properties: { ...region.properties }
        };
    }

    matchBoundaryCondition(pattern, edge1, edge2) {
        if (!edge1 || !edge2) {
            throw new Error('边界条件参数无效');
        }

        switch (relation) {
            case 'adjacent':
                this.matchAdjacentBoundaries(pattern, edge1, edge2);
                break;
            case 'periodic':
                this.matchPeriodicBoundaries(pattern, edge1, edge2);
                break;
            case 'mirror':
                this.matchMirrorBoundaries(pattern, edge1, edge2);
                break;
            default:
                throw new Error(`不支持的边界关系类型: ${relation}`);
        }
    }

    matchAdjacentBoundaries(pattern, edge1, edge2) {
        const { polygon: polyId1, edge: edgeIndex1 } = edge1;
        const { polygon: polyId2, edge: edgeIndex2 } = edge2;

        const polygon1 = Array.from(pattern.regions).find(r => r.properties && r.properties.id === polyId1);
        const polygon2 = Array.from(pattern.regions).find(r => r.properties && r.properties.id === polyId2);

        if (!polygon1 || !polygon2) {
            console.log('可用的多边形:', Array.from(pattern.regions).map(r => r.properties?.id));
            throw new Error(`无法找到指定的多边形: ${!polygon1 ? polyId1 : ''} ${!polygon2 ? polyId2 : ''}`);
        }

        // 检查边的顶点是否匹配
        const edge1Vertices = [
            polygon1.vertices[edgeIndex1[0]],
            polygon1.vertices[edgeIndex1[1]]
        ];
        const edge2Vertices = [
            polygon2.vertices[edgeIndex2[0]],
            polygon2.vertices[edgeIndex2[1]]
        ];

        // 证边长是相等
        const edge1Length = this.getEdgeLength(edge1Vertices[0], edge1Vertices[1]);
        const edge2Length = this.getEdgeLength(edge2Vertices[0], edge2Vertices[1]);

        if (Math.abs(edge1Length - edge2Length) > 1e-6) {
            throw new Error('边界条件中的边长不匹配');
        }
    }

    getEdgeLength(v1, v2) {
        const dx = v2.x - v1.x;
        const dy = v2.y - v1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // 加验方法
    validate() {
        if (!this.lattice) throw new Error('未设置晶格');
        if (!this.fundamentalDomain) throw new Error('未置基本区域');
        if (!this.wallpaperGroup) throw new Error('未设置墙纸');
        // 验证界条件的合法性
        this.validateBoundaryConditions();
    }

    // 添加新的助方法
    isDuplicateRegion(regions, newRegion) {
        return regions.some(region =>
            region.vertices.length === newRegion.vertices.length &&
            region.vertices.every((vertex, index) =>
                Math.abs(vertex.x - newRegion.vertices[index].x) < 1e-6 &&
                Math.abs(vertex.y - newRegion.vertices[index].y) < 1e-6
            )
        );
    }

    // 添加新的界匹配方法
    matchPeriodicBoundaries(pattern, edge1, edge2) {
        const { polygon: poly1, edge: edgeIndex1 } = edge1;
        const { polygon: poly2, edge: edgeIndex2 } = edge2;

        const polygon1 = pattern.findRegion(r => r.properties.id === poly1);
        const polygon2 = pattern.findRegion(r => r.properties.id === poly2);

        if (!polygon1 || !polygon2) {
            throw new Error('无法找到指定的多边形');
        }

        // 获取边的顶点
        const edge1Vertices = [
            polygon1.vertices[edgeIndex1[0]],
            polygon1.vertices[edgeIndex1[1]]
        ];
        const edge2Vertices = [
            polygon2.vertices[edgeIndex2[0]],
            polygon2.vertices[edgeIndex2[1]]
        ];

        // 计算周期性平移向量
        const translation = edge2Vertices[0].subtract(edge1Vertices[0]);

        // 创建新的变换后的区域
        const transformedRegions = new Set();
        for (const region of pattern.regions) {
            // 应用平移
            const translatedVertices = region.vertices.map(v => v.add(translation));
            const transformedRegion = {
                vertices: translatedVertices,
                properties: { ...region.properties }
            };

            // 检查是否在有效范围内并且不重复
            if (!this.isDuplicateRegion([...pattern.regions], transformedRegion)) {
                transformedRegions.add(transformedRegion);
            }
        }

        // 将新区域添加到图案中
        transformedRegions.forEach(region => pattern.regions.add(region));
    }

    matchMirrorBoundaries(pattern, edge1, edge2) {
        const { polygon: poly1, edge: edgeIndex1 } = edge1;
        const { polygon: poly2, edge: edgeIndex2 } = edge2;

        const polygon1 = pattern.findRegion(r => r.properties.id === poly1);
        const polygon2 = pattern.findRegion(r => r.properties.id === poly2);

        if (!polygon1 || !polygon2) {
            throw new Error('无法找到指定的多边形');
        }

        // 获取边顶点
        const edge1Vertices = [
            polygon1.vertices[edgeIndex1[0]],
            polygon1.vertices[edgeIndex1[1]]
        ];

        // 计算镜像变换
        const mirrorLine = {
            point: edge1Vertices[0],
            direction: edge1Vertices[1].subtract(edge1Vertices[0]).normalize()
        };

        // 创建新的镜像区域
        const mirroredRegions = new Set();
        for (const region of pattern.regions) {
            // 对每个顶点进行镜像换
            const mirroredVertices = region.vertices.map(v => this.mirrorPoint(v, mirrorLine));
            const mirroredRegion = {
                vertices: mirroredVertices,
                properties: { ...region.properties }
            };

            // 是否在有效范围内且不重复
            if (!this.isDuplicateRegion([...pattern.regions], mirroredRegion)) {
                mirroredRegions.add(mirroredRegion);
            }
        }

        // 将新区域添加到图案中
        mirroredRegions.forEach(region => pattern.regions.add(region));
    }

    // 辅助方法：计算点关于直线的镜像
    mirrorPoint(point, line) {
        const dir = line.direction.normalize();
        const v = point.subtract(line.point);

        // 计算点到直线的投影
        const proj = dir.scale(v.dot(dir));

        // 计算垂直分量并翻转
        const perp = v.subtract(proj);

        // 镜像点 = 原点 - 2 * 垂直分量
        return point.subtract(perp.scale(2));
    }

    // 添加边界条件验证方法
    validateBoundaryConditions() {
        for (const [edge1, { target: edge2, relation }] of this.boundaryConditions) {
            // 证边的在性
            if (!edge1 || !edge2) {
                throw new Error('边界条件中存在无效的边引用');
            }

            // 验证关系类型
            if (!['adjacent', 'periodic', 'mirror'].includes(relation)) {
                throw new Error(`不支持的边界关系类型: ${relation}`);
            }

            // 验证边长匹配
            const length1 = this.getEdgeLength(
                edge1.vertices[0],
                edge1.vertices[1]
            );
            const length2 = this.getEdgeLength(
                edge2.vertices[0],
                edge2.vertices[1]
            );

            if (Math.abs(length1 - length2) > 1e-6) {
                throw new Error('边界条件中的边长不匹配');
            }
        }
    }

    // 添加新辅助方法来检查临近点
    hasNearbyPoint(points, newPoint, threshold = 0.1) {
        return points.some(point =>
            Math.abs(point.x - newPoint.x) < threshold &&
            Math.abs(point.y - newPoint.y) < threshold
        );
    }

    // 添加新的辅助方法
    isPolygonValid(vertices) {
        // 检查多边形的有效性
        if (!vertices || vertices.length < 3) return false;

        // 检查顶点是否重合
        for (let i = 0; i < vertices.length; i++) {
            for (let j = i + 1; j < vertices.length; j++) {
                if (vertices[i].distanceTo(vertices[j]) < 1e-6) {
                    return false;
                }
            }
        }

        return true;
    }
}



export class Pattern {
    constructor(lattice = null, wallpaperGroup = null) {
        this.regions = new Set();
        this.lattice = lattice;
        this.wallpaperGroup = wallpaperGroup;
    }
    addRegion(region) {
        if (!region || !region.vertices || !Array.isArray(region.vertices)) {
            throw new Error('无效的区域数据');
        }

        // 改进重叠检测的精度
        const epsilon = Math.min(
            this.lattice.basis1.length(),
            this.lattice.basis2.length()
        ) * 1e-10;

        // 只有当没有重叠时才添加新区域
        if (!this.overlapsExistingRegions(region, epsilon)) {
            const clonedRegion = {
                vertices: region.vertices.map(v => v.clone()),
                properties: { ...region.properties }
            };
            this.regions.add(clonedRegion);
        }
    }

    overlapsExistingRegions(newRegion, epsilon) {
        return Array.from(this.regions).some(region => {
            const bounds1 = calculateBounds(region.vertices);
            const bounds2 = calculateBounds(newRegion.vertices);

            if (!boundingBoxesOverlap(bounds1, bounds2, epsilon)) {
                return false;
            }

            return polygonsOverlap(
                region.vertices,
                newRegion.vertices,
                epsilon
            );
        });
    }

    regionsOverlap(region1, region2, epsilon) {
        // 先进行边界框快速检测
        const bounds1 = this.calculateRegionBounds(region1);
        const bounds2 = this.calculateRegionBounds(region2);

        if (!this.boundingBoxesOverlap(bounds1, bounds2, epsilon)) {
            return false;
        }

        // 使用分离轴定理进行精确测
        return this.polygonsOverlap(
            region1.vertices,
            region2.vertices,
            epsilon
        );
    }

    calculateRegionBounds(region) {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for (const vertex of region.vertices) {
            minX = Math.min(minX, vertex.x);
            minY = Math.min(minY, vertex.y);
            maxX = Math.max(maxX, vertex.x);
            maxY = Math.max(maxY, vertex.y);
        }

        return { minX, minY, maxX, maxY };
    }

    boundingBoxesOverlap(bounds1, bounds2, epsilon) {
        return !(
            bounds1.maxX + epsilon < bounds2.minX ||
            bounds2.maxX + epsilon < bounds1.minX ||
            bounds1.maxY + epsilon < bounds2.minY ||
            bounds2.maxY + epsilon < bounds1.minY
        );
    }

    // 添加找方法
    findRegion(predicate) {
        for (const region of this.regions) {
            if (predicate(region)) {
                return region;
            }
        }
        return null;
    }

    // 添加获取所有区的方法
    getAllRegions() {
        return Array.from(this.regions);
    }

    // 添加变换验证方法
    validateTransform(transform, region) {
        const transformedVertices = region.vertices.map(v => transform.apply(v));
        return !this.overlapsExistingRegions({
            vertices: transformedVertices,
            properties: region.properties
        });
    }

    polygonsOverlap(vertices1, vertices2, epsilon) {
        // 使用分离轴定理检多边形重叠
        const edges = this.getEdges(vertices1).concat(this.getEdges(vertices2));

        for (const edge of edges) {
            const normal = new Vector2(-edge.y, edge.x).normalize();

            const proj1 = this.projectPolygon(vertices1, normal);
            const proj2 = this.projectPolygon(vertices2, normal);

            if (proj1.max + epsilon < proj2.min ||
                proj2.max + epsilon < proj1.min) {
                return false;
            }
        }

        return true;
    }

    getEdges(vertices) {
        const edges = [];
        for (let i = 0; i < vertices.length; i++) {
            const j = (i + 1) % vertices.length;
            edges.push(new Vector2(
                vertices[j].x - vertices[i].x,
                vertices[j].y - vertices[i].y
            ));
        }
        return edges;
    }

    projectPolygon(vertices, normal) {
        let min = Infinity;
        let max = -Infinity;

        for (const vertex of vertices) {
            const proj = vertex.dot(normal);
            min = Math.min(min, proj);
            max = Math.max(max, proj);
        }

        return { min, max };
    }

    // 添加辅助方法
    calculateDeterminant(matrix) {
        return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
    }
}

// 添加 PatternRenderer 类
export class PatternRenderer {
    constructor(width = 800, height = 600, canvas) {
        this.width = width;
        this.height = height;
        this.canvas = canvas || document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext('2d');
        this.scale = 1;
    }
    clear() {
        // 获取 2D 上下文
        const ctx = this.canvas.getContext('2d');
        // 清除整个画布区域
        ctx.clearRect(0, 0, this.width, this.height);
        // 重置变换矩阵
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    async renderToBlobURL(pattern, options) {
        this.renderPattern(pattern, options);
        return new Promise(resolve => {
            this.canvas.toBlob(blob => {
                resolve(URL.createObjectURL(blob));
            });
        });
    }

    renderPattern(pattern, options) {
            const {
        backgroundColor = '#ffffff',
        strokeColor = '#000000',
        defaultFillColor = '#808080', 
        lineWidth = 1,
        showLabels = true,
        fontSize = 12,
        showGrid = true,
        gridColor = '#cccccc',
        showSymmetryMarkers = true,
        showCenterPoint = true, // 添加显示中心点选项
        centerPointColor = '#ff0000', // 中心点颜色
        centerPointSize = 5, // 中心点大小
        scale = this.scale,
        viewport = null
    } = options;


        const ctx = this.ctx;

        // 清除并设置背景
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, this.width, this.height);

        // 修改边界计算方式,确保包含完整的晶格单元
        const patternBounds = pattern.wallpaperGroup.calculatePatternBounds();
        const basis1Len = pattern.lattice.basis1.length();
        const basis2Len = pattern.lattice.basis2.length();
        
        // 扩展边界到完整的晶格单元
        const expandedBounds = {
            min: new Vector2(
                Math.floor(patternBounds.min.x / basis1Len) * basis1Len,
                Math.floor(patternBounds.min.y / basis2Len) * basis2Len
            ),
            max: new Vector2(
                Math.ceil(patternBounds.max.x / basis1Len) * basis1Len,
                Math.ceil(patternBounds.max.y / basis2Len) * basis2Len
            )
        };

        // 使用扩展后的边界计算尺寸
        const patternWidth = expandedBounds.max.x - expandedBounds.min.x;
        const patternHeight = expandedBounds.max.y - expandedBounds.min.y;

        // 使用传入的scale计算实际尺寸
        const scaledWidth = patternWidth * scale;
        const scaledHeight = patternHeight * scale;
        
        // 计算居中偏移量
        const offsetX = (this.width - scaledWidth) / 2;
        const offsetY = (this.height - scaledHeight) / 2;
        
        ctx.save();
        
        // 应用变换
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, -scale);
        // 修改变换原点,使用扩展后的边界
        ctx.translate(-expandedBounds.min.x, -expandedBounds.max.y);

        // 绘制网格
        if (showGrid) {
            this.drawGrid(
                pattern.lattice,
                gridColor,
                patternBounds,
                lineWidth,
                options.gridOptions
            );
        }

        // 绘制图案区域
        const regions = Array.from(pattern.regions);
        for (const region of regions) {
            const vertices = region.vertices;

            ctx.beginPath();
            ctx.moveTo(vertices[0].x, vertices[0].y);
            for (let i = 1; i < vertices.length; i++) {
                ctx.lineTo(vertices[i].x, vertices[i].y);
            }
            ctx.closePath();

            // 填充
            ctx.fillStyle = region.properties?.fillColor || defaultFillColor;
            ctx.fill();

            // 描边
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = lineWidth / scale;
            ctx.stroke();

            // 绘制标签
            if (showLabels && region.properties?.label) {
                const center = this.calculatePolygonCenter(vertices);
                ctx.save();
                ctx.scale(1, -1); // 翻转文字方向
                ctx.fillStyle = '#000000';
                ctx.font = `${fontSize / scale}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(region.properties.label, center.x, -center.y);
                ctx.restore();
            }
        }

        // 绘制对称标记
        if (showSymmetryMarkers && pattern.wallpaperGroup) {
            this.drawSymmetryMarkers(pattern, {
                viewport: patternBounds,
                scale,
                lineWidth: lineWidth,
                ...options.symmetryOptions
            });
        }
        // 修改中心点计算,使用扩展后的边界
        if (showCenterPoint) {
            // 计算图案中心点,使用扩展后的边界
            const centerX = (expandedBounds.max.x + expandedBounds.min.x) / 2;
            const centerY = (expandedBounds.max.y + expandedBounds.min.y) / 2;
            
            // 绘制十字线
            ctx.beginPath();
            ctx.strokeStyle = centerPointColor;
            ctx.lineWidth = lineWidth / scale;
            
            // 水平线
            ctx.moveTo(centerX - centerPointSize / scale, centerY);
            ctx.lineTo(centerX + centerPointSize / scale, centerY);
            
            // 垂直线
            ctx.moveTo(centerX, centerY - centerPointSize / scale);
            ctx.lineTo(centerX, centerY + centerPointSize / scale);
            
            ctx.stroke();
            
            // 绘制圆点
            ctx.beginPath();
            ctx.fillStyle = centerPointColor;
            ctx.arc(centerX, centerY, (centerPointSize * 0.3) / scale, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    drawGrid(lattice, color, viewport, lineWidth, options = {}) {
        const ctx = this.ctx;
        ctx.save();

        // 修改: 使用更新的网格选项
        const {
            showHorizontalLines = true,
            showVerticalLines = true,
            dashLength = 0,
            gapLength = 0,
            opacity = 0.3,
            lineWidth: gridLineWidth = lineWidth * 0.5
        } = options;

        // 设置网格线样式
        ctx.strokeStyle = color;
        ctx.lineWidth = gridLineWidth;
        if (dashLength > 0 || gapLength > 0) {
            ctx.setLineDash([dashLength, gapLength]);
        } else {
            ctx.setLineDash([]); // 实线
        }
        ctx.globalAlpha = opacity;

        // 计算网格范围
        const basis1 = lattice.basis1;
        const basis2 = lattice.basis2;

        // 扩展网格范围以确保覆盖视口
        const margin = 1;
        const minX = Math.floor(viewport.min.x / basis1.length()) * basis1.length();
        const maxX = Math.ceil(viewport.max.x / basis1.length()) * basis1.length();
        const minY = Math.floor(viewport.min.y / basis2.length()) * basis2.length();
        const maxY = Math.ceil(viewport.max.y / basis2.length()) * basis2.length();

        // 绘制垂直线
        if (showVerticalLines) {
            for (let x = minX; x <= maxX; x += basis1.length()) {
                ctx.beginPath();
                ctx.moveTo(x, minY);
                ctx.lineTo(x, maxY);
                ctx.stroke();
            }
        }

        // 绘制水平线
        if (showHorizontalLines) {
            for (let y = minY; y <= maxY; y += basis2.length()) {
                ctx.beginPath();
                ctx.moveTo(minX, y);
                ctx.lineTo(maxX, y);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    calculatePolygonCenter(vertices) {
        let sumX = 0, sumY = 0;
        vertices.forEach(v => {
            sumX += v.x;
            sumY += v.y;
        });
        return new Vector2(
            sumX / vertices.length,
            sumY / vertices.length
        );
    }

    drawSymmetryMarkers(pattern, options = {}) {
        const ctx = this.ctx;
        ctx.save();

        const {
            mirrorLineColor = 'rgba(255, 0, 0, 0.8)',
            glideLineColor = 'rgba(0, 255, 0, 0.8)',
            rotationCenterColor = 'rgba(0, 0, 255, 0.8)',
            markerSize = Math.min(pattern.lattice.basis1.length(), pattern.lattice.basis2.length()) * 0.1,
            lineWidth = 1,
            showLabels = true,
            fontSize = 12,
            viewport
        } = options;

        // 获取对称信息生成函数
        const getSymmetryInfo = pattern.wallpaperGroup.getSymmetryInfo();

        // 计算需要绘制的晶格范围
        const basis1Len = pattern.lattice.basis1.length();
        const basis2Len = pattern.lattice.basis2.length();

        const minCellX = Math.floor(viewport.min.x / basis1Len);
        const maxCellX = Math.ceil(viewport.max.x / basis1Len);
        const minCellY = Math.floor(viewport.min.y / basis2Len);
        const maxCellY = Math.ceil(viewport.max.y / basis2Len);

        // 遍历每个晶格单元
        for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
            for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
                // 获取当前晶格单元的对称信息

                const symmetryInfo = getSymmetryInfo(cellX, cellY);

                ctx.lineWidth = lineWidth;
                console.log(symmetryInfo)
                // 1. 绘制镜像线
                if (symmetryInfo.mirrorLines) {
                    ctx.strokeStyle = mirrorLineColor;
                    ctx.setLineDash([5, 5]);
                    symmetryInfo.mirrorLines.forEach(
                        mirrorLine => {
                            const start = mirrorLine.point;
                            const direction = mirrorLine.direction;
                            const length = basis2Len;

                            const end = new Vector2(
                                start.x + direction.x * length,
                                start.y + direction.y * length
                            );

                            ctx.beginPath();
                            ctx.moveTo(start.x, start.y);
                            ctx.lineTo(end.x, end.y);
                            ctx.stroke();

                            if (showLabels) {
                                ctx.font = `${fontSize}px Arial`;
                                ctx.fillStyle = mirrorLineColor;
                                ctx.fillText('m', start.x - 15, start.y + 15);
                            }

                        }
                    )
                }

                // 2. 绘制滑移线
                if (symmetryInfo.glideVector) {
                    ctx.strokeStyle = glideLineColor;
                    ctx.setLineDash([10, 5]);
                    const cellOrigin = pattern.lattice.getLatticePoint(cellX, cellY);
                    const start = cellOrigin;
                    const end = new Vector2(
                        cellOrigin.x + symmetryInfo.glideVector.x,
                        cellOrigin.y + symmetryInfo.glideVector.y
                    );
                    ctx.beginPath()
                    ctx.moveTo(start.x, start.y);
                    ctx.lineTo(end.x, end.y);
                    ctx.stroke();
                    this.drawArrow(start, end, markerSize);
                    if (showLabels) {
                        ctx.font = `${fontSize}px Arial`;
                        ctx.fillStyle = glideLineColor;
                        ctx.fillText('g', (start.x + end.x) / 2 - 15, (start.y + end.y) / 2 - 5);
                    }
                }

                // 3. 绘制旋转中心
                if (symmetryInfo.rotationCenters) {
                    ctx.fillStyle = rotationCenterColor;
                    ctx.strokeStyle = rotationCenterColor;
                    ctx.setLineDash([]);

                    for (const center of symmetryInfo.rotationCenters) {
                        ctx.beginPath();
                        ctx.arc(center.x, center.y, markerSize * 0.3, 0, Math.PI * 2);
                        ctx.fill();

                        ctx.beginPath();
                        ctx.arc(center.x, center.y, markerSize, 0, Math.PI, true);
                        ctx.stroke();

                        this.drawRotationArrow(
                            new Vector2(
                                center.x + markerSize * Math.cos(Math.PI),
                                center.y + markerSize * Math.sin(Math.PI)
                            ),
                            Math.PI,
                            markerSize * 0.3
                        );

                        if (showLabels) {
                            ctx.font = `${fontSize}px Arial`;
                            ctx.fillStyle = rotationCenterColor;
                            ctx.fillText('2', center.x - 5, center.y + markerSize + 15);
                        }
                    }
                }
            }
        }

        ctx.restore();
    }

    // 辅助方法：绘制箭头
    drawArrow(start, end, size) {
        const ctx = this.ctx;
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const arrowAngle = Math.PI / 6; // 30度

        // 绘制箭头头部
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(
            end.x - size * Math.cos(angle - arrowAngle),
            end.y - size * Math.sin(angle - arrowAngle)
        );
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(
            end.x - size * Math.cos(angle + arrowAngle),
            end.y - size * Math.sin(angle + arrowAngle)
        );
        ctx.stroke();
    }

    // 辅助方法：绘制旋转箭头
    drawRotationArrow(tip, angle, size) {
        const ctx = this.ctx;
        const arrowAngle = Math.PI / 6;

        ctx.beginPath();
        ctx.moveTo(tip.x, tip.y);
        ctx.lineTo(
            tip.x + size * Math.cos(angle + arrowAngle),
            tip.y + size * Math.sin(angle + arrowAngle)
        );
        ctx.moveTo(tip.x, tip.y);
        ctx.lineTo(
            tip.x + size * Math.cos(angle - arrowAngle),
            tip.y + size * Math.sin(angle - arrowAngle)
        );
        ctx.stroke();
    }
}

// 添加新的工具函数
export const PatternUtils = {
    calculateMotifBounds(vertices) {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for (const vertex of vertices) {
            minX = Math.min(minX, vertex.x);
            minY = Math.min(minY, vertex.y);
            maxX = Math.max(maxX, vertex.x);
            maxY = Math.max(maxY, vertex.y);
        }

        return {
            minX, minY, maxX, maxY,
            width: maxX - minX,
            height: maxY - minY
        };
    },

    calculateViewportScale(bounds, width, height) {
        const viewportWidth = bounds.max.x - bounds.min.x;
        const viewportHeight = bounds.max.y - bounds.min.y;

        const padding = 0.1;
        const effectiveWidth = viewportWidth * (1 + padding);
        const effectiveHeight = viewportHeight * (1 + padding);

        return Math.min(
            width / effectiveWidth,
            height / effectiveHeight
        ) * 0.9;
    }
};

