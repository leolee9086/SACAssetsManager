import { computed, ref } from "../../../../../../static/vue.esm-browser.js"
import { fromFilePath } from "../../../../../../src/utils/fromDeps/sharpInterface/useSharp/toSharp.js"
import { genRatioWh } from "../../../../../../src/utils/math/geometry/geom2d.js"
export const originalImageInfo = ref({

})
export const 从文件路径更新原始图状态 = async(图片文件路径)=>{
    const sharpObj =fromFilePath(图片文件路径)
    await 从sharp对象更新原始图状态(sharpObj)
}
export const 从sharp对象更新原始图状态 = async(sharpObj)=>{
    const metadata = await sharpObj.metadata();
    originalImageInfo.value= {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format
    }
}
export const 原始图是否超大图片 = computed(
    ()=>{
        return originalImageInfo.value.width > 4096 ||
        originalImageInfo.value.height > 4096;
    }
)
export const 原始图比例 = computed(
    ()=>{
        const imageInfo = originalImageInfo.value
        const ratio = genRatioWh(imageInfo)
        return ratio
    }
)
