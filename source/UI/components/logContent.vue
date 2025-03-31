<!-- 日志内容组件 -->
<script setup>
import { computed } from 'vue'

const props = defineProps({
    日志: {
        type: Object,
        required: true
    }
})

const emit = defineEmits(['复制内容', '打开图片', '图片加载失败'])

// 获取内容字段
const 获取内容字段 = (日志) => {
    if (日志.内容) {
        if (typeof 日志.内容 === 'object' && 日志.内容 !== null) {
            return 日志.内容;
        }
        return 日志.内容;
    }
    
    if (日志.content) {
        if (typeof 日志.content === 'object' && 日志.content !== null) {
            return 日志.content;
        }
        return 日志.content;
    }
    
    return {};
};

// 格式化结构化数据值
const 格式化结构化值 = (值) => {
    if (值 === null) return 'null';
    if (值 === undefined) return 'undefined';
    
    if (typeof 值 === 'object') {
        try {
            return JSON.stringify(值);
        } catch (e) {
            return '[复杂对象]';
        }
    }
    
    if (typeof 值 === 'string' && 值.length > 100) {
        return 值.substring(0, 100) + '...';
    }
    
    return String(值);
};

// 截断长URL
const 截断图片URL = (url) => {
    if (!url) return '';
    
    if (url.startsWith('data:image/')) {
        return '图片数据 (Base64)';
    }
    
    if (url.length > 50) {
        return url.substring(0, 25) + '...' + url.substring(url.length - 25);
    }
    
    return url;
};

// 切换展开元数据
const 切换展开元数据 = () => {
    if (!props.日志.展开元数据) {
        props.日志.展开元数据 = true;
    } else {
        props.日志.展开元数据 = false;
    }
};

// 处理复制内容事件
const 处理复制内容 = (内容, 标识, 事件) => {
    emit('复制内容', 内容, 标识, 事件);
};

// 处理图片加载失败事件
const 处理图片加载失败 = (事件) => {
    emit('图片加载失败', 事件);
};
</script>

<template>
    <div class="log-content-wrapper">
        <!-- 普通文本内容 -->
        <div v-if="!日志.包含图片 && !日志.包含结构化数据" 
             class="log-content" 
             @click="处理复制内容(获取内容字段(日志), '内容', $event)">
            {{ 获取内容字段(日志) }}
        </div>
        
        <!-- 图片内容 -->
        <div v-else-if="日志.包含图片" class="log-content log-image-content">
            <!-- 图片标题和描述 -->
            <div class="image-meta" 
                 @click="处理复制内容(获取内容字段(日志).描述, '描述', $event)">
                <strong>图片</strong>: {{ 获取内容字段(日志).描述 || '' }}
            </div>
            
            <!-- 图片预览 -->
            <div class="image-preview">
                <img v-if="获取内容字段(日志).值" 
                    loading="lazy" 
                    :src="获取内容字段(日志).值" 
                    alt="日志图片"
                    @click="$emit('打开图片', 获取内容字段(日志).值)"
                    @error="处理图片加载失败($event)" />
                <div v-else class="image-error">图片资源不可用</div>
            </div>
            
            <!-- 图片URL（可复制） -->
            <div v-if="获取内容字段(日志).值" 
                 class="image-url" 
                 @click="处理复制内容(获取内容字段(日志).值, '图片URL', $event)">
                <small>{{ 截断图片URL(获取内容字段(日志).值) }}</small>
            </div>
        </div>
        
        <!-- 结构化数据内容 -->
        <div v-else-if="日志.包含结构化数据" class="log-content log-structured-content">
            <!-- 基本内容显示 -->
            <div class="structured-basic" 
                 @click="处理复制内容(获取内容字段(日志), '内容', $event)">
                {{ 获取内容字段(日志) }}
            </div>
            
            <!-- 元数据展开控制 -->
            <div class="structured-meta" @click="切换展开元数据">
                <strong>结构化数据</strong>
                <span class="expander-icon">{{ 日志.展开元数据 ? '▼' : '▶' }}</span>
            </div>
            
            <!-- 元数据内容 -->
            <div v-if="日志.展开元数据 && 日志.元数据" class="structured-data">
                <div v-for="(值, 键) in 日志.元数据" :key="键" class="data-item">
                    <span class="data-key" 
                          @click="处理复制内容(键, '键名', $event)">{{ 键 }}:</span>
                    <span class="data-value" 
                          @click="处理复制内容(值, 键, $event)">
                        {{ 格式化结构化值(值) }}
                    </span>
                </div>
            </div>
        </div>
        
        <!-- 对象内容 (带有格式化显示) -->
        <div v-else-if="typeof 获取内容字段(日志) === 'object' && 获取内容字段(日志) !== null" 
             class="log-content log-object-content">
            <pre @click="处理复制内容(JSON.stringify(获取内容字段(日志), null, 2), '对象内容', $event)">
                {{ JSON.stringify(获取内容字段(日志), null, 2) }}
            </pre>
        </div>
    </div>
</template>

<style scoped>
.log-content-wrapper {
    margin-left: 8px;
    padding-left: 8px;
    border-left: 2px solid #30363d;
}

.log-content {
    white-space: pre-wrap;
    word-break: break-word;
    cursor: pointer;
}

.log-content:hover {
    background-color: #1c2128;
}

/* 结构化数据样式 */
.log-structured-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.structured-basic {
    cursor: pointer;
}

.structured-meta {
    margin-top: 4px;
    padding: 4px 8px;
    background-color: #21262d;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
}

.structured-meta:hover {
    background-color: #30363d;
}

.structured-data {
    margin-top: 4px;
    padding: 8px;
    background-color: #21262d;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.data-item {
    display: flex;
    gap: 8px;
    padding: 2px 0;
    border-bottom: 1px solid #30363d;
}

.data-key {
    font-weight: bold;
    color: #7ee787;
    cursor: pointer;
    min-width: 150px;
}

.data-key:hover {
    text-decoration: underline;
}

.data-value {
    flex: 1;
    cursor: pointer;
}

.data-value:hover {
    background-color: #1c2128;
}

/* 图片日志样式 */
.log-image-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.image-meta {
    cursor: pointer;
}

.image-meta:hover {
    text-decoration: underline;
}

.image-preview {
    margin: 8px 0;
}

.image-preview img {
    max-width: 300px;
    max-height: 200px;
    border-radius: 4px;
    border: 1px solid #30363d;
    cursor: pointer;
}

.image-preview img:hover {
    border-color: #58a6ff;
}

.image-url {
    font-family: monospace;
    padding: 4px;
    background-color: #21262d;
    border-radius: 3px;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.image-url:hover {
    background-color: #30363d;
}

.image-error {
    padding: 8px;
    color: #f85149;
    background-color: rgba(248, 81, 73, 0.1);
    border-radius: 4px;
}

/* 对象内容样式 */
.log-object-content pre {
    margin: 0;
    padding: 8px;
    background-color: #21262d;
    border-radius: 4px;
    overflow: auto;
    max-height: 300px;
}
</style> 