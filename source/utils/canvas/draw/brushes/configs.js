
/**
 * 笔刷类型定义
 */
export const BRUSH_TYPES = {
    MARKER: 'marker',
    IMAGE: 'image',
    SHAPE: 'shape'
}

/**
 * 笔刷配置
 */
export const brushConfigs = {
    尖头马克笔: {
        type: BRUSH_TYPES.IMAGE,
        opacity: 1,
        spacing: 1,
        sizeMultiplier: 10,
        usePigment: true,
        name: 'marker',
        label: '尖头马克笔',
        defaultColor: '#e24a4a',
        defaultSize: 1,
        defaultOpacity: 0.6,
        brushSize: { width: 20, height: 20 },
        brushPath: '/plugins/SACAssetsManager/assets/brushes/marker.png'

    },
    宽头马克笔: {
        type: BRUSH_TYPES.IMAGE,
        opacity: 1 / 30,
        spacing: 5,
        sizeMultiplier: 15,
        name: 'wideMaker', 
        label: '荧光笔',
        defaultColor: '#f7d147',
        defaultSize: 1,
        defaultOpacity: 0.3,
        brushSize: { width: 30, height: 30 },
        brushPath: '/plugins/SACAssetsManager/assets/brushes/wide-marker.png'

    },
    水彩笔: {
        type: BRUSH_TYPES.IMAGE,
        opacity: 0.1,
        spacing: 0.08,
        sizeMultiplier: 20,
        pickupEnabled: true,  // 启用沾染
        pickupRadius: 20,     // 沾染影响半径
        pickupDecay: 0.95,    // 沾衰减率
        flowEnabled: true,
        usePigment: true,
        name: 'watercolor',
        label: '水彩笔',
        defaultColor: '#4a90e2',
        defaultSize: 1,
        defaultOpacity: 0.2,
        brushSize: { width: 40, height: 40 },
        brushPath: '/plugins/SACAssetsManager/assets/brushes/watercolor.png'

    },
    铅笔: {
        type: BRUSH_TYPES.IMAGE,
        opacity: 1,
        spacing: 2,
        sizeMultiplier: 5,
        name: 'pencil',
        label: '铅笔',
        defaultColor: '#2c3e50',
        defaultSize: 1,
        defaultOpacity: 0.8,
        brushSize: { width: 10, height: 10 },
        brushPath: '/plugins/SACAssetsManager/assets/brushes/pencil.png'

    },
    钢笔: {
        type: BRUSH_TYPES.SHAPE,
        opacity: 1,
        spacing: 0.1,
        shape: 'circle',
        sizeMultiplier: 1,
        name: 'pen',
        label: '钢笔',
        defaultColor: '#000000',
        defaultSize: 1,
        defaultOpacity: 1.0,
        brushSize: { width: 2, height: 2 }

    },
    鸭嘴笔: {
        type: BRUSH_TYPES.SHAPE,
        opacity: 1,
        spacing: 0.1,
        shape: 'rectangle',
        sizeMultiplier: 1,
        widthMultiplier: 4,
        heightMultiplier: 1,
        angle: 45,
        name: 'flatBrush',
        label: '鸭嘴笔',
        defaultColor: '#000000',
        defaultSize: 1,
        defaultOpacity: 1.0,
        brushSize: { width: 8, height: 8 }

    },
    毛笔: {
        type: BRUSH_TYPES.IMAGE,
        opacity: 0.7,
        spacing: 1,
        sizeMultiplier: 12,
        pressureSensitive: true,
        compositeOperation: 'source-over',
        inkFlow: 0.8,
        spreadFactor: 1.2
    },
    粉笔: {
        type: BRUSH_TYPES.IMAGE,
        opacity: 0.9,
        spacing: 3,
        sizeMultiplier: 8,
        compositeOperation: 'overlay',
        textureStrength: 0.8,
        roughness: 0.6
    },
    油画笔: {
        type: BRUSH_TYPES.IMAGE,
        opacity: 0.95,
        spacing: 4,
        sizeMultiplier: 25,
        compositeOperation: 'hard-light',
        paintThickness: 0.8,
        blendFactor: 0.6,
        bristleCount: 12
    },
    喷枪: {
        type: BRUSH_TYPES.IMAGE,
        opacity: 0.05,
        spacing: 1,
        sizeMultiplier: 30,
        compositeOperation: 'source-over',
        sprayRadius: 20,
        falloff: 0.7,
        density: 0.8
    },
    蜡笔: {
        type: BRUSH_TYPES.SHAPE,
        opacity: 0.9,
        spacing: 2,
        shape: 'rectangle',
        widthMultiplier: 3,
        heightMultiplier: 0.8,
        texturePattern: 'grainy',
        pressureVariation: 0.3,
        edgeRoughness: 0.4
    },
    针管笔: {
        type: BRUSH_TYPES.SHAPE,
        opacity: 1,
        spacing: 0.2,
        shape: 'circle',
        smoothing: 0.9,
        minWidth: 0.5,
        maxWidth: 2,
        inkFlow: 0.95
    }
}
