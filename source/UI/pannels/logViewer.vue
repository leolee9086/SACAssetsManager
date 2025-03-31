<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

// 状态定义
const 日志列表 = ref([])
const 最大日志数 = ref(1000)
const 自动滚动 = ref(true)
const 过滤级别 = ref('')
const 搜索文本 = ref('')
const 日志容器 = ref(null)
const 显示时间戳 = ref(true)
const 显示级别 = ref(true)
const 显示行号 = ref(true)
const 日志统计 = ref({
    total: 0,
    info: 0,
    warn: 0,
    error: 0,
    debug: 0
})

// 计算属性
const 过滤后的日志 = computed(() => {
    let 结果 = 日志列表.value
    
    // 按级别过滤
    if (过滤级别.value !== '') {
        结果 = 结果.filter(日志 => 日志.级别 === 过滤级别.value)
    }
    
    // 按文本搜索
    if (搜索文本.value) {
        const 搜索词 = 搜索文本.value.toLowerCase()
        结果 = 结果.filter(日志 => 
            日志.内容.toLowerCase().includes(搜索词) ||
            日志.来源.toLowerCase().includes(搜索词)
        )
    }
    
    return 结果
})

// 方法定义
const 添加日志 = (日志) => {
    const 新日志 = {
        ...日志,
        时间: new Date().toLocaleString(),
        行号: 日志列表.value.length + 1
    }
    
    日志列表.value.push(新日志)
    
    // 更新统计
    日志统计.value.total++
    if (新日志.级别) {
        日志统计.value[新日志.级别]++
    }
    
    // 限制日志数量
    if (日志列表.value.length > 最大日志数.value) {
        日志列表.value.shift()
    }
    
    // 自动滚动
    if (自动滚动.value) {
        nextTick(() => {
            if (日志容器.value) {
                日志容器.value.scrollTop = 日志容器.value.scrollHeight
            }
        })
    }
}

const 清空日志 = () => {
    日志列表.value = []
    日志统计.value = {
        total: 0,
        info: 0,
        warn: 0,
        error: 0,
        debug: 0
    }
}

const 切换自动滚动 = () => {
    自动滚动.value = !自动滚动.value
}

const 导出日志 = () => {
    const 文本 = 日志列表.value.map(日志 => 
        `[${日志.时间}] ${日志.级别.toUpperCase()}: ${日志.内容}`
    ).join('\n')
    
    const blob = new Blob([文本], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `日志_${new Date().toLocaleString().replace(/[\/\s:]/g, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
}

const 复制日志 = (日志) => {
    const 文本 = `[${日志.时间}] ${日志.级别.toUpperCase()}: ${日志.内容}`
    navigator.clipboard.writeText(文本)
}

// 生命周期钩子
onMounted(() => {
    // 监听父组件发来的日志消息
    window.addEventListener('message', (事件) => {
        if (事件.data && 事件.data.type === 'log') {
            添加日志(事件.data.log)
        }
    })
})

onUnmounted(() => {
    window.removeEventListener('message', 添加日志)
})

// 导出方法供父组件使用
defineExpose({
    添加日志,
    清空日志,
    切换自动滚动
})
</script>

<template>
    <div class="log-viewer">
        <div class="log-controls">
            <select v-model="过滤级别">
                <option value="">所有级别</option>
                <option value="info">信息</option>
                <option value="warn">警告</option>
                <option value="error">错误</option>
                <option value="debug">调试</option>
            </select>
            <input type="number" v-model="最大日志数" min="100" max="10000" step="100">
            <input type="text" v-model="搜索文本" placeholder="搜索日志...">
            <button @click="清空日志">清空</button>
            <button @click="切换自动滚动">{{ 自动滚动 ? '关闭自动滚动' : '开启自动滚动' }}</button>
            <button @click="导出日志">导出</button>
        </div>
        <div class="log-stats">
            <span>总数: {{ 日志统计.total }}</span>
            <span>信息: {{ 日志统计.info }}</span>
            <span>警告: {{ 日志统计.warn }}</span>
            <span>错误: {{ 日志统计.error }}</span>
            <span>调试: {{ 日志统计.debug }}</span>
        </div>
        <div class="log-container" ref="日志容器">
            <div v-for="日志 in 过滤后的日志" 
                 :key="日志.行号" 
                 class="log-entry"
                 :class="日志.级别"
                 @click="复制日志(日志)">
                <span v-if="显示时间戳" class="log-time">{{ 日志.时间 }}</span>
                <span v-if="显示级别" class="log-level">{{ 日志.级别.toUpperCase() }}</span>
                <span class="log-source">{{ 日志.来源 }}</span>
                <span class="log-content">{{ 日志.内容 }}</span>
            </div>
        </div>
    </div>
</template>

<style scoped>
.log-viewer {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: #0d1117;
    color: #c9d1d9;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.log-controls {
    padding: 8px;
    background-color: #161b22;
    border-bottom: 1px solid #30363d;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
}

.log-controls select,
.log-controls input,
.log-controls button {
    padding: 4px 8px;
    background-color: #21262d;
    border: 1px solid #30363d;
    border-radius: 4px;
    color: #c9d1d9;
    font-size: 14px;
}

.log-controls select:hover,
.log-controls input:hover,
.log-controls button:hover {
    background-color: #30363d;
}

.log-controls button {
    cursor: pointer;
}

.log-stats {
    padding: 4px 8px;
    background-color: #161b22;
    border-bottom: 1px solid #30363d;
    display: flex;
    gap: 16px;
    font-size: 14px;
}

.log-stats span {
    padding: 2px 6px;
    border-radius: 4px;
}

.log-stats .info { color: #58a6ff; }
.log-stats .warn { color: #e3b341; }
.log-stats .error { color: #f85149; }
.log-stats .debug { color: #8b949e; }

.log-container {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    font-family: Consolas, monospace;
    font-size: 14px;
    line-height: 1.5;
}

.log-entry {
    padding: 2px 4px;
    margin-bottom: 2px;
    border-radius: 2px;
    cursor: pointer;
    transition: background-color 0.1s;
}

.log-entry:hover {
    background-color: #161b22;
}

.log-time {
    color: #8b949e;
    margin-right: 8px;
}

.log-level {
    font-weight: bold;
    margin-right: 8px;
    padding: 0 4px;
    border-radius: 2px;
}

.log-source {
    color: #8b949e;
    margin-right: 8px;
}

.log-content {
    white-space: pre-wrap;
    word-break: break-word;
}

.info .log-level {
    color: #58a6ff;
    background-color: rgba(88, 166, 255, 0.1);
}

.warn .log-level {
    color: #e3b341;
    background-color: rgba(227, 179, 65, 0.1);
}

.error .log-level {
    color: #f85149;
    background-color: rgba(248, 81, 73, 0.1);
}

.debug .log-level {
    color: #8b949e;
    background-color: rgba(139, 148, 158, 0.1);
}

/* 自定义滚动条 */
.log-container::-webkit-scrollbar {
    width: 8px;
}

.log-container::-webkit-scrollbar-track {
    background: #161b22;
}

.log-container::-webkit-scrollbar-thumb {
    background: #30363d;
    border-radius: 4px;
}

.log-container::-webkit-scrollbar-thumb:hover {
    background: #484f58;
}
</style> 