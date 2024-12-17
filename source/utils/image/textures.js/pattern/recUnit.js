/**
 * 判断是否存在矩形重复单元
 * @param {Object} basis1 第一基向量 {x, y}
 * @param {Object} basis2 第二基向量 {x, y}
 * @param {String} wallpaperGroup 壁纸群类型
 * @returns {boolean} 是否存在矩形重复单元
 */
export function hasRectangularUnit(basis1, basis2, wallpaperGroup) {
    switch (wallpaperGroup.toLowerCase()) {
        // 必然存在矩形重复单元的群
        case 'pmm':
        case 'pmg':
        case 'pgg':
        case 'cmm':
        case 'p4':
        case 'p4m':
        case 'p4g':
        case 'p6m':
            return true;

        // 永远不存在矩形重复单元的群
        case 'p3':
        case 'p3m1':
        case 'p31m':
        case 'p6':
            return false;

        // 需要检查基向量是否正交的群
        case 'p1':
        case 'p2':
        case 'pm':
        case 'pg':
        case 'cm':
            const dotProduct = basis1.x * basis2.x + basis1.y * basis2.y;
            return Math.abs(dotProduct) < 1e-6;

        default:
            return false;
    }
}

/**
 * 计算最小矩形重复单元的尺寸和变换
 * @param {Object} basis1 第一基向量 {x, y}
 * @param {Object} basis2 第二基向量 {x, y}
 * @param {String} wallpaperGroup 壁纸群类型
 * @returns {Object|null} 矩形单元信息或null（不存在时）
 */
export function getRectangularUnit(basis1, basis2, wallpaperGroup) {
    if (!hasRectangularUnit(basis1, basis2, wallpaperGroup)) {
        return null;
    }

    // 对于六角群，需要先进行基向量旋转
    if (['p3', 'p3m1', 'p31m', 'p6', 'p6m'].includes(wallpaperGroup.toLowerCase())) {
        const rotatedBasis1 = {
            x: -basis1.y,
            y: basis1.x
        };
        const rotatedBasis2 = {
            x: -basis2.y,
            y: basis2.x
        };
        basis1 = rotatedBasis1;
        basis2 = rotatedBasis2;
    }

    const len1 = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);
    const len2 = Math.sqrt(basis2.x * basis2.x + basis2.y * basis2.y);
    const rotation = Math.atan2(basis1.y, basis1.x);

    switch (wallpaperGroup.toLowerCase()) {
        case 'p3':
        case 'p3m1':
        case 'p31m':
            const triSize = len1;
            return {
                width: triSize * Math.sqrt(3),
                height: triSize * 2,
                transform: {
                    rotation: rotation,
                    origin: { x: 0, y: 0 }
                }
            };

        case 'p6':
        case 'p6m':
            const hexSize = len1;
            return {
                width: len1,
                height: hexSize * Math.sqrt(3),
                transform: {
                    rotation: rotation,
                    origin: { x: -len1/2, y: -hexSize * Math.sqrt(3)/2 }
                }
            };

        case 'p4':
        case 'p4g':
        case 'p4m':
            const size = Math.max(len1, len2);
            return {
                width: size,
                height: size,
                transform: {
                    rotation: rotation,
                    origin: { x: 0, y: 0 }
                }
            };

        case 'cmm':
        case 'p1':
            return {
                width: Math.min(len1, len2),  // 宽度取较小值
                height: Math.max(len1, len2),  // 高度是较大值的2倍
                transform: {
                    rotation: rotation,
                    origin: { x: 0, y: 0 }
                }
            };
        case 'p2':
        case 'pg':
        case 'pm':

            return {
                width: Math.min(len1, len2) * 2,  // 宽度取较小值
                height: Math.max(len1, len2),  // 高度是较大值的2倍
                transform: {
                    rotation: rotation,
                    origin: { x: 0, y: 0 }
                }
            };
        case 'pmm':
        case 'pmg':
        case 'pgg':
            return {
                width: Math.min(len1, len2) * 2,  // 宽度取较小值
                height: Math.max(len1, len2) * 2,  // 高度是较大值的2倍
                transform: {
                    rotation: rotation,
                    origin: { x: 0, y: 0 }
                }
            }
        case 'cm':
            const angle = Math.acos(
                (basis1.x * basis2.x + basis1.y * basis2.y) / (len1 * len2)
            );

            if (Math.abs(angle - Math.PI / 2) < 1e-6) {
                return {
                    width: len1,
                    height: len2,
                    transform: {
                        rotation: rotation,
                        origin: { x: 0, y: 0 }
                    }
                };
            } else {
                return {
                    width: Math.abs(basis1.x) + Math.abs(basis2.x),
                    height: Math.abs(basis1.y) + Math.abs(basis2.y),
                    transform: {
                        rotation: 0,
                        origin: { x: 0, y: 0 }
                    }
                };
            }

        default:
            return null;
    }
}