import { ref } from "../../../static/vue.esm-browser.js";

export function useFoldableTree(levels = []) {
    // 添加初始状态参数
    const foldStates = levels.reduce((acc, level) => {
        acc[level] = ref({})
        return acc
    }, {})

    // 添加批量设置状态的方法
    const setAllFoldStates = (level, value) => {
        foldStates[level].value = Object.keys(foldStates[level].value).reduce((acc, key) => {
            acc[key] = value;
            return acc;
        }, {});
    }

    // 添加重置特定层级状态的方法
    const resetFoldState = (level) => {
        foldStates[level].value = {};
    }

    // 切换指定路径的折叠状态
    const toggleFold = (level, ...path) => {
        if (!foldStates[level].value) {
            foldStates[level].value = {}
        }
        
        let current = foldStates[level].value
        for (let i = 0; i < path.length - 1; i++) {
            if (!current[path[i]]) {
                current[path[i]] = {}
            }
            current = current[path[i]]
        }
        
        const lastKey = path[path.length - 1]
        current[lastKey] = !current[lastKey]
    }

    // 获取指定路径的折叠状态
    const getFoldState = (level, ...path) => {
        if (!foldStates[level].value) return false
        
        let current = foldStates[level].value
        for (const key of path) {
            if (!current[key]) return false
            current = current[key]
        }
        return current
    }

    return {
        foldStates,
        toggleFold,
        getFoldState,
        setAllFoldStates,
        resetFoldState
    }
}