import {kMeansPP} from "./Kmeans.js"
import {CIEDE2000} from "./colorArrayDistance.js"
export function 获取颜色(buffer){
    // 创建一个离线canvas
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const imgData = ctx.createImageData(canvas.width, canvas.height)
    imgData.data.set(buffer)
    const data = imgData.data
    const k = 10
    const clusters = kMeansPP(data, k, CIEDE2000,1,true);
    return clusters
}