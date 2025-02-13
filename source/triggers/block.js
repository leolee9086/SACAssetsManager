
const 打开资源管理视图  = {
    listen:[
        编辑器事件表.自定义事件.打开文档块菜单
    ],
    label: "打开资源管理视图",
    click: (ctx) => {
        emit(tabEvents.打开笔记资源视图, ctx.detail.data.id)
    },
}