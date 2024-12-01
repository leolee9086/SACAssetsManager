import { ref } from "../../../../../../static/vue.esm-browser.js";
import { fromFilePath } from "../../../../../utils/fromDeps/sharpInterface/useSharp/toSharp.js";
export const 历史队列 = ref([]);
export const 文件历史管理器 = {
    历史队列,
    添加: (newPath, thumbnailUrl) => {
        // 先清理已存在的相同路径记录
        const existingIndex = 历史队列.value.findIndex(item => item.path === newPath);
        if (existingIndex !== -1) {
            URL.revokeObjectURL(历史队列.value[existingIndex].thumbnail);
            历史队列.value.splice(existingIndex, 1);
        }
        // 添加新记录到开头
        历史队列.value.unshift({
            path: newPath,
            name: newPath.split(/[\\/]/).pop(),
            thumbnail: thumbnailUrl
        });
        // 限制历史长度（默认保留10条记录）
        const 最大历史记录数 = 10;
        while (历史队列.value.length > 最大历史记录数) {
            const removed = 历史队列.value.pop();
            URL.revokeObjectURL(removed.thumbnail);
        }
    },
    清空: () => {
        历史队列.value.forEach(item => {
            URL.revokeObjectURL(item.thumbnail);
        });
        历史队列.value = [];
    },
    获取指定sharp对象:async(index)=>{
        const 文件路径 = 历史队列.value[index]?.path
        const sharp对象 =await fromFilePath(文件路径)
        return sharp对象
    }
    
};