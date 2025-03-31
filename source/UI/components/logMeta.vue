<!-- 日志元数据组件 -->
<script setup>
import { computed } from 'vue'

const props = defineProps({
    日志: {
        type: Object,
        required: true
    },
    显示时间戳: {
        type: Boolean,
        default: true
    },
    显示级别: {
        type: Boolean,
        default: true
    }
})

const emit = defineEmits(['复制内容', '设置标签过滤'])

// 格式化时间
const 格式化时间 = (时间戳) => {
    try {
        const 日期 = new Date(时间戳);
        return 日期.toLocaleTimeString();
    } catch (e) {
        return 时间戳;
    }
};
</script>

<template>
    <div class="log-meta">
        <span v-if="显示时间戳" 
              class="log-time" 
              @click="$emit('复制内容', 格式化时间(日志.时间), '时间', $event)">
            {{ 格式化时间(日志.时间) }}
        </span>
        <span v-if="显示级别" 
              class="log-level" 
              @click="$emit('复制内容', 日志.级别, '级别', $event)">
            {{ 日志.级别.toUpperCase() }}
        </span>
        <span class="log-source" 
              @click="$emit('复制内容', 日志.来源, '来源', $event)">
            {{ 日志.来源 }}
        </span>
        
        <!-- 显示标签 -->
        <span v-if="日志.标签 && 日志.标签.length > 0" class="log-tags">
            <span v-for="标签 in 日志.标签" 
                  :key="标签" 
                  class="log-tag"
                  @click="$emit('设置标签过滤', 标签)">
                {{ 标签 }}
            </span>
        </span>
        
        <span class="log-actions">
            <button class="mini-button copy-all" 
                    @click="$emit('复制内容', 日志, '整条日志', $event)" 
                    title="复制整条日志">
                复制
            </button>
        </span>
    </div>
</template>

<style scoped>
.log-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    background-color: #161b22;
    border-radius: 4px;
    font-size: 0.9em;
}

.log-time,
.log-level,
.log-source,
.log-tag {
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 3px;
}

.log-time:hover,
.log-level:hover,
.log-source:hover,
.log-tag:hover {
    background-color: #21262d;
}

.log-level {
    font-weight: bold;
    text-transform: uppercase;
}

.log-level.info { color: #58a6ff; }
.log-level.warn { color: #e3b341; }
.log-level.error { color: #f85149; }
.log-level.debug { color: #8b949e; }

.log-source {
    color: #8b949e;
}

.log-tags {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
}

.log-tag {
    background-color: #21262d;
    color: #7ee787;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 0.85em;
}

.log-tag:hover {
    background-color: #30363d;
}

.log-actions {
    margin-left: auto;
}

.mini-button {
    padding: 2px 6px;
    font-size: 0.85em;
    background-color: #21262d;
    border: 1px solid #30363d;
    border-radius: 3px;
    color: #c9d1d9;
    cursor: pointer;
}

.mini-button:hover {
    background-color: #30363d;
}
</style> 