
export const 获取图片尺寸 = (图片路径)=>{
    return new Promise((resolve,reject)=>{
        const image = new Image()
        image.onload = ()=>{
            resolve({
                width:image.width,
                height:image.height
            })
        }
        image.onerror = ()=>{
            reject(new Error("图片加载失败"))
        }
        image.src = 图片路径
    })
}