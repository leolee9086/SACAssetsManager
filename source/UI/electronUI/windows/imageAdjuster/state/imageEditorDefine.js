import ref from '../../../../../../static/vue.esm-browser.js'
export const $state = ref({
    编辑器模式: "空闲"
})
// === 环境变量 ===
export const $env = ref({
    系统忙碌: false,
    hasImage: false,
    canSwitchMode: true
})




// === 库所类型定义 ===
export const $PlaceTypes = {
    BASIC: 'basic',
    COUNTER: 'counter',
    COLOR: 'color',
    TIMED: 'timed',
    STACK: 'stack'
}

// === 颜色集定义 ===
export const $ColorSets = {
    历史记录: {
        操作类型: ['缩放', '裁剪', '透视'],
        参数: 'list<real>',
        时间戳: 'time'
    },
    工具类型: ['透视', '裁剪', '缩放']
}

// === 系统规则 ===
export const $Rules = {
    TIME: {
        自动保存: 5000,
        操作超时: 3000
    },
    COUNT: {
        自动保存阈值: 5,
        最大撤销次数: 20
    },
    PRIORITY: {
        系统控制: 3,
        用户操作: 2,
        自动操作: 1
    }
}


/***
 * 所有的对象导出,除了$开头的,视为库所
 * 库所的contents,声明了此时系统的所有状态
 * 迁入此库所时,content所声明的所有目标设置为对应值
 * 可以使用查询函数确定目标,但是最好静态声明
 * value的模式一般是"部分覆盖",完全覆盖需要声明
 * 不要使用库所来进行复杂逻辑声明,这是变迁的工作
 */
export const 堆栈模式启用 = {
    type: 'basic',
    initial: 1,
    capacity: 1,
    contents: [
        {
            target: $state.value.编辑模式,
            value: '堆栈'
        },
        {
            target: $state.value.toolButtons.filter(item => !item.group === 'stack'),
            value: {
                visiable: false,
                disabled: true
            }
        }
    ]
}

/**
 * 
 * @param {} name 
 * @returns 
 * 用于生成用户交互触发器的原型,没什么别的用处,就是当传入的信号量被触发时,产生的库所会添加一个token
 * 在petry文件中的调用方式是:点击触发器('触发器ID'),注意,没有λ前缀
 * 调用方式是,net.触发器名(...params)
 * 只有触发器类型的库所有输入,且不接受连入弧
 */

export const _点击触发器_ = (触发器ID) => {
    return {
        type: 'input',
        initial: 1,
        capacity: 1,
        //它仅仅就是个空库所,什么状态都没有声明
        tokenBox:{
            click:[]
        },
        click:(e,net)=>{
            this.tokenBox.click.push(e)
            net.checkPlace(this)
        },
        id:触发器ID
    }
}

/**
 * 
 * @param {} name 
 * @returns 
 * 用于生成用户交互触发器的原型,没什么别的用处,就是当传入的信号量被触发时,产生的库所会添加一个token
 * 在petry文件中的调用方式是:点击触发器('触发器ID'),注意,没有λ前缀
 * 调用方式是,net.触发器名(...params)
 * 只有触发器类型的库所有输入,且不接受连入弧
 */

export const _值触发器_ = (触发器ID) => {
    return {
        type: 'input',
        initial: 1,
        capacity: 1,
        //这个触发器库所会将传入参数设置到系统状态
        content: (strangth, offset) => {
            return [
                {
                    target: $state.effects.find(item => item.name === '触发器ID'),
                    value: { stranth, offset }
                }
            ]
        }
    }
}


export const 画笔工具可用 = {
    type: 'basic',
    initial: 0,
    capacity: 1,
    contents: [
        {
            target: $state.value.toolButtons?.find(item => item.name === '画笔工具'),
            value: {
                visible: true,
                disabled: false
            }
        },
        {
            target: $state.value.currentTool,
            value: '画笔'
        }
    ]
}

// 加载画笔工具的变迁定义,注意没有特殊标记的函数都会被视为变迁函数,它们无法获取系统以外的状态
export const 加载画笔工具 = async () => {
    try {
        $env.value.系统忙碌 = true
        // 这里可以添加实际的工具加载逻辑
        await loadBrushTool()  // 假设这是加载画笔工具的异步函数
        return true
    } catch (error) {
        console.error('画笔工具加载失败:', error)
        return false
    } finally {
        $env.value.系统忙碌 = false
    }
}

// === 错误处理相关的库所定义 ===
export const 系统出错 = {
    type: 'basic',
    initial: 0,
    capacity: 1,
    contents: [
        {
            target: $state.value.systemState,
            value: 'error'
        },
        {
            target: $env.value.系统忙碌,
            value: true
        }
    ]
}

export const 空闲状态 = {
    type: 'basic',
    initial: 1,
    capacity: 1,
    contents: [
        {
            target: $state.value.systemState,
            value: 'idle'
        },
        {
            target: $env.value.系统忙碌,
            value: false
        },
        {
            target: $state.value.编辑器模式,
            value: '空闲'
        }
    ]
}

export const 系统无法恢复 = {
    type: 'basic',
    initial: 0,
    capacity: 1,
    contents: [
        {
            target: $state.value.systemState,
            value: 'fatal_error'
        },
        {
            target: $env.value.系统忙碌,
            value: true
        },
        {
            target: $state.value.needRestart,
            value: true
        }
    ]
}

// === 错误恢复计数器 ===
export const 重试计数器 = {
    type: 'counter',
    initial: 0,
    capacity: 5,
    contents: [
        {
            target: $state.value.retryCount,
            value: (current) => current + 1
        }
    ]
}

// === 错误恢复变迁函数 ===
export const 从错误中重新加载 = async () => {
    try {
        // 获取当前重试次数
        const currentRetries = $state.value.retryCount || 0
        
        if (currentRetries >= 5) {
            return false // 超过最大重试次数，触发系统无法恢复
        }

        // 执行恢复流程
        await 执行恢复流程()
        
        // 重置系统状态
        await 重置系统状态()
        
        return true // 恢复成功，转向空闲状态
    } catch (error) {
        console.error('系统恢复失败:', error)
        return false // 恢复失败，继续重试或转向系统无法恢复
    }
}

// === 辅助函数 ===
async function 执行恢复流程() {
    // 1. 保存当前工作
    await 保存当前工作()
    
    // 2. 清理系统状态
    await 清理系统状态()
    
    // 3. 重新初始化系统
    await 重新初始化系统()
}

async function 重置系统状态() {
    // 重置所有工具状态
    $state.value.toolButtons?.forEach(tool => {
        tool.visible = false
        tool.disabled = true
    })
    
    // 重置编辑器模式
    $state.value.编辑器模式 = '空闲'
    
    // 重置环境变量
    $env.value.系统忙碌 = false
    $env.value.canSwitchMode = true
}

async function 保存当前工作() {
    try {
        // 尝试保存当前工作状态
        await saveCurrentWork()
    } catch {
        // 保存失败时记录日志但继续执行
        console.warn('自动保存失败')
    }
}

async function 清理系统状态() {
    // 清理所有活动的工具
    $state.value.currentTool = null
    
    // 清理临时资源
    await cleanupResources()
}

async function 重新初始化系统() {
    // 重新加载基础组件
    await initializeBaseComponents()
    
    // 重新加载配置
    await loadConfiguration()
}
