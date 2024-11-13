import * as 向量 from '/plugins/SACAssetsManager/source/UI/components/editors/geometry/geometryCalculate/vector.js'
// 定义全局Symbol
export const 全局节点注册表标记 = Symbol.for('SACComponentMap');

// 初始化默认组件映射
export const 默认组件式节点注册表 = {
    'math/number': "/plugins/SACAssetsManager/source/UI/components/editors/nodes/math/number.vue",
    'note/protyle': "/plugins/SACAssetsManager/source/UI/components/common/assetCard/protyleCell.vue",
    'image/brightness': "/plugins/SACAssetsManager/source/UI/components/editors/nodes/image/brightness.vue",
    localImageInput: '/plugins/SACAssetsManager/source/UI/components/editors/localImageInput.vue',
    ImageCompressor: '/plugins/SACAssetsManager/source/UI/components/editors/ImageCompressor.vue',
    ImageComparison: '/plugins/SACAssetsManager/source/UI/components/editors/ImageComparison.vue',
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
export const 默认函数式节点加载表 =[
        {
            module: 向量,
            path: '/plugins/SACAssetsManager/source/UI/components/editors/geometry/geometryCalculate/vector.js',
            config: {
                componentPrefix: 'geometry',
                moduleName:'向量'
            }
        }
        // 可以添加更多模块配置
    ]
