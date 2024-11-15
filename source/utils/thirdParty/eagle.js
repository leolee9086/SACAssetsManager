if(!window.require){
    throw new Error('这个模块依赖node环境,不能在前端调用')
}
const path = require('path')
export const 搜集eagle元数据 = async (assets) => {
    const results = [];
    for (const asset of assets) {
        const assetDir = path.dirname(asset.path);
        const metadataPath = path.join(assetDir, 'metadata.json').replace(/\\/g, '/')
        try {
            // 检查 metadata.json 文件是否存在
            if (window.require('fs').existsSync(metadataPath)) {
                results.push({
                    path: asset.path,
                    metaPath: metadataPath
                });
            }

        } catch (error) {
            console.log(`未找到 ${asset.path} 的元数据文件`);
        }
    }
    return results;
}
export const 查找文件所在素材库路径 = (路径)=>{
    const 路径项数组 =路径.replace(/\\/g, "/").split("/")
    const 素材库路径下标 = 路径项数组.findIndex(item => item.endsWith(".library"));
    const 素材库路径 = 路径项数组.slice(0, 素材库路径下标 + 1).join("/");
    return 素材库路径
}
export const 从文件系统获取eagle素材库标签列表 =(素材库路径)=>{
    const 路径 = 素材库路径 + "\\tags.json";
    const tagJson = require("fs").readFileSync(路径, "utf8");
    const tagJsonObj = JSON.parse(tagJson);

}