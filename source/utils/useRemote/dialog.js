const remote = require('@electron/remote')
const {dialog}= remote
if(!require){
    throw('此模块依赖remote')
}
export const 选择图片文件 =async ()=>{
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: '图像文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
        ]
    });
    return result
}



