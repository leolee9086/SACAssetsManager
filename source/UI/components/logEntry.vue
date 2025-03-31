<!-- 日志条目组件 -->
<script setup>
import { computed } from 'vue'
import LogMeta from './logMeta.vue'
import LogContent from './logContent.vue'

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

const emit = defineEmits(['复制内容', '设置标签过滤', '打开图片', '图片加载失败'])

// 获取唯一的元素ID
const 获取元素ID = (日志) => {
    if (!日志._elId) {
        日志._elId = Date.now().toString(36).slice(-4) + Math.random().toString(36).substring(2, 4);
    }
    return 日志._elId;
};

// 处理复制内容事件
const 处理复制内容 = (内容, 标识, 事件) => {
    emit('复制内容', 内容, 标识, 事件, props.日志);
};

// 处理图片加载失败事件
const 处理图片加载失败 = (事件, 日志) => {
    emit('图片加载失败', 事件, props.日志);
};
</script>

<template>
    <div class="log-entry"
         :class="[日志.级别, 日志.包含图片 ? 'with-image' : '', 日志.包含结构化数据 ? 'with-structured-data' : '']">
        <LogMeta :日志="日志"
                 :显示时间戳="显示时间戳"
                 :显示级别="显示级别"
                 @复制内容="处理复制内容"
                 @设置标签过滤="$emit('设置标签过滤', $event)" />
        
        <LogContent :日志="日志"
                    @复制内容="处理复制内容"
                    @打开图片="$emit('打开图片', $event)"
                    @图片加载失败="处理图片加载失败" />
    </div>
</template>

<style scoped>
.log-entry {
    margin: 4px 0;
    padding: 4px;
    border-radius: 4px;
    background-color: #0d1117;
    border: 1px solid #30363d;
}

.log-entry:hover {
    border-color: #58a6ff;
}

.log-entry.info { border-left: 3px solid #58a6ff; }
.log-entry.warn { border-left: 3px solid #e3b341; }
.log-entry.error { border-left: 3px solid #f85149; }
.log-entry.debug { border-left: 3px solid #8b949e; }

.log-entry.with-image {
    background-color: #161b22;
}

.log-entry.with-structured-data {
    background-color: #161b22;
}
</style> 