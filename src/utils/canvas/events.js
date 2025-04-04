/**
 * 
 * @param {*} e 
 * @param {*} canvas 
 * @returns 
 */
export const 获取事件canvas坐标 = (e,canvas)=>{
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    }
}


