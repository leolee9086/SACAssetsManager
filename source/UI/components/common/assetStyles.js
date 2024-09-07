import { px, per, em } from "../../../utils/css/unitedStrings.js"
import { display, textOverflow, overflow, position, whiteSpace } from "../../../utils/css/inherentValues.js"
import { cssVarProxy } from "../../../utils/css/cssVarGenerator.js"
const 根据尺寸计算圆角 = (size, cardData) => {
    if (size > 200) {
        return cardData.width / 24
    } else {
        return 0
    }
}
export const 计算素材缩略图样式 = (size, imageHeight, cardData) => {
    let style = {}
    if (size > 200) {
        style.width = per(100)
    } else {
        style.width = px(size)
    }
    style.border = 'none'
    let borderRadius = px(根据尺寸计算圆角(size, cardData))
    style.borderRadius = `${borderRadius} ${borderRadius} 0 0`
    style.height = size > 200 ? imageHeight||px(size) : px(size)
    return style
}
export const 计算素材详情容器样式 = (size, cardHeight) => {
    let style = {}
    style.position = size > 200 ? position.absolute : position.relative
    style.bottom = 0
    style.whiteSpace = whiteSpace.nowrap
    style.overflow = overflow.hidden
    style.width = per(100)
    style.textOverflow = textOverflow.ellipsis
    style.height = size > 200 ? px(36) : px(size)
    style.display = size < 200 ? display.flex : display.block
    style.backgroundColor = cssVarProxy.b3.theme.background()
    return style
}
export const 计算素材颜色按钮样式 = (color) => {
    let style = {}
    style.backgroundColor = `rgb(${color[0]},${color[1]},${color[2]})`
    style.height = em(0.8)
    style.width = em(0.8)
    style.display = display.inlineBlock
    style.margin = '0 2px'
    return style
}


const genMaxWidth = (size) => {
    return size > 200 ? px(size) : per(100)
}
export const 计算文件格式标签样式 = (size, cardData) => {
    let style = {}
    if (cardData) {
        style.position = size > 200 ? position.absolute : position.relative
        style.top = px(cardData.width / 24)
        style.left = px(cardData.width / 24)
        style.maxWidth = genMaxWidth(size)
        style.maxHeight = em(1.5)
        style.borderRadius = px(5)
        style.backgroundColor = cssVarProxy.b3.theme.background()
        style.whiteSpace = whiteSpace.nowrap
        style.overflow = overflow.hidden
        style.textOverflow = textOverflow.ellipsis
        style.height = px(36)
    }
    console.log(style)
    return style
}
