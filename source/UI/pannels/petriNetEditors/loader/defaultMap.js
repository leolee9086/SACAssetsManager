import * as 向量 from '../geometry/geometryCalculate/vector.js'
import * as LUT处理器 from '../../../../../src/utils/Lut/lutProcessor.js'

// 定义全局Symbol
export const 全局节点注册表标记 = Symbol.for('SACComponentMap');

// 初始化默认组件映射
export const 默认组件式节点注册表 = {
    'math/number': "/plugins/SACAssetsManager/source/UI/pannels/petriNetEditors/nodes/math/number.vue",
    'note/protyle': "/plugins/SACAssetsManager/source/UI/components/common/assetCard/protyleCell.vue",
    'image/brightness': "/plugins/SACAssetsManager/source/UI/pannels/petriNetEditors/nodes/image/brightness.vue",
    localImageInput: '/plugins/SACAssetsManager/source/UI/pannels/petriNetEditors/localImageInput.vue',
    ImageCompressor: '/plugins/SACAssetsManager/source/UI/pannels/petriNetEditors/ImageCompressor.vue',
    ImageComparison: '/plugins/SACAssetsManager/src/shared/components/withNodeDefine/ImageComparison.vue',
};

// 获取或创建全局componentMap
if (!globalThis[全局节点注册表标记]) {
    globalThis[全局节点注册表标记] = 默认组件式节点注册表;
}

// 定义加载器配置接口
export const 默认函数式节点加载配置 = {
    outputDir: '/data/public/SACCompiled',
    publicPath: '/public/SACCompiled',
    componentPrefix: 'default',
    moduleName: ''
};
export const 默认函数式节点加载表 = [
    {
        module: 向量,
        path: '/plugins/SACAssetsManager/source/UI/pannels/petriNetEditors/geometry/geometryCalculate/vector.js',
        config: {
            componentPrefix: 'geometry',
            moduleName: '向量'
        }
    },
    {
        module: LUT处理器,
        path: '/plugins/SACAssetsManager/src/utils/Lut/lutProcessor.js',
        config: {
            componentPrefix: 'image',
            moduleName: 'LUT',
            // 只导出主要的处理函数，忽略内部辅助函数
            include: [
                'processImageWithLUT',
                'processImageWithLUTFile',
                'processFiles',
                'cleanupFiles',
                'cleanupPreview'
            ]
        }
    }
]
