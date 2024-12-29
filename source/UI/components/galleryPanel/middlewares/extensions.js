import { extractFileExtensions } from "../../../../utils/fs/extension.js";
const 扩展名map = new Map();

export const updateExtensionsMiddleware = (获取配置, 获取扩展名缓存) => {
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