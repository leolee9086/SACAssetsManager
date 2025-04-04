export const  loadImageFromUrl=(src)=>{
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
            resolve(img)
        }
        img.onerror = (error) => {
            reject(new Error(`Failed to load image: ${src}`))
        }
        img.crossOrigin = 'anonymous'
        img.src = src
    })
}


export const batchLoadImageFromUrl =(sources)=>{
    const promises = sources.map(src => loadImage(src))
    return Promise.all(promises)
}