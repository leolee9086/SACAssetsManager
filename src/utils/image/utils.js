// 定义适应模式常量
const 适应模式类型 = {
    包含: 'contain',
    覆盖: 'cover',
    拉伸: 'stretch',
    自适应: 'auto'
};

// 定义计算方法查找表
const 计算方法表 = {
    [适应模式类型.包含]: (横向比例, 纵向比例) => {
        const 包含比例 = Math.min(横向比例, 纵向比例);
        return { scaleX: 包含比例, scaleY: 包含比例 };
    },
    
    [适应模式类型.覆盖]: (横向比例, 纵向比例) => {
        const 覆盖比例 = Math.max(横向比例, 纵向比例);
        return { scaleX: 覆盖比例, scaleY: 覆盖比例 };
    },
    
    [适应模式类型.拉伸]: (横向比例, 纵向比例) => {
        return { scaleX: 横向比例, scaleY: 纵向比例 };
    },
    
    [适应模式类型.自适应]: (横向比例, 纵向比例, 图片宽高比, 容器宽高比) => {
        const 比例差异 = Math.abs(图片宽高比 - 容器宽高比) / 容器宽高比;
        const 自适应比例 = 比例差异 < 0.2 
            ? Math.min(横向比例, 纵向比例)
            : Math.max(横向比例, 纵向比例);
        return { scaleX: 自适应比例, scaleY: 自适应比例 };
    }
};

/**
 * 计算图片在指定容器中的缩放比例
 * @param {number} imgWidth - 图片宽度
 * @param {number} imgHeight - 图片高度
 * @param {number} containerWidth - 容器宽度
 * @param {number} containerHeight - 容器高度
 * @param {'contain' | 'cover' | 'stretch' | 'auto'} fitMode - 适应模式
 * @returns {{scaleX: number, scaleY: number}} 横向和纵向的缩放比例
 * @throws {Error} 当参数无效时抛出错误
 */
function 计算图片适应比例(
    图片宽度,
    图片高度,
    容器宽度,
    容器高度,
    适应模式 = 适应模式类型.包含
) {
    // 参数验证
    if (!图片宽度 || !图片高度 || !容器宽度 || !容器高度) {
        throw new Error('所有尺寸参数都必须大于0');
    }

    const 计算方法 = 计算方法表[适应模式];
    if (!计算方法) {
        throw new Error(`不支持的适应模式: ${适应模式}`);
    }

    const 横向比例 = 容器宽度 / 图片宽度;
    const 纵向比例 = 容器高度 / 图片高度;
    const 图片宽高比 = 图片宽度 / 图片高度;
    const 容器宽高比 = 容器宽度 / 容器高度;

    return 计算方法(横向比例, 纵向比例, 图片宽高比, 容器宽高比);
}

// 集中导出所有内容
export {
    适应模式类型,
    计算图片适应比例,
    适应模式类型 as FitMode,
    计算图片适应比例 as calculateImageFitScale
}; 