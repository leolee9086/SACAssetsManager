import { initVueApp } from '../../../utils/module/vue/loadVueApp.js'
const app= initVueApp(import.meta.resolve('./components/app.vue'),'editorRoot')
app.mount(document.querySelector('#app'))
