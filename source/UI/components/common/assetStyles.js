import { px, per, em } from "../../../../src/utils/css/unitedStrings.js"
import { display, textOverflow, overflow, position, whiteSpace } from "../../../../src/utils/css/inherentValues.js"
import { cssVarProxy } from "../../../../src/utils/css/cssVarGenerator.js"
import { chainable } from "../../../../src/utils/object/chainable.js"
import { 表格视图阈值 } from "../../utils/threhold.js"
import { 根据阈值计算最大宽度 } from "../../utils/threhold.js"
import { LAYOUT_COLUMN } from "../../utils/threhold.js"
const 根据尺寸计算圆角 = (size) => {
    if (size > 表格视图阈值) {
        return size / 24
    } else {
        return 0
    }
}

const genMaxWidth = (size) => {
    return size > 表格视图阈值 ? px(size) : per(100)
}
export const 计算素材缩略图样式 = (size, imageHeight) => {
    let style = {}
    if (size > 表格视图阈值) {
        style.width = per(100)
    } else {
        style.width = px(size)
    }
    style.minWidth = style.width
    style.border = 'none'
    let borderRadius = px(根据尺寸计算圆角(size))
    style.borderRadius = `${borderRadius} ${borderRadius} 0 0`
   // style.height = size > 表格视图阈值 ? imageHeight || px(size) : px(size)
   style.height='auto'
    return style
}
export const 计算素材详情容器样式 = (size, cardData) => {
    let style = {}
    //style.position = size > 表格视图阈值 ? position.absolute : position.relative
    style.bottom = 0
    style.whiteSpace = whiteSpace.nowrap
    style.overflow = overflow.hidden
    style.width = size > 表格视图阈值 ? per(100) : ''
    style.textOverflow = textOverflow.ellipsis
    style.height = size > 表格视图阈值 ? px(36) : px(size)
    style.display = size < 表格视图阈值 ? display.flex : display.block
    style.flex = 1
    style.backgroundColor = !cardData.selected ? "transparent" : cssVarProxy.b3.theme.primary()
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
export const 计算扩展名标签样式 = (displayMode, cardData, size) => {
    return `
    position:${displayMode === LAYOUT_COLUMN ? 'absolute' : 'relative'};
    top: ${cardData.width / 24}px;
    left: ${cardData.width / 24}px;
    max-width: ${根据阈值计算最大宽度(size)};
    max-height: 1.5em;
    border-radius: 5px;
background-color:var(--b3-theme-background);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;height:36px;
        flex:1;
        `
}

/**
 * 用于计算属性相关的一些数值
 */
