import { extractFileExtensions } from "../../../../../src/utils/fs/extension.js";
const 扩展名map = new Map();

export const 更新扩展名中间件 = (获取配置, 获取扩展名缓存) => {
    return (数据) => {
        if (!获取配置().localPath) {
            let extensions = extractFileExtensions(数据)
            extensions.forEach(
                item => {
                    if (!扩展名map.get(item)) {
                        获取扩展名缓存().push(item)
                        扩展名map.set(item, true)
                    }
                }
            )
        }
        return 数据;
    }
};


export const 过滤器中间件 = (filterFunc) => {
    return (args) => {
        let result = args.filter(arg => filterFunc(arg));
        return result
    };
}


