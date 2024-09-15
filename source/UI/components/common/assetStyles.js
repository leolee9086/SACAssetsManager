import { px, per, em } from "../../../utils/css/unitedStrings.js"
import { display, textOverflow, overflow, position, whiteSpace } from "../../../utils/css/inherentValues.js"
import { cssVarProxy } from "../../../utils/css/cssVarGenerator.js"
import { chainable } from "../../../utils/object/chainable.js"
import { 表格视图阈值 } from "../../utils/threhold.js"
const 根据尺寸计算圆角 = (size, cardData) => {
    if (size > 表格视图阈值) {
        return cardData.width / 24
    } else {
        return 0
    }
}

const genMaxWidth = (size) => {
    return size > 表格视图阈值 ? px(size) : per(100)
}
export const 计算素材缩略图样式 = (size, imageHeight, cardData) => {
    let style = {}
    if (size > 表格视图阈值) {
        style.width = per(100)
    } else {
        style.width = px(size)
    }
    style.minWidth=style.width
    style.border = 'none'
    let borderRadius = px(根据尺寸计算圆角(size, cardData))
    style.borderRadius = `${borderRadius} ${borderRadius} 0 0`
    style.height = size > 表格视图阈值 ? imageHeight || px(size) : px(size)
    return style
}
export const 计算素材详情容器样式 = (size,cardData) => {
    console.log(size,cardData)
    let style = {}
    style.position = size > 表格视图阈值 ? position.absolute : position.relative
    style.bottom = 0
    style.whiteSpace = whiteSpace.nowrap
    style.overflow = overflow.hidden
    style.width = size > 表格视图阈值?per(100):''
    style.textOverflow = textOverflow.ellipsis
    style.height = size > 表格视图阈值 ? px(36) : px(size)
    style.display = size < 表格视图阈值 ? display.flex : display.block
    style.flex=1
    style.backgroundColor =!cardData.selected? cssVarProxy.b3.theme.background():cssVarProxy.b3.theme.secondary()
    return style
}
export const 计算素材颜色按钮样式 = (color) => {
    return chainable({})
        .backgroundColor(`rgb(${color[0]},${color[1]},${color[2]})`)
        .height(em(0.8))
        .width(em(0.8))
        .display(display.inlineBlock)
        .margin('0 2px')
        .$raw;
}


export const 计算文件格式标签样式 = (size, cardData) => {
    if (!cardData) return {};
    return chainable({})
        .position(size > 表格视图阈值 ? position.absolute : position.relative)
        .top(px(cardData.width / 24))
        .left(px(cardData.width / 24))
        .maxWidth(genMaxWidth(size))
        .maxHeight(em(1.5))
        .borderRadius(px(5))
        .backgroundColor(cssVarProxy.b3.theme.background())
        .whiteSpace(whiteSpace.nowrap)
        .overflow(overflow.hidden)
        .textOverflow(textOverflow.ellipsis)
        .height(px(36))
        .$raw;
}

export const 计算卡片内容主体样式 = (cardData, size, firstColorString, cardHeight) => {
    if (!cardData) return {};
    
    return chainable({})
        .width(per(表格视图阈值))
        .border('none')
        .borderRadius(px(cardData.width / 24))
        .height(size < 表格视图阈值 ? px(size) : px(cardHeight))
        .backgroundColor(firstColorString)
        .display(size < 表格视图阈值 ? display.flex : display.inlineBlock)
        .$raw;
}