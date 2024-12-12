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

    // 添加获取特定层级所有折叠状态的方法
    const getAllFoldStates = (level) => {
        return foldStates[level].value || {};
    }

    // 添加检查是否所有节点都已折叠的方法
    const isAllFolded = (level) => {
        const states = foldStates[level].value;
        return Object.values(states).every(value => 
            typeof value === 'boolean' ? value : Object.values(value).every(v => v)
        );
    }

    // 添加检查是否所有节点都已展开的方法
    const isAllExpanded = (level) => {
        const states = foldStates[level].value;
        return Object.values(states).every(value => 
            typeof value === 'boolean' ? !value : Object.values(value).every(v => !v)
        );
    }

    // 添加获取当前折叠节点数量的方法
    const getFoldedCount = (level) => {
        const states = foldStates[level].value;
        let count = 0;
        const countFolded = (obj) => {
            Object.values(obj).forEach(value => {
                if (typeof value === 'boolean') {
                    if (value) count++;
                } else {
                    countFolded(value);
                }
            });
        };
        countFolded(states);
        return count;
    }

    return {
        foldStates,
        toggleFold,
        getFoldState,
        setAllFoldStates,
        resetFoldState,
        getAllFoldStates,
        isAllFolded,
        isAllExpanded,
        getFoldedCount,
    }
}