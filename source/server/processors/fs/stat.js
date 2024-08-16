/**
 * 如果stepCallback是一个函数,直接使用它
 * 如果stepCallback是一个对象,使用它的两个回调函数分别构建
 * @param {*} stepCallback 
 * @returns 
 */
export const buildStepCallback = (stepCallback) => {
    if(!stepCallback)return
    if(typeof stepCallback === 'function'){
        let callback =  (statProxy) => {
            try {
                 stepCallback(statProxy)
            } catch (e) {
                console.error(e)
            }
        }
        callback.end = () => {
            stepCallback.end && stepCallback.end()
        }
        return callback
    }
    let callback =  (statProxy) => {
        try {
            if(statProxy.isDirectory){
                stepCallback.ifDir &&  stepCallback.ifDir(statProxy)
            }
            if(statProxy.isFile){
                stepCallback.ifFile &&  stepCallback.ifFile(statProxy)
            }
            if(statProxy.isSymbolicLink){
                stepCallback.ifSymbolicLink &&  stepCallback.ifSymbolicLink(statProxy)
            }
        } catch (e) {
            console.warn(e)
        }
    }
    callback.end = () => {
        stepCallback.end && stepCallback.end()
    }
    return callback
}

