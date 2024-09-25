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
const observedElements =globalThis[Symbol.for('ResizeObserver')]||new WeakMap();
globalThis[Symbol.for('ResizeObserver')]=observedElements
export function 以函数创建尺寸监听(callback, immediate = false, noDup = true) {
    
    let fn = (target) => {
        if (noDup && observedElements.has(target)) {
            return; // 如果元素已经被监听，则直接返回
        }
        
        const stat = { width: target.clientWidth, height: target.clientHeight };
        const resizeObserver = new ResizeObserver(entries => {
            if (stat.width !== target.clientWidth || stat.height !== target.clientHeight) {
                stat.width = target.clientWidth;
                stat.height = target.clientHeight;
                callback(stat);
            }
        });
        
        resizeObserver.observe(target);
        observedElements.set(target, resizeObserver);
        
        if (immediate) {
            callback(stat);
        }
    };
    
    fn.stop = (target) => {
        if (observedElements.has(target)) {
            const observer = observedElements.get(target);
            observer.unobserve(target);
            observedElements.delete(target);
        }
    };
    
    return fn;
}