<!-- 
  通知组件
  用于显示临时操作反馈消息
-->
<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  message: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    default: 2000
  },
  visible: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);

// 状态
const 显示 = ref(props.visible);
const 计时器 = ref(null);

// 监视消息变化
const 显示消息 = (消息, 持续时间 = props.duration) => {
  // 清除之前的计时器
  if (计时器.value) {
    clearTimeout(计时器.value);
  }
  
  显示.value = true;
  
  // 设置新计时器
  计时器.value = setTimeout(() => {
    显示.value = false;
    emit('close');
  }, 持续时间);
};

// 在组件挂载时如果有消息则显示
onMounted(() => {
  if (props.message && props.visible) {
    显示消息(props.message);
  }
});

// 在组件卸载前清除计时器
onBeforeUnmount(() => {
  if (计时器.value) {
    clearTimeout(计时器.value);
  }
});

// 监听visible属性变化
watch(() => props.visible, (新值) => {
  if (新值 && props.message) {
    显示消息(props.message);
  } else if (!新值) {
    显示.value = false;
  }
});

// 监听message属性变化
watch(() => props.message, (新值) => {
  if (新值 && props.visible) {
    显示消息(新值);
  }
});

// 导出方法给父组件
defineExpose({
  显示消息
});
</script>

<template>
  <Transition name="notification">
    <div v-if="显示" class="notification">
      {{ props.message }}
    </div>
  </Transition>
</template>

<style scoped>
.notification {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #21262d;
  border: 1px solid #30363d;
  border-radius: 4px;
  padding: 8px 16px;
  color: #c9d1d9;
  font-size: 14px;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.notification-enter-active,
.notification-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.notification-enter-from,
.notification-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}
</style> 