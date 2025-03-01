export  const 异步数组转存 = async (源数组, 目标数组) => {
    for await (let 元素 of 源数组) {
        目标数组.push(元素)
    }
}