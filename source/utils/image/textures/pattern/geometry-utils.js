export function polygonsOverlap(vertices1, vertices2, epsilon) {
    const edges = getEdges(vertices1).concat(getEdges(vertices2));

    for (const edge of edges) {
        const normal = new Vector2(-edge.y, edge.x).normalize();
        const proj1 = projectPolygon(vertices1, normal);
        const proj2 = projectPolygon(vertices2, normal);

        if (proj1.max + epsilon < proj2.min ||
            proj2.max + epsilon < proj1.min) {
            return false;
        }
    }
    return true;
}

export function getEdges(vertices) {
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

export function projectPolygon(vertices, normal) {
    let min = Infinity;
    let max = -Infinity;

    for (const vertex of vertices) {
        const proj = vertex.dot(normal);
        min = Math.min(min, proj);
        max = Math.max(max, proj);
    }

    return { min, max };
}

export function calculateBounds(vertices) {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const vertex of vertices) {
        minX = Math.min(minX, vertex.x);
        minY = Math.min(minY, vertex.y);
        maxX = Math.max(maxX, vertex.x);
        maxY = Math.max(maxY, vertex.y);
    }

    return {
        min: new Vector2(minX, minY),
        max: new Vector2(maxX, maxY),
        width: maxX - minX,
        height: maxY - minY,
        center: new Vector2((minX + maxX) / 2, (minY + maxY) / 2)
    };
}

export function boundingBoxesOverlap(bounds1, bounds2, epsilon) {
    return !(
        bounds1.max.x + epsilon < bounds2.min.x ||
        bounds2.max.x + epsilon < bounds1.min.x ||
        bounds1.max.y + epsilon < bounds2.min.y ||
        bounds2.max.y + epsilon < bounds1.min.y
    );
}

export function isValidTransformedPolygon(vertices, existingPolygons, epsilon) {
    if (!vertices || vertices.length < 3) return false;

    for (let i = 0; i < vertices.length; i++) {
        for (let j = i + 1; j < vertices.length; j++) {
            if (vertices[i].distanceTo(vertices[j]) < epsilon) {
                return false;
            }
        }
    }

    return !existingPolygons.some(polygon =>
        polygonsOverlap(vertices, polygon.vertices, epsilon)
    );
}
export class Vector2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    add(v) { return new Vector2(this.x + v.x, this.y + v.y); }
    scale(s) { return new Vector2(this.x * s, this.y * s); }
    subtract(v) { return new Vector2(this.x - v.x, this.y - v.y); }
    dot(v) { return this.x * v.x + this.y * v.y; }
    length() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    normalize() {
        const len = this.length();
        return len > 0 ? this.scale(1 / len) : new Vector2(0, 0);
    }
    // ... 其他向量运算

    // 添加缺失的必要方法
    equals(other, epsilon = 1e-6) {
        return Math.abs(this.x - other.x) < epsilon &&
            Math.abs(this.y - other.y) < epsilon;
    }

    clone() {
        return new Vector2(this.x, this.y);
    }

    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vector2(
            this.x * cos - this.y * sin,
            this.x * sin + this.y * cos
        );
    }

    // 添加缺失的实用方法
    distanceTo(other) {
        return this.subtract(other).length();
    }

    angle() {
        return Math.atan2(this.y, this.x);
    }

    angleTo(other) {
        return Math.atan2(other.y - this.y, other.x - this.x);
    }
}

// core/geometry/transform.js
export class Transform2D {
    constructor(matrix = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
        this.matrix = matrix;
    }

    // 基本变换静态方法
    static translation(tx, ty) {
        return new Transform2D([
            [1, 0, tx],
            [0, 1, ty],
            [0, 0, 1]
        ]);
    }

    static rotation(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Transform2D([
            [cos, -sin, 0],
            [sin,  cos, 0],
            [0,    0,   1]
        ]);
    }

    static scale(sx, sy) {
        return new Transform2D([
            [sx, 0,  0],
            [0,  sy, 0],
            [0,  0,  1]
        ]);
    }

    // 变换组合
    static compose(...transforms) {
        if (transforms.length === 0) {
            return new Transform2D();
        }
        // 从右到左组合变换
        return transforms.reduceRight((combined, transform) => {
            if (!(transform instanceof Transform2D)) {
                throw new Error('无效的变换对象');
            }
            return transform.multiply(combined);
        }, new Transform2D());
    }

