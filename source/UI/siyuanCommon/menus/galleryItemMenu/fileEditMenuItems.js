import { clientApi } from "../../../../asyncModules"

export const 压缩图片为png菜单项=(assets)=>{
    return {
        label:`生成${assets.length}个文件的png压缩`,
        click:()=>{
            clientApi.confirm(
                '选择压缩率并确认',
                "压缩文件以<原文件名>_<压缩率>.png的形式保存在原文件同目录"
            )
        }
    }
}