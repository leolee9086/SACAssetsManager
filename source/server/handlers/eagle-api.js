function 导入Eagle素材库标签列表(ctx){
    const 素材库路径 = ctx.req.query.path;
    const 标签列表 = 获取ealge素材库标签列表(素材库路径);
    return 标签列表;
}
export function 获取ealge素材库路径(ctx){
    const 路径 = ctx.req.query.path
    //找到path中以.library结尾的文件夹
    const patterns =路径.replace(/\\/g, "/").split("/")
    const 素材库路径下标 = patterns.findIndex(item => item.endsWith(".library"));
    const 素材库路径 = patterns.slice(0, 素材库路径下标 + 1).join("/");
    ctx.res.json({
        finded:素材库路径
    })
}
export function 获取ealge素材库标签列表(ctx){
    const 素材库路径 = ctx.req.query.path;
    const 路径 = 素材库路径 + "\\tags.json";
    const tagJson = require("fs").readFileSync(路径, "utf8");
    const tagJsonObj = JSON.parse(tagJson);
    ctx.res.json({
        tags:tagJsonObj
    })
}