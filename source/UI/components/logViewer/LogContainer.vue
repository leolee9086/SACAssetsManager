<!-- 
  日志容器组件
  处理日志列表的显示、滚动和加载更多功能
-->
<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import LogEntry from '../logEntry.vue';
import { 获取元素ID } from './logUtils.js';

const props = defineProps({
  日志列表: {
    type: Array,
    required: true
  },
  可以加载更多: {
    type: Boolean,
    default: false
  },
  正在加载更多: {
    type: Boolean,
    default: false
  },
  显示时间戳: {
    type: Boolean,
    default: true
  },
  显示级别: {
    type: Boolean,
    default: true
  },
  自动滚动: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits([
  '更新自动滚动状态',
  '加载更多日志',
  '复制内容',
  '设置标签过滤',
  '打开图片',
  '图片加载失败'
]);

// 日志容器引用
const 日志容器 = ref(null);
const 最近一次滚动时间 = ref(0);

// 处理滚动事件
const 处理滚动事件 = (事件) => {
  // 节流处理，避免频繁触发
  const 当前时间 = Date.now();
  if (当前时间 - 最近一次滚动时间.value < 100) return;
  最近一次滚动时间.value = 当前时间;
  
  if (!日志容器.value) return;
  
  // 检测是否滚动到顶部附近，如果是，则加载更多日志
  if (日志容器.value.scrollTop < 50 && props.可以加载更多 && !props.正在加载更多) {
    // 记录当前滚动位置
    const 当前滚动高度 = 日志容器.value.scrollHeight;
    
    // 异步加载更多日志
    emit('加载更多日志', 当前滚动高度);
  }
  
  // 检测是否滚动到底部，用于设置自动滚动状态
  const 接近底部 = 日志容器.value.scrollHeight - 日志容器.value.scrollTop - 日志容器.value.clientHeight < 50;
  emit('更新自动滚动状态', 接近底部);
};

// 加载更多日志
const 加载更多日志 = () => {
  if (props.可以加载更多 && !props.正在加载更多) {
    emit('加载更多日志');
  }
};

// 当自动滚动启用且日志列表变化时滚动到底部
watch(
  () => [props.日志列表.length, props.自动滚动],
  ([日志数量, 自动滚动状态]) => {
    if (自动滚动状态 && 日志容器.value) {
      nextTick(() => {
        日志容器.value.scrollTop = 日志容器.value.scrollHeight;
      });
    }
  }
);

// 当正在加载更多状态变化后，处理滚动位置
watch(
  () => props.正在加载更多,
  (新值, 旧值) => {
    if (旧值 && !新值 && 日志容器.value) {
      // 如果停止加载更多，调整滚动位置防止跳动
      nextTick(() => {
        if (日志容器.value._保存的滚动高度) {
          const 新滚动高度 = 日志容器.value.scrollHeight;
          const 高度差 = 新滚动高度 - 日志容器.value._保存的滚动高度;
          日志容器.value.scrollTop = 高度差 > 0 ? 高度差 + 50 : 50;
          日志容器.value._保存的滚动高度 = null;
        }
      });
    }
  }
);

// 转发事件
const 复制内容 = (内容, 标识, 事件, 日志) => {
  emit('复制内容', 内容, 标识, 事件, 日志);
};

const 设置标签过滤 = (标签) => {
  emit('设置标签过滤', 标签);
};

const 打开图片 = (url) => {
  emit('打开图片', url);
};

const 图片加载失败 = (事件, 日志) => {
  emit('图片加载失败', 事件, 日志);
};

// 设置滚动保存点
defineExpose({
  设置滚动保存点: (高度) => {
    if (日志容器.value) {
      日志容器.value._保存的滚动高度 = 高度;
    }
  },
  滚动到底部: () => {
    if (日志容器.value) {
      日志容器.value.scrollTop = 日志容器.value.scrollHeight;
    }
  }
});
</script>

<template>
  <div class="log-container" ref="日志容器" @scroll="处理滚动事件">
    <div v-if="props.正在加载更多" class="log-loading">
      正在加载日志...
    </div>
    
    <!-- 无日志提示 -->
    <div v-if="日志列表.length === 0" class="no-logs-message">
      暂无日志记录
    </div>
    
    <!-- 日志列表 -->
    <LogEntry v-for="日志 in 日志列表"
             :key="获取元素ID(日志)"
             :日志="日志"
             :显示时间戳="props.显示时间戳"
             :显示级别="props.显示级别"
             @复制内容="复制内容"
             @设置标签过滤="设置标签过滤"
             @打开图片="打开图片"
             @图片加载失败="图片加载失败" />
    
    <div v-if="props.可以加载更多" class="log-more">
      <button @click="加载更多日志">加载更早的日志</button>
    </div>
  </div>
</template>

<style scoped>
.log-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  position: relative;
}

.log-loading {
  text-align: center;
  padding: 16px;
  color: #8b949e;
}

.no-logs-message {
  text-align: center;
  padding: 32px;
  color: #8b949e;
  font-style: italic;
}

.log-more {
  text-align: center;
  padding: 16px;
}

.log-more button {
  padding: 8px 16px;
  background-color: #21262d;
  border: 1px solid #30363d;
  border-radius: 4px;
  color: #c9d1d9;
  cursor: pointer;
}

.log-more button:hover {
  background-color: #30363d;
}
</style> 