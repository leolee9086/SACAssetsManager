export function 创建点击事件菜单触发函数(前端API){
    const {Menu}= 前端API
    return (菜单名)=>{
        return  (e)=>{
            const menu = new Menu(菜单名)
            document.addEventListener('mousedown', () => { menu.close }, { once: true })
            return {
                open: ()=>{
                    menu.open({ y: event.y || e.detail.y, x: event.x || e.detail.x })
                },
                menu,
            }
        }
    }   
}