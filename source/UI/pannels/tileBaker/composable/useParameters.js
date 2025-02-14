import { ref } from "../../../../../static/vue.esm-browser.js"
export const parameterGroupTypes = {
    'original': ['基础设置'],
    'processed': [
        '基础设置',
        '砖缝基础',
        '深度调整',
        '砖缝细节',
        '边缘开裂',
        '角点损坏'
    ],
    'normal': [
        '基础设置',
        '法线图设置',
        '法线预处理'
    ]
}
export const parameterGroups = ref([
    {
        title: '基础设置',
        expanded: true,
        params: [
            { key: 'tileSizeX', label: '砖块尺寸 X', type: 'range', min: 0.5, max: 5, step: 0.1 },
            { key: 'tileSizeY', label: '砖块尺寸 Y', type: 'range', min: 0.5, max: 5, step: 0.1 },
            { key: 'rotation', label: '旋转角度', type: 'range', min: 0, max: 360, step: 1, unit: '°' },
            { key: 'randomOffset', label: '随机偏移', type: 'range', min: 0, max: 0.5, step: 0.01 }
        ]
    },
    {
        title: '砖缝基础',
        expanded: false,
        params: [
            { key: 'seamWidth', label: '砖缝宽度', type: 'range', min: 0.01, max: 1.0, step: 0.01 },
            { key: 'seamVariation', label: '砖缝变化', type: 'range', min: 0, max: 1, step: 0.01 },
            {
                key: 'seamProfile', label: '砖缝轮廓', type: 'select',
                options: [
                    { value: '1', label: '线性' },
                    { value: '2', label: '平方' },
                    { value: '3', label: '平方根' }
                ]
            },
            { key: 'seamNoiseFrequency', label: '噪声频率', type: 'range', min: 0.1, max: 10, step: 0.1 }
        ]
    },
    {
        title: '深度调整',
        expanded: false,
        params: [
            { key: 'contrast', label: '对比度', type: 'range', min: 0.1, max: 2.0, step: 0.1 },
            { key: 'edgeSharpness', label: '边缘锐度', type: 'range', min: 0.1, max: 2.0, step: 0.1 },
            { key: 'heightRangeMin', label: '最小深度', type: 'range', min: 0, max: 1, step: 0.01 },
            { key: 'heightRangeMax', label: '最大深度', type: 'range', min: 0, max: 1, step: 0.01 }
        ]
    },
    {
        title: '砖缝细节',
        expanded: false,
        params: [
            { key: 'mortarVariation', label: '砂浆变化', type: 'range', min: 0, max: 1, step: 0.01 },
            { key: 'mortarFrequency', label: '砂浆频率', type: 'range', min: 0.1, max: 20, step: 0.1 },
            { key: 'wearAmount', label: '磨损程度', type: 'range', min: 0, max: 1, step: 0.01 },
            { key: 'wearDetail', label: '磨损细节', type: 'range', min: 1, max: 50, step: 1 }
        ]
    },
    {
        title: '边缘开裂',
        expanded: false,
        params: [
            { key: 'crackWidth', label: '开裂宽度', type: 'range', min: 0, max: 0.2, step: 0.01 },
            { key: 'crackDepth', label: '开裂深度', type: 'range', min: 0, max: 1, step: 0.01 },
            { key: 'crackRandomness', label: '开裂随机度', type: 'range', min: 0, max: 1, step: 0.01 },
            { key: 'crackFrequency', label: '开裂频率', type: 'range', min: 0.1, max: 10, step: 0.1 }
        ]
    },
    {
        title: '角点损坏',
        expanded: false,
        params: [
            { key: 'cornerDamage', label: '损坏程度', type: 'range', min: 0, max: 1, step: 0.01 },
            { key: 'cornerNoiseScale', label: '噪声尺度', type: 'range', min: 0.1, max: 10, step: 0.1 },
            { key: 'cornerFalloff', label: '衰减程度', type: 'range', min: 0, max: 1, step: 0.01 }
        ]
    },
    {
        title: '法线图设置',
        expanded: false,
        params: [
            {
                key: 'normalStrength',
                label: '强度',
                type: 'range',
                defaultValue: 1.0,
                min: 0.1,
                max: 5,
                step: 0.1
            },
            {
                key: 'normalBlur',
                label: '预模糊',
                type: 'range',
                defaultValue: 0,
                min: 0,
                max: 5,
                step: 0.1
            },
            {
                key: 'seamNormalStrength',
                label: '砖缝强度',
                type: 'range',
                defaultValue: 1.0,
                min: 0.1,
                max: 3.0,
                step: 0.1
            },
            {
                key: 'normalFlipX',
                label: 'X轴反转',
                type: 'checkbox',
                defaultValue: false
            },
            {
                key: 'normalFlipY',
                label: 'Y轴反转',
                type: 'checkbox',
                defaultValue: false
            },
            {
                key: 'normalScale',
                label: '法线缩放',
                type: 'range',
                defaultValue: 1.0,
                min: 0.1,
                max: 2.0,
                step: 0.1
            },
            {
                key: 'normalBias',
                label: '法线偏移',
                type: 'range',
                defaultValue: 0.5,
                min: 0,
                max: 1,
                step: 0.1
            }
        ]
    },
    {
        title: '法线预处理',
        expanded: false,
        params: [
            {
                key: 'normalPreprocessInvert',
                label: '反转高度',
                type: 'checkbox',
                defaultValue: false
            },
            {
                key: 'normalPreprocessContrast',
                label: '对比度',
                type: 'range',
                defaultValue: 0,
                min: -1,
                max: 1,
                step: 0.1
            },
            {
                key: 'normalPreprocessBrightness',
                label: '亮度',
                type: 'range',
                defaultValue: 0,
                min: -1,
                max: 1,
                step: 0.1
            },
            {
                key: 'normalPreprocessSmooth',
                label: '平滑',
                type: 'range',
                defaultValue: 0,
                min: 0,
                max: 2,
                step: 0.1
            }
        ]
    }
])
//参数对象
export const  params = ref({
  tileSizeX: 2,
  tileSizeY: 2,
  rotation: 0,
  randomOffset: 0.1,
  seamWidth: 0.1,
  seamVariation: 0.3,
  seamProfile: 1,
  seamNoiseFrequency: 2.0,
  contrast: 1.0,
  edgeSharpness: 1.0,
  heightRangeMin: 0.2,
  heightRangeMax: 0.8,
  wearAmount: 0.3,
  wearDetail: 20,
  mortarVariation: 0.4,
  mortarFrequency: 8.0,
  // 边缘开裂参数
  crackWidth: 0.05,        // 开裂宽度
  crackDepth: 0.3,         // 开裂深度
  crackRandomness: 0.5,    // 开裂随机程度
  crackFrequency: 3.0,     // 开裂频率
  // 角点开裂参数
  cornerDamage: 0.3,       // 角点损坏程度
  cornerNoiseScale: 5.0,   // 角点噪声尺度
  cornerFalloff: 0.5,      // 角点衰减
  // 法线图参数
  normalStrength: 1.0,
  normalBlur: 0,
  seamNormalStrength: 1.0,
  normalFlipX: false,
  normalFlipY: false,
  normalScale: 1.0,
  normalBias: 0.5,
  // 法线预处理参数
  normalPreprocessInvert: false,
  normalPreprocessContrast: 0,
  normalPreprocessBrightness: 0,
  normalPreprocessSmooth: 0
})

