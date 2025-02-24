export function 规范化P1图案配置(config){
    return {
        lattice: {
            basis1: config.lattice.basis1,
            basis2: config.lattice.basis2,
            shape: config.lattice?.shape || 'rectangle',
            clipMotif: config.lattice?.clipMotif ?? true
        },
        // 晶格点图片配置
        nodeImage: config.nodeImage ? {
            imageUrl: config.nodeImage.imageUrl,
            transform: config.nodeImage.transform || {
                scale: 1,
                rotation: 0,
                translate: { x: 0, y: 0 }
            },
            fitMode: config.nodeImage?.fitMode || 'contain'
        } : null,
        // 填充图片配置
        fillImage: config.fillImage ? {
            imageUrl: config.fillImage.imageUrl,
            transform: config.fillImage.transform || {
                scale: 1,
                rotation: 0,
                translate: { x: 0, y: 0 }
            },
            fitMode: config.fillImage?.fitMode || 'contain'
        } : null,
        render: {
            backgroundColor: config.render?.backgroundColor || '#ffffff',
            showGrid: config.render?.showGrid ?? false,
            gridStyle: {
                color: config.render?.gridStyle?.color || '#cccccc',
                width: config.render?.gridStyle?.width || 0.5,
                dash: config.render?.gridStyle?.dash || []
            },
            scale: config.render?.scale || 1,
            smoothing: config.render?.smoothing ?? true
        }
    };
}
export function 校验P1晶格基向量(config){
    if (!config.lattice?.basis1 || !config.lattice?.basis2) {
        throw new Error('必须提供有效的晶格基向量');
    }
}

export function 校验配置基向量是否等长(config){
    const { basis1, basis2 } = config.lattice;
    // 验证两个基向量长度必须相等
    const length1 = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);
    const length2 = Math.sqrt(basis2.x * basis2.x + basis2.y * basis2.y);
    if (Math.abs(length1 - length2) > 1e-6) {
        throw new Error('cm群的两个基向量长度必须相等');
    }
}

export function  规范化CM图案配置(config){
    const defaultMirrorLine = {
        x: config.lattice.basis1.x / 2,
        y: config.lattice.basis1.y / 2
    };
    return {
        ...config,
        symmetry: {
            mirrorLine: config.symmetry?.mirrorLine || defaultMirrorLine
        }
    };
}
