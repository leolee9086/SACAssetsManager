import { createWebviewByJsURL } from "./webview.js"
export async function exposeFunctionToWebview( functionImpl) {
    const jsString = functionImpl.toString()
    const wrapedjsString=`
    const electron=require('@electron/remote')
    const {ipcRenderer}=electron
    ipcRenderer.on('invokeFunction', ($event,data) => {
        const sender = $event.sender
        const {timeStamp,args}=data
        const  result = ${jsString}.apply(null,args)
        require('@electron/remote').ipcRenderer.send('invokeFunctionResult', {timeStamp,result})
    });
    `
    const blob = new Blob([wrapedjsString], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const webview = await createWebviewByJsURL(url);
    console.log(webview)
    webview.openDevTools()
    return (...args)=>{
        return new Promise((resolve,reject)=>{
            const timeStamp = Date.now()
            const webviewId = webview.getWebContentsId()
            const webviewWebContents = webContents.fromId(webviewId)
            webviewWebContents.send('invokeFunction', {timeStamp,args})
            require('@electron/remote').ipcRenderer.on('invokeFunctionResult', (event, result) => {
                if(result.timeStamp===timeStamp){
                    resolve(result.result)
                }
                setTimeout(()=>{
                    reject(new Error('invokeFunction timeout'))
                },1000)
            })
        })
    }
}
//测试
function test(){
    return new Promise((resolve,reject)=>{
        setTimeout(()=>{
            resolve('test')
        },1000)
    })
}
let testFunction =await exposeFunctionToWebview(test)
console.log(testFunction)
setInterval(()=>{
    testFunction().then((result)=>{
        console.log(result)
    })
},1000)