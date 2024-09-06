/**
 * 添加连续点击监听器
 * @param {HTMLElement} element - 要添加监听器的元素
 * @param {number} interval - 两次点击之间的最大间隔时间（毫秒）
 * @param {Function} callback - 回调函数，参数为点击次数
 */
function addMultiClickListener(element, interval, callback) {
    let lastClickTime = 0;
    let clickCount = 0;

    element.addEventListener('click', (event) => {
        const currentTime = new Date().getTime();
        const timeDiff = currentTime - lastClickTime;

        if (timeDiff < interval) {
            clickCount++;
        } else {
            clickCount = 1; // 重置点击次数
        }

        lastClickTime = currentTime;

        // 调用回调函数，并传入点击次数
        callback(clickCount);
    });
}
/***
 * 添加连续点击监听器,跟上面的函数不一样,这个函数返回一个封装后的函数,用于传入addEventListenr,便于在vue中使用
 */

export function buildMultiClickListener(interval=300, callbacks) {
    let lastClickTime = 0;
    let clickCount = 0;
    let timer = null;
    console.log('callbacks', callbacks)
    return function (event) {
        console.log('clickCount', clickCount)

        const currentTime = new Date().getTime();
        const timeDiff = currentTime - lastClickTime;
        if (timeDiff < interval) {
            clickCount++;
        } else {
            clickCount = 1; // 重置点击次数
        }
        lastClickTime = currentTime;
        //这里需要每触发新的回调,就要取消掉之前的回调
        console.log('clickCount', clickCount,callbacks[clickCount-1])
        if (callbacks[clickCount-1]) {
            
            clearTimeout(timer)
            timer = setTimeout(() => {
                callbacks[clickCount-1](event)
            }, interval)
        }
    };
}