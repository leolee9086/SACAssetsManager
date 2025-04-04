import { createMathJSNodes } from '../nodes/wraper/tsWrapper.js';
import { 默认组件式节点注册表, 默认函数式节点加载配置 } from './defaultMap.js';
import { writeFile } from '../../../../../polyfills/fs.js';

/**
 * 加载 mathjs 函数节点
 * @returns {Promise<{success: Array, failed: Array}>}
 */
export async function loadMathJSNodes() {
    const results = {
        success: [],
        failed: []
    };

    try {
        const nodes = await createMathJSNodes();
        
        // 将每个 mathjs 节点添加到组件注册表
        for (const [name, node] of Object.entries(nodes)) {
            try {
                // 使用默认配置构建路径
                const config = 默认函数式节点加载配置;
                const moduleDir = config.moduleName ? `/${config.moduleName}` : '';
                const compiledPath = `${config.outputDir}${moduleDir}/mathjs_${name}.vue`;
                const sfcUrl = `${config.publicPath}${moduleDir}/mathjs_${name}.vue`;
                const componentKey = `mathjs/${name}`;

                // 写入组件文件
                await writeFile(compiledPath, node.sfcString);
                
                // 将 URL 添加到组件注册表
                默认组件式节点注册表[componentKey] = sfcUrl;
                
                results.success.push({
                    name,
                    path: sfcUrl
                });
                
                console.log(`✅ MathJS节点加载成功: ${componentKey} -> ${sfcUrl}`);
            } catch (err) {
                results.failed.push({
                    name,
                    error: err.message
                });
                console.error(`❌ 加载MathJS节点 ${name} 失败:`, err);
            }
        }
    } catch (err) {
        console.error('❌ 加载MathJS节点失败:', err);
        results.failed.push({
            module: 'mathjs',
            error: err.message
        });
    }

    // 输出加载统计
    console.log(`📊 MathJS节点加载统计:
    成功: ${results.success.length}
    失败: ${results.failed.length}`);
    
    return results;
}
