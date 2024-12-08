import { fromFilePath } from "../../../../../utils/fromDeps/sharpInterface/useSharp/toSharp.js"
import { requirePluginDeps } from "../../../../../utils/module/requireDeps.js"
const sharp = requirePluginDeps('sharp')

export const 对buffer应用效果堆栈 =async (buffer,效果堆栈管线函数)=>{
    const sharpObj = await sharp(buffer)
    const 处理后sharp对象 = await 效果堆栈管线函数(sharpObj)
    return 处理后sharp对象
}

export const 对图像路径应用效果堆栈 =async(图像路径,效果堆栈管线函数)=>{
    const 原始sharp对象 = await fromFilePath(图像路径)
    return await 效果堆栈管线函数(原始sharp对象)
}
