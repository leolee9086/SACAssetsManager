export function 监听尺寸(target, callback,immediate=false) {
    const stat = { width: target.clientWidth, height: target.clientHeight }
    const resizeObserver = new ResizeObserver(entries => {
        if (stat.width !== target.clientWidth || stat.height !== target.clientHeight) {
            stat.width = target.clientWidth
            stat.height = target.clientHeight
            callback(stat)
        }
    });
    if(immediate){
        callback(stat)
    }
    resizeObserver.observe(target)
}
export function 以函数创建尺寸监听(callback,immediate=false) {
    let fn= (target) => {
        const stat = { width: target.clientWidth, height: target.clientHeight }
        const resizeObserver = new ResizeObserver(entries => {
            if (stat.width !== target.clientWidth || stat.height !== target.clientHeight) {
                stat.width = target.clientWidth
                stat.height = target.clientHeight
                callback(stat)
            }
        });
        resizeObserver.observe(target)
        if(immediate){
            callback(stat)
        }
    }
    fn.stop = (target) => {
        resizeObserver.unobserve(target)
    }

    return fn
}