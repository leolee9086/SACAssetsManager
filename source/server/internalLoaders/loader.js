/**
 * 用于加载loader
 * loader全部运行于独立的webview中
 * 通过广播图片路径给loader所在的webview，loader处理后，webview容器的preload脚本将处理后的图片返回给主进程
 */
const loaderRegister = new Map()
function createLoaderWebview(loaderPath) {
    loaderRegister.set(loaderPath, {
        path: loaderPath,
        matchRules: [],
        webview: null,
        meta: null
    })

    const webview = new Webview()
    loaderRegister.get(loaderPath).webview = webview
    //webview可以使用node环境
    webview.nodeIntegration = true
    //webview可以使用remote
    webview.enableRemoteModule = true
    webview.preload = workspaceLoaderURL2Local(import.meta.resolve('./preload.js'))
    //当webview加载完成后，执行回调函数
    //向webview发送消息，消息内容为loaderPath
    webview.onDidFinishLoad(() => {
        webview.send('loaderPath', loaderPath)
    })
    //webview会通过消息返回一个正则规则序列
    //根据这个序列，长度越短的正则规则优先级越高
    //同样长度的正则序列，匹配越严格的优先级越高
    webview.on('message', (event, message) => {
        if (message.type === 'matchRules') {
            //校验matchRules是否为数组
            if (!Array.isArray(message.matchRules)) {
                return
            }
            //将message.matchRules转换为正则表达式,这里需要避免xss
            const matchRules = message.matchRules.map(rule => new RegExp(rule))
            //将matchRules注册到loaderRegister中
            loaderRegister.get(loaderPath).matchRules = matchRules
        }
    })
    return webview
}



function sortMatchRules(matchRules, imagePath) {
    //根据matchRules的长度排序，长度越短的优先级越高
    //同样长度的matchRules，匹配越严格的优先级越高
    matchRules.sort((a, b) => compareMatchRules(a, b, imagePath))
}
function compareMatchRules(rulerArray_a, rulerArray_b, imagePath) {
    let flag = 0
    //首先比较数组长度
    if (rulerArray_a.length < rulerArray_b.length) {
        flag = -1
    } else if (rulerArray_a.length > rulerArray_b.length) {
        flag = 1
    }
    //如果长度相同，比较正则表达式,匹配越严格的优先级越高
    //所谓匹配严格,指的是正则表达式匹配到的字符串长度越长,优先级越高
    //需要注意,两个序列都是正则表达式数组,所以需要遍历匹配后进行比较
    const matchedResult_a = useMatchRules(rulerArray_a, imagePath)
    const matchedResult_b = useMatchRules(rulerArray_b, imagePath)
    //如果匹配到,则比较匹配到的字符串长度
    if (matchedResult_a && matchedResult_b) {
        flag = matchedResult_a.matched.length - matchedResult_b.matched.length
    }
    
    //如果还是无法比较,则比较正则表达式
    if (flag === 0) {
        flag = rulerArray_a.source.length - b.source.length
    }
    return flag
}


function useMatchRules(matchRules, imagePath) {
    for (const matchRule of matchRules) {
        //如果匹配到,则返回匹配到的字符串
        if (matchRule.test(imagePath)) {
            return {matched:matchRule.exec(imagePath),matchedRule:matchRule}
        }
    }
    //否则返回false
    return false
}