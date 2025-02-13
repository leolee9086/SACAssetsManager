
console.log('开始加载服务')
加宽工具栏()
/***
 * 添加css以加宽底部状态栏，容纳服务图标
 * 
 */
function 加宽工具栏(){
    const 状态栏 = 获取状态栏容器();
    if (状态栏) {
        状态栏.style.minHeight = '64px';  // 设置最小高度以容纳图标
        状态栏.style.padding = '2px 8px';  // 添加适当的内边距
    }
}
function 获取服务按钮容器(){
    return 获取状态栏容器.querySelector("fn__felx-1")
}
function 获取状态栏容器(){
    //底部状态栏容器
    return document.querySelector('#status')
}
