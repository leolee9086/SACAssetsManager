<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';

// 响应式状态
const 日志列表 = ref([]);
const 最大日志数 = ref(1000);
const 自动滚动 = ref(true);
const 过滤级别 = ref('all');
const 搜索文本 = ref('');
const 日志容器 = ref(null);

// 计算属性
const 过滤后的日志 = computed(() => {
  return 日志列表.value.filter(日志 => {
    const 匹配级别 = 过滤级别.value === 'all' || 日志.级别 === 过滤级别.value;
    const 匹配搜索 = !搜索文本.value || 
      日志.内容.toLowerCase().includes(搜索文本.value.toLowerCase()) ||
      日志.时间.toLowerCase().includes(搜索文本.value.toLowerCase());
    return 匹配级别 && 匹配搜索;
  });
});

// 方法
const 添加日志 = (日志) => {
  日志列表.value.push({
    ...日志,
    时间: new Date().toLocaleTimeString(),
    id: Date.now() + Math.random()
  });
  
  // 保持日志数量在限制内
  if (日志列表.value.length > 最大日志数.value) {
    日志列表.value = 日志列表.value.slice(-最大日志数.value);
  }
  
  // 自动滚动到底部
  if (自动滚动.value) {
    nextTick(() => {
      const 容器 = 日志容器.value;
      if (容器) {
        容器.scrollTop = 容器.scrollHeight;
      }
    });
  }
};

const 清空日志 = () => {
  日志列表.value = [];
};

const 切换自动滚动 = () => {
  自动滚动.value = !自动滚动.value;
};

// 生命周期钩子
onMounted(() => {
  // 监听来自父组件的日志事件
  window.addEventListener('log-message', (事件) => {
    添加日志(事件.detail);
  });
});

onUnmounted(() => {
  window.removeEventListener('log-message', (事件) => {
    添加日志(事件.detail);
  });
});

// 导出方法供父组件使用
defineExpose({
  添加日志,
  清空日志
});
</script>

<template>
  <div class="log-viewer">
    <!-- 控制面板 -->
    <div class="log-controls">
      <div class="control-group">
        <label>
          日志级别:
          <select v-model="过滤级别">
            <option value="all">全部</option>
            <option value="info">信息</option>
            <option value="warn">警告</option>
            <option value="error">错误</option>
          </select>
        </label>
        <label>
          最大日志数:
          <input type="number" v-model="最大日志数" min="100" max="10000" step="100">
        </label>
      </div>
      
      <div class="control-group">
        <input 
          type="text" 
          v-model="搜索文本" 
          placeholder="搜索日志..."
          class="search-input"
        >
        <button @click="清空日志" class="clear-btn">清空日志</button>
        <button 
          @click="切换自动滚动" 
          :class="['auto-scroll-btn', { active: 自动滚动 }]"
        >
          自动滚动
        </button>
      </div>
    </div>

    <!-- 日志容器 -->
    <div ref="日志容器" class="log-container">
      <div 
        v-for="日志 in 过滤后的日志" 
        :key="日志.id"
        :class="['log-entry', 日志.级别]"
      >
        <span class="log-time">{{ 日志.时间 }}</span>
        <span class="log-level">{{ 日志.级别 }}</span>
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
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Consolas', 'Monaco', monospace;
}

.log-controls {
  padding: 10px;
  background: #2d2d2d;
  border-bottom: 1px solid #3d3d3d;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.control-group {
  display: flex;
  gap: 10px;
  align-items: center;
}

.search-input {
  padding: 4px 8px;
  border: 1px solid #3d3d3d;
  border-radius: 4px;
  background: #1e1e1e;
  color: #d4d4d4;
  min-width: 200px;
}

button {
  padding: 4px 8px;
  border: 1px solid #3d3d3d;
  border-radius: 4px;
  background: #2d2d2d;
  color: #d4d4d4;
  cursor: pointer;
  transition: all 0.2s;
}

button:hover {
  background: #3d3d3d;
}

.clear-btn {
  background: #4a1f1f;
}

.clear-btn:hover {
  background: #5a2f2f;
}

.auto-scroll-btn.active {
  background: #1f4a1f;
}

.auto-scroll-btn.active:hover {
  background: #2f5a2f;
}

.log-container {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  font-size: 14px;
  line-height: 1.5;
}

.log-entry {
  padding: 4px 8px;
  margin: 2px 0;
  border-radius: 4px;
  display: flex;
  gap: 8px;
  align-items: baseline;
}

.log-entry:hover {
  background: #2d2d2d;
}

.log-time {
  color: #888;
  font-size: 12px;
  min-width: 80px;
}

.log-level {
  min-width: 60px;
  text-transform: uppercase;
  font-size: 12px;
  font-weight: bold;
}

.log-content {
  flex: 1;
  white-space: pre-wrap;
  word-break: break-word;
}

.info .log-level {
  color: #4CAF50;
}

.warn .log-level {
  color: #FFC107;
}

.error .log-level {
  color: #F44336;
}

/* 滚动条样式 */
.log-container::-webkit-scrollbar {
  width: 8px;
}

.log-container::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.log-container::-webkit-scrollbar-thumb {
  background: #3d3d3d;
  border-radius: 4px;
}

.log-container::-webkit-scrollbar-thumb:hover {
  background: #4d4d4d;
}
</style> 