import { 
    px,per,
    em
 } from "../../../utils/css/unitedStrings.js"
import { display, textOverflow,overflow} from "../../../utils/css/inherentValues.js"
const 根据尺寸计算圆角 = (size,cardData) => {
    if(size > 200){
        return cardData.width / 24 
    }else{
        return 0
    }
}
export const 计算素材缩略图样式 = (size,imageHeight,cardData) => {
    let style = {}
    if(size > 200){
        style.width = per(100)
    }else{
        style.width = px(size)
    }
    style.border = 'none'
    let borderRadius = px(根据尺寸计算圆角(size,cardData))
    style.borderRadius = `${borderRadius} ${borderRadius} 0 0`
    style.height = size > 200 ? imageHeight : px(size)
    return style
}
export const 计算素材详情容器样式 = (size,cardHeight) => {
    let style = {}
    style.position = size > 200 ? 'absolute' : 'relative'
    style.bottom = 0
    style.whiteSpace = 'nowrap'
    style.overflow = overflow.hidden
    style.width = '100%'
    style.textOverflow = textOverflow.ellipsis
    style.height = size > 200 ? px(36) : px(size)
    style.display = size < 200 ? 'flex' : 'block'
    style.backgroundColor = 'var(--b3-theme-background)'
    return style
}
export const 计算素材颜色按钮样式 = (color) => {
    let style = {}
    style.backgroundColor = `rgb(${color[0]},${color[1]},${color[2]})`
    style.height = em(0.8)//'0.8em'
    style.width = em(0.8)//'0.8em'
    style.display = display.inlineBlock
    style.margin = '0 2px'
    return style
}