    // 矩阵乘法
    multiply(other) {
        const result = Array(3).fill().map(() => Array(3).fill(0));
        const epsilon = 1e-10;

        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                let sum = 0;
                for (let k = 0; k < 3; k++) {
                    sum += this.matrix[i][k] * other.matrix[k][j];
                }
                // 处理数值精度
                result[i][j] = Math.abs(sum) < epsilon ? 0 : 
                              Math.abs(sum - 1) < epsilon ? 1 :
                              Math.abs(sum + 1) < epsilon ? -1 : sum;
            }
        }
        return new Transform2D(result);
    }

    // 应用变换到点
    apply(point) {
        const x = this.matrix[0][0] * point.x + this.matrix[0][1] * point.y + this.matrix[0][2];
        const y = this.matrix[1][0] * point.x + this.matrix[1][1] * point.y + this.matrix[1][2];
        return new Vector2(x, y);
    }

    // 辅助函数：判断是否为平移变换
    static translation(tx, ty) {
        return new Transform2D([
            [1, 0, tx],
            [0, 1, ty],
            [0, 0, 1]
        ]);
    }

    // 辅助函数：判断是否为反射变换
    static mirror(line) {
        if (!line || !line.direction || !line.point) {
            throw new Error('无效的反射线参数');
        }

        // 1. 获取并规范化方向向量
        const dir = line.direction.normalize();
        const point = line.point;

        // 2. 计算反射线的参数：ax + by = c
        // 注意：方向向量(dir.x, dir.y)与法向量(-b, a)垂直
        const a = -dir.y;  // 法向量的 x 分量
        const b = dir.x;   // 法向量的 y 分量
        const c = a * point.x + b * point.y;

        // 3. 规范化系数
        const norm = a * a + b * b;
        if (norm < 1e-10) {
            throw new Error('无效的反射线：方向向量为零');
        }

        // 4. 构建反射矩阵
        return new Transform2D([
            [1 - 2*a*a/norm,    -2*a*b/norm,     2*a*c/norm],
            [-2*a*b/norm,      1 - 2*b*b/norm,   2*b*c/norm],
            [0,                0,                1         ]
        ]);
    }

    // 添加绕点旋转的静态方法
    static rotateAround(center, angle) {
        // 1. 移动到原点
        const t1 = Transform2D.translation(-center.x, -center.y);
        // 2. 旋转
        const r = Transform2D.rotation(angle);
        // 3. 移回原位置
        const t2 = Transform2D.translation(center.x, center.y);
        
        // 组合变换：t2 * r * t1
        return Transform2D.compose(t2, r, t1);
    }

    // 添加 isValid 方法
    isValid() {
        const epsilon = 1e-10;
        
        // 1. 检查矩阵维度
        if (!this.matrix || this.matrix.length !== 3 || 
            !this.matrix.every(row => row.length === 3)) {
            return false;
        }

        // 2. 检查齐次坐标条件
        if (Math.abs(this.matrix[2][0]) > epsilon || 
            Math.abs(this.matrix[2][1]) > epsilon || 
            Math.abs(this.matrix[2][2] - 1) > epsilon) {
            return false;
        }

        // 3. 检查是否为正交矩阵（旋转部分）或具有合适的行列式（包括反射）
        const det = this.calculateDeterminant();
        if (Math.abs(Math.abs(det) - 1) > epsilon) {
            return false;
        }

        return true;
    }

    // 行列式计算
    calculateDeterminant() {
        const [[a, b, c], [d, e, f], [g, h, i]] = this.matrix;
        return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
    }

    // 添加辅助方法：验证反射变换
    validateReflection(line) {
        const epsilon = 1e-10;
        
        // 1. 检查行列式是否为 -1
        const det = this.calculateDeterminant();
        if (Math.abs(det + 1) > epsilon) {
            return false;
        }

        // 2. 检查反射线上的点是否不变
        const point = line.point;
        const transformed = this.apply(point);
        if (point.distanceTo(transformed) > epsilon) {
            return false;
        }

        // 3. 检查反射性质：两次反射应该回到原点
        const doubleReflection = this.multiply(this);
        const identity = new Transform2D();
        return doubleReflection.isApproximately(identity, epsilon);
    }

    // 添加用于比较两个变换的方法
    isApproximately(other, epsilon = 1e-10) {
        return this.matrix.every((row, i) =>
            row.every((val, j) =>
                Math.abs(val - other.matrix[i][j]) < epsilon
            )
        );
    }
}

// 辅助函数：判断是否为平移变换
function isTranslation(transform) {
    const m = transform.matrix;
    const epsilon = 1e-10;
    return Math.abs(m[0][0] - 1) < epsilon && 
           Math.abs(m[1][1] - 1) < epsilon && 
           Math.abs(m[0][1]) < epsilon && 
           Math.abs(m[1][0]) < epsilon;
}

// 辅助函数：判断是否为反射变换
function isReflection(transform) {
    return transform.calculateDeterminant(transform.matrix) < 0;
}