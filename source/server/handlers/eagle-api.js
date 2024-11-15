import { 从文件系统获取eagle素材库标签列表, 查找文件所在素材库路径 } from "../../utils/thirdParty/eagle.js";

export function 获取ealge素材库路径(ctx){
    ctx.res.json({
        finded:查找文件所在素材库路径(ctx.req?.query?.path)
    })
}
export function 获取ealge素材库标签列表(ctx){
    ctx.res.json({
        tags:从文件系统获取eagle素材库标签列表(ctx.req.query.path)
    })
}