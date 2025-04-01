import { 通过JS地址创建Webview, 向Webview暴露函数 } from "../../../../src/toolBox/base/useElectron/forWindow/useWebview.js"

export async function exposeFunctionToWebview(functionImpl) {
    return await 向Webview暴露函数(functionImpl);
}

//测试
function test(){
    return new Promise((resolve,reject)=>{
        setTimeout(()=>{
            resolve('test')
        },1000)
    })
}
let testFunction = await 向Webview暴露函数(test)
console.log(testFunction)
setInterval(()=>{
    testFunction().then((result)=>{
        console.log(result)
    })
},1000)