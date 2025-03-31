<!-- 日志控制组件 -->
<script setup>
import { computed } from 'vue'

const props = defineProps({
    日志列表: {
        type: Array,
        required: true
    },
    最大内存日志数: {
        type: Number,
        required: true
    },
    可用标签: {
        type: Array,
        default: () => []
    },
    选中标签: {
        type: String,
        default: ''
    },
    搜索文本: {
        type: String,
        default: ''
    },
    自动滚动: {
        type: Boolean,
        default: false
    },
    暂停接收: {
        type: Boolean,
        default: false
    },
    数据库日志计数: {
        type: Number,
        default: 0
    },
    选中级别: {
        type: String,
        default: ''
    }
})

const emit = defineEmits([
    '更新最大日志数',
    '清空日志',
    '切换自动滚动',
    '导出日志',
    '切换暂停接收',
    '更新搜索文本',
    '更新选中标签',
    '更新选中级别'
])

// 计算日志统计信息
const 日志统计 = computed(() => {
    const 统计 = {
        total: props.日志列表.length,
        info: 0,
        warn: 0,
        error: 0,
        debug: 0
    };
    
    props.日志列表.forEach(日志 => {
        if (统计[日志.级别] !== undefined) {
            统计[日志.级别]++;
        }
    });
    
    return 统计;
});
</script>

<template>
    <div class="log-controls">
        <!-- 日志级别过滤 -->
        <select :value="选中级别" @change="$emit('更新选中级别', $event.target.value)">
            <option value="">所有级别</option>
            <option value="info">信息</option>
            <option value="warn">警告</option>
            <option value="error">错误</option>
            <option value="debug">调试</option>
        </select>
        
        <!-- 标签过滤 -->
        <select v-if="可用标签.length > 0" 
                v-model="选中标签" 
                @change="$emit('更新选中标签', $event.target.value)">
            <option value="">所有标签</option>
            <option v-for="标签 in 可用标签" 
                    :key="标签" 
                    :value="标签">
                {{ 标签 }}
            </option>
        </select>
        
        <!-- 最大日志数设置 -->
        <input type="number" 
               :value="最大内存日志数" 
               min="100" 
               max="10000" 
               step="100" 
               @change="$emit('更新最大日志数', Number($event.target.value))">
        
        <!-- 搜索框 -->
        <input type="text" 
               v-model="搜索文本" 
               placeholder="搜索日志..." 
               @input="$emit('更新搜索文本', $event.target.value)">
        
        <!-- 操作按钮 -->
        <button @click="$emit('清空日志')">清空</button>
        <button @click="$emit('切换自动滚动')">
            {{ 自动滚动 ? '关闭自动滚动' : '开启自动滚动' }}
        </button>
        <button @click="$emit('导出日志')">导出</button>
        <button @click="$emit('切换暂停接收')" 
                :class="{'pause-receiving': 暂停接收}">
            {{ 暂停接收 ? '恢复接收' : '暂停接收' }}
        </button>
        
        <!-- 日志统计信息 -->
        <span class="log-count-info">
            内存中: {{ 日志列表.length }}/{{ 最大内存日志数 }} | 
            数据库: {{ 数据库日志计数 }}
        </span>
    </div>
    
    <div class="log-stats">
        <span>总数: {{ 日志统计.total }}</span>
        <span>信息: {{ 日志统计.info }}</span>
        <span>警告: {{ 日志统计.warn }}</span>
        <span>错误: {{ 日志统计.error }}</span>
        <span>调试: {{ 日志统计.debug }}</span>
    </div>
</template>

<style scoped>
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

.log-controls button.pause-receiving {
    background-color: #f85149;
    border-color: #f85149;
}

.log-controls button.pause-receiving:hover {
    background-color: #ff6b6b;
}

.log-count-info {
    margin-left: auto;
    color: #8b949e;
    font-size: 0.9em;
}

.log-stats {
    padding: 4px 8px;
    background-color: #161b22;
    border-bottom: 1px solid #30363d;
    display: flex;
    gap: 16px;
    font-size: 0.9em;
    color: #8b949e;
}

.log-stats span {
    display: flex;
    align-items: center;
    gap: 4px;
}
</style> 