export const 打开文件夹数组素材页签=(页签数组)=>{
    Array.from(new Set(页签数组.value)).forEach(文件路径 => {
        if (文件路径 !== '/') {
          打开本地资源视图(文件路径);
        }
    });
}
export const 清理重复元素 = (数组)=>{
    return Array.from(new Set(数组))
}
export { 异步映射 } from "../../utils/array/index.js";
export { 异步清理重复元素 } from "../../utils/array/index.js";