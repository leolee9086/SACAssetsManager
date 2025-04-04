export const 以位移向量变换矩形对象=(矩形对象,位移向量)=>{
    return {
        x:矩形对象.x+位移向量.x,
        y:矩形对象.y+位移向量.y,
        width:矩形对象.width,
        height:矩形对象.height
    }
}