async function 初始化目录树(root) {
    try {
        if (!遍历缓存.get(root)) {
            构建目录树(root)
        }
    } catch (e) {
        console.error('构建目录树失败', e)
    }
}
function shouldAbort(startTime, timeout, signal) {
    const nowTime = Date.now()
    if (nowTime - startTime > timeout) {
        signal.walkController.abort()
        return true
    }
    return signal.aborted
}
async function handleDirectory(path, nowTime) {
    globalTaskQueue.push(async () => {
        try {
            if (!遍历缓存.get(path)) {
                globalTaskQueue.push(
                    globalTaskQueue.priority(
                        async () => {
                            构建目录树(path)
                            return path
                        }, 0 - nowTime)
                )
            }
        } catch (e) {
            console.error('构建目录树失败', e)
        }
        return path
    })
    return false
}
