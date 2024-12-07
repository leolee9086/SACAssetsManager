export const 构建编辑器模式切换器 = (编辑器状态对象,模式名)=>{
    return ()=>{
        编辑器状态对象.value.activeMode = 模式名
    }
}



export const 构建视图模式切换器 = (视图状态对象,模式名)=>{
    return ()=>{
        视图状态对象.value.mode = 模式名
    }
}