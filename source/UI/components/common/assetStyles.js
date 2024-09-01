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
        style.width = '100%'
    }else{
        style.width = size + 'px'
    }
    style.border = 'none'
    let borderRadius = 根据尺寸计算圆角(size,cardData) + 'px'
    style.borderRadius = `${borderRadius} ${borderRadius} 0 0`
    style.height = size > 200 ? imageHeight : size + 'px'
    return style
}
