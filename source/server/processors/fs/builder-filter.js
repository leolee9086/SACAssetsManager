/**
 * 构建可以传入signal的过滤函数
 * @param {function} filter 
 * @returns 
 */
export function buildFilter(filter, signal) {
    if (!filter) {
        return ()=>{return true}
    }
    if (filter && typeof filter === 'function') {
        return async (statProxy) => {
            if (signal && signal.aborted) {
                return false
            }
            try {
                let proxy = statProxy
                return await Promise.race([
                    filter(proxy),
                    new Promise((resolve, reject) => setTimeout(() => resolve(false), 30))
                ])
            } catch (e) {
                console.error(e, statProxy)
                return false
            }
        }
    } else {
        if (filter && typeof filter === 'object') {
            return async (statProxy) => {
                if (signal && signal.aborted) {
                    return false
                }
                try {
                    let proxy = statProxy
                    const timeoutPromise = new Promise((resolve, reject) => setTimeout(() => resolve(false), 30))
                    if (statProxy.isFile() && filter.ifFile) {
                        return await Promise.race([filter.ifFile(proxy), timeoutPromise])
                    }
                    if (statProxy.isDirectory() && _filter.ifDir) {
                        return await Promise.race([filter.ifDir(proxy), timeoutPromise])
                    }
                    if (statProxy.isSymbolicLink() && _filter.ifLink) {
                        return await Promise.race([filter.ifLink(proxy), timeoutPromise])
                    }
                } catch (e) {
                    console.error(e, statProxy)
                    return false
                }
            }
        }
    }
}
