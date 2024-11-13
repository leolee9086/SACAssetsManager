import { 全局节点注册表标记,默认组件式节点注册表,默认函数式节点加载配置, 默认函数式节点加载表 } from "./loader/defaultMap.js";
import { parseNodeDefine } from "./containers/nodeDefineParser.js";
import { parseJSDocConfigFromURL } from "../../../utils/codeLoaders/js/jsDoc.js";
import { jsDoc2NodeDefine, wrapSFCStringFromNodeDefine } from "./nodes/wraper/jsWraper.js";
import { writeFile } from "../../../polyfills/fs.js";

/**
 * 解析组件定义并生成SFC字符串
 * @param {string} modulePath - 模块路径
 * @param {string} exportName - 导出名称
 * @returns {Promise<{nodeDefine: Object, sfcString: string}>}
 */
const parseComponentDefinitionFromModuleExport = async (modulePath, exportName) => {
    const result = await parseJSDocConfigFromURL(modulePath, exportName);
    const module = await import(modulePath);
    const nodeDefine = jsDoc2NodeDefine(result, module, exportName, modulePath);
    const { sfcString } = wrapSFCStringFromNodeDefine(nodeDefine, modulePath, exportName);
    return { nodeDefine, sfcString };
};

/**
 * 构建组件路径和URL
 * @param {Object} config - 配置对象
 * @param {string} exportName - 导出名称
 * @returns {{compiledPath: string, sfcUrl: string, componentKey: string}}
 */
const buildComponentPaths = (config, exportName) => {
    const { outputDir, publicPath, componentPrefix, moduleName } = config;
    const moduleDir = moduleName ? `/${moduleName}` : '';
    const compiledPath = `${outputDir}${moduleDir}/${exportName}.vue`;
    const sfcUrl = `${publicPath}${moduleDir}/${exportName}.vue`;
    const componentKey = moduleName 
        ? `${componentPrefix}/${moduleName}/${exportName}`
        : `${componentPrefix}/${exportName}`;
    return { compiledPath, sfcUrl, componentKey };
};

/**
 * 处理单个组件的加载
 * @param {string} exportName - 导出名称
 * @param {string} modulePath - 模块路径
 * @param {Object} config - 配置对象
 * @returns {Promise<{name: string, path: string}>}
 */
const processComponent = async (exportName, modulePath, config) => {
    const { sfcString } = await parseComponentDefinitionFromModuleExport(modulePath, exportName);
    const { compiledPath, sfcUrl, componentKey } = buildComponentPaths(config, exportName);
    await writeFile(compiledPath, sfcString);
    默认组件式节点注册表[componentKey] = sfcUrl;
    console.log(`✅ 组件加载成功: ${componentKey} -> ${sfcUrl}`);
    return { name: exportName, path: sfcUrl };
};

/**
 * 加载单个模块的所有导出组件
 * @param {Object} moduleObj - 模块对象
 * @param {string} modulePath - 模块路径
 * @param {Object} config - 配置选项
 * @param {Array<string>} [config.include] - 仅加载指定的导出函数名列表
 * @param {Array<string>} [config.exclude] - 排除指定的导出函数名列表
 * @returns {Promise<{success: Array, failed: Array}>}
 */
const 解析模块中所有导出函数 = async (moduleObj, modulePath, config = {}) => {
    const finalConfig = { ...默认函数式节点加载配置, ...config };
    const results = { success: [], failed: [] };
    
    // 获取需要处理的导出函数名列表
    let exportNames = Object.keys(moduleObj);
    
    // 如果指定了 include，则只处理 include 中的函数
    if (finalConfig.include?.length) {
        exportNames = exportNames.filter(name => finalConfig.include.includes(name));
    }
    
    // 如果指定了 exclude，则排除这些函数
    if (finalConfig.exclude?.length) {
        exportNames = exportNames.filter(name => !finalConfig.exclude.includes(name));
    }
    
    for (const exportName of exportNames) {
        try {
            const result = await processComponent(exportName, modulePath, finalConfig);
            results.success.push(result);
        } catch (err) {
            results.failed.push({
                name: exportName,
                error: err.message
            });
            console.error(`❌ 加载组件 ${exportName} 失败:`, err);
        }
    }
    return results;
};

/**
 * 批量加载多个模块的组件
 * @param {Array<{module: Object, path: string, config?: Object}>} moduleConfigs - 模块配置数组
 */
const 从js模块加载函数式节点 = async (moduleConfigs) => {
    const results = {
        success: [],
        failed: []
    };

    for (const { module, path, config } of moduleConfigs) {
        try {
            const moduleResults = await 解析模块中所有导出函数(module, path, config);
            results.success.push(...moduleResults.success);
            results.failed.push(...moduleResults.failed);
        } catch (err) {
            console.error(`❌ 加载模块 ${path} 失败:`, err);
            results.failed.push({
                module: path,
                error: err.message
            });
        }
    }

    // 输出加载统计
    console.log(`📊 组件加载统计:
    成功: ${results.success.length}
    失败: ${results.failed.length}`);
    
    return results;
};

// 使用示例
await 从js模块加载函数式节点(默认函数式节点加载表);

// 导出getter函数
export const getComponentMap = () => globalThis[全局节点注册表标记];

// 为了保持向后兼容，也可以直接导出componentMap对象
export const componentMap = getComponentMap();

export const parseComponentDefinition = async (cardType, cardInfo) => {

    try{
    const componentURL = componentMap[cardType];
    return await parseNodeDefine(componentURL, cardInfo);
    }catch(e){
        console.error(e)
    }
};



export {loadJson} from './loader/mapLoaders/jsonLoader.js'