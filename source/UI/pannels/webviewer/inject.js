// 拦截所有页面跳转
const { contextBridge, ipcRenderer } = require('electron')

// 安全暴露有限IPC方法
contextBridge.exposeInMainWorld('__NAVIGATION_API__', {
  sendNavigate: (url) => ipcRenderer.send('navigate', url)
})

window.addEventListener('click', e => {
  const link = e.composedPath().find(el => el.tagName === 'A')
  if (link && link.href) {
    e.preventDefault()
    window.__NAVIGATION_API__.sendNavigate(link.href)
  }
})



// 拦截表单提交
document.addEventListener('submit', e => {
  const form = e.target
  if (form.action) {
    e.preventDefault()
    window.__NAVIGATION_API__.sendNavigate(form.action)
  }
})

// 拦截JavaScript跳转
history.pushState = new Proxy(history.pushState, {
  apply(target, thisArg, args) {
    window.__NAVIGATION_API__.sendNavigate(args[2])
    return Reflect.apply(target, thisArg, args)
  }
}) 