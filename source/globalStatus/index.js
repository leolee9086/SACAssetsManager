import { reactive, ref, watch } from "../../static/vue.esm-browser.js";
import {plugin} from "../asyncModules.js";

export const 状态注册表 = {
    选中的资源:'selectedAssets',
    本地文件搜索接口:'localApiList'
}
// 检查是否已经挂载状态
if (!plugin.status) {
    // 将全局状态挂载到插件上
    plugin.status = reactive({});
}
// 获取特定键的状态值
export function getStatu(key) {
    return plugin.status[key];
}

// 设置特定键的状态值
export function setStatu(key, value) {
    // 检查值是否为响应式对象，如果不是则转换
    if (!value.__v_isReactive) {
        value = reactive(value);
    }
    plugin.status[key] = value;
}

// 监控特定键的状态变化
export function watchStatu(key, callback) {
    watch(() => plugin.status[key], (newVal, oldVal) => {
        callback(newVal, oldVal);
    });
}
setStatu(状态注册表.本地文件搜索接口,[
    {
        host: 'localhost',
        port: 9999,
        type: 'everything'
    },
      {
        host: 'localhost',
        port: 9920,
        type: 'anytxt'
    },
  /*{
        host: 'localhost',
        port: 8082,
        type: 'alist'
    }*/
])
export function updateStatu(key, updateFn) {
    const currentValue = getStatu(key);
    const newValue = updateFn(currentValue);
    setStatu(key, newValue);
}

watchStatu(状态注册表.选中的资源,(newVal,oldVal)=>{
    console.log(newVal,oldVal)
})
plugin.eventBus.on('assets-select',(e)=>{
    setStatu(状态注册表.选中的资源,e.detail)
})



