function createURL(url){
    try{
        return new URL(url)
    }catch(e){
        console.error('解析url失败','url',url, e)
        return null
    }
}
function isSameURL(url1, url2) {
    console.log(url1, url2)
    try{
        const $url1 = createURL(url1)
        const $url2 = createURL(url2)
    //注意浏览器会自动将url中的路径解析到index.html
    //所以需要将路径中的index.html去掉
    
    $url1.pathname = $url1.pathname.replace(/index\.html$/, '')
    $url2.pathname = $url2.pathname.replace(/index\.html$/, '')
    return $url1.pathname === $url2.pathname && $url1.search === $url2.search

    }catch(e){
        console.error('解析url失败', e)
        return false
    }
}
export function 获取同源窗口(url){
    const { BrowserWindow } = require('@electron/remote');
    const 同源窗口 = BrowserWindow.getAllWindows().filter(w => 
        {
            console.log(w.webContents,w.webContents.getURL(), url)
            return isSameURL(w.webContents.getURL(), url)
        }
    )
    return 同源窗口
}