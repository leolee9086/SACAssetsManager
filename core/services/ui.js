/**
 * UI服务,用于在各种环境中提供统一的UI功能
 */


/**
 * 弹窗,在思源的前端API可以使用时使用思源的dialog作为实现，否则使用自行实现的弹窗
 * 保持两者功能接口一致
 */
const 思源前端API = globalThis[Symbol.for('siyuanClientApi')]
const 默认弹窗配置 = {
    //弹窗的标题
    title: !title ? "SAC插件弹窗" : title,
    //弹窗的内容
    content: `
    <div id="styleEditorPanel" 
        class='fn__flex-column styleEditor'  
        style="pointer-events:auto;z-index:5;max-height:80vh">
    </div>
`,
    //弹窗的宽度
    width: width || '200px',
    //弹窗的高度
    height: height || 'auto',
    //弹窗是否透明
    transparent: transparent,
    //弹窗的关闭按钮是否显示
    disableClose: transparent,
    //弹窗是否动画
    disableAnimation: false,
}
/**
 * 创建自定义弹窗,用于在没有思源前端API时接管弹窗功能
 * @param {*} options
 * @TODO    思源前端API可用时，使用思源的dialog作为实现，否则使用自行实现的弹窗

*/
const 创建自定义弹窗 = (options = 默认弹窗配置) => {
    console.error('思源前端API不可用，使用自定义弹窗,尚未实现')
}
/**
 * 打开弹窗
 * @param {*} options
 * @TODO    思源前端API可用时，使用思源的dialog作为实现，否则使用自行实现的弹窗
 */
const 打开弹窗 = (options = 默认弹窗配置) => {
    if (思源前端API) {
        const { dialog } = 思源前端API

        return dialog(options)
    }
    return 创建自定义弹窗(options)
}



const 对话框转换为页签 = (options) => {
    const { dialog, tabConfig } = options
    const { app, custom } = dialog
    const { icon, title, data, id } = custom
    const openTab = 思源前端API.openTab
    const tabCustom = {
        icon,
        title,
        data,
        id
    }
    const tab = openTab({ app, custom: tabCustom })
    return tab
}
