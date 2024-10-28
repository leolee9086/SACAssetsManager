import {thumbnail} from '../../server/endPoints.js'
export const 提取缩略图路径中间件 = (布局控制器,数据组) => {
    数据组.forEach(item => {
        if(!item.thumbnailURL){
            item.thumbnailURL ={
                get:async()=>{
                    if(item.type){
                        return  thumbnail.genHref(item.type, item.path, 布局控制器.getCardSize(), item)
                    }else{
                        return "/plugins/SACAssetsManager/assets/wechatDonate.jpg"
                    }
                }
            }    
        }
    });
    return 数据组
}