<template>
  <div id="message" class="b3-snackbars" :class="{ 'b3-snackbars--show': hasMessages }">
    <div class="fn__flex-1" ref="messagesContainer">
      <transition-group name="message">
        <div
          v-for="msg in messages"
          :key="msg.id"
          :data-id="msg.id"
          :data-timeoutid="msg.timeoutId"
          class="b3-snackbar"
          :class="{ 'b3-snackbar--error': msg.type === 'error' }"
        >
          <div 
            data-type="textMenu" 
            class="b3-snackbar__content"
            :class="{ 'b3-snackbar__content--close': msg.timeout === 0 }"
            v-html="msg.content"
          ></div>
          <svg 
            v-if="msg.timeout === 0"
            class="b3-snackbar__close" 
            @click="hideMessage(msg.id)"
          >
            <use xlink:href="#iconCloseRound"></use>
          </svg>
        </div>
      </transition-group>
    </div>
    <button 
      class="b3-button--cancel b3-button b3-tooltips b3-tooltips__w" 
      :aria-label="clearMessageText"
      @click="clearAllMessages"
    >
      <svg style="margin-right: 0">
        <use xlink:href="#iconSelect"></use>
      </svg>
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { genUUID } from '../util/genID';

const props = defineProps({
  constants: {
    type: Object,
    default: () => ({
      TIMEOUT_INPUT: 200,
      SIYUAN_VERSION: '1.0.0'
    })
  },
  clearMessageText: {
    type: String,
    default: '清除消息'
  }
});

const messages = ref([]);
const messagesContainer = ref(null);
const hasMessages = computed(() => messages.value.length > 0);

const showMessage = (message, timeout = 6000, type = 'info', messageId) => {
  const id = messageId || genUUID();
  const messageVersion = message + (type === 'error' ? ' v' + props.constants.SIYUAN_VERSION : '');
  
  // 检查是否已存在相同ID的消息
  const existIndex = messages.value.findIndex(msg => msg.id === id);
  
  if (existIndex !== -1) {
    // 清除现有的定时器
    const existingMsg = messages.value[existIndex];
    if (existingMsg.timeoutId) {
      clearTimeout(existingMsg.timeoutId);
    }
    
    // 更新消息
    messages.value[existIndex] = {
      ...existingMsg,
      content: messageVersion,
      type,
      timeout,
      timeoutId: timeout > 0 ? setTimeout(() => hideMessage(id), timeout) : null
    };
  } else {
    // 创建新消息
    const newMessage = {
      id,
      content: messageVersion,
      type,
      timeout,
      timeoutId: timeout > 0 ? setTimeout(() => hideMessage(id), timeout) : null
    };
    
    // 添加到消息列表
    messages.value.unshift(newMessage);
    
    // 移除重复消息
    const duplicateIndex = messages.value.findIndex((msg, index) => 
      index > 0 && msg.content === messages.value[0].content
    );
    
    if (duplicateIndex !== -1) {
      messages.value.splice(duplicateIndex, 1);
    }
    
    // 滚动到顶部
    if (messagesContainer.value) {
      messagesContainer.value.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }
  
  return id;
};

const hideMessage = (id) => {
  if (id) {
    const index = messages.value.findIndex(msg => msg.id === id);
    if (index !== -1) {
      if (messages.value[index].timeoutId) {
        clearTimeout(messages.value[index].timeoutId);
      }
      messages.value.splice(index, 1);
    }
  }
};

const clearAllMessages = () => {
  // 清除所有定时器
  messages.value.forEach(msg => {
    if (msg.timeoutId) {
      clearTimeout(msg.timeoutId);
    }
  });
  messages.value = [];
};

// 暴露方法供外部调用
defineExpose({
  showMessage,
  hideMessage,
  clearAllMessages
});

onMounted(() => {
  // 监听点击事件，处理关闭消息等操作
  messagesContainer.value.addEventListener('click', (event) => {
    let target = event.target;
    
    while (target && !target.isEqualNode(messagesContainer.value)) {
      if (target.classList.contains('b3-snackbar__close')) {
        hideMessage(target.parentElement.getAttribute('data-id'));
        event.preventDefault();
        break;
      } else if (target.classList.contains('b3-snackbar')) {
        if (getSelection().rangeCount === 0 || !getSelection().getRangeAt(0).toString()) {
          hideMessage(target.getAttribute('data-id'));
        }
        event.preventDefault();
        event.stopPropagation();
        break;
      }
      target = target.parentElement;
    }
  });
});
</script>

<style scoped>
.b3-snackbars {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  overflow: auto;
  padding: 8px;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  z-index: 505;
  transition: opacity 150ms cubic-bezier(0, 0, 0.2, 1) 0ms;
}

.b3-snackbars--show {
  background-color: rgba(0, 0, 0, 0.05);
  pointer-events: auto;
}

.b3-snackbar {
  padding: 8px 16px;
  margin-bottom: 8px;
  border-radius: 4px;
  background-color: #3b3e43;
  color: #fff;
  display: flex;
  align-items: center;
  opacity: 1;
  transition: opacity 0.15s cubic-bezier(0, 0, 0.2, 1);
  animation: fadeIn 0.15s cubic-bezier(0, 0, 0.2, 1);
  box-shadow: 0 3px 5px -1px rgba(0, 0, 0, 0.2), 0 6px 10px 0 rgba(0, 0, 0, 0.14), 0 1px 18px 0 rgba(0, 0, 0, 0.12);
}

.b3-snackbar--error {
  background-color: #d23f31;
}

.b3-snackbar__content {
  flex: 1;
  max-width: 780px;
  line-height: 20px;
  font-size: 14px;
}

.b3-snackbar__content--close {
  margin-right: 16px;
}

.b3-snackbar__close {
  height: 16px;
  width: 16px;
  padding: 0;
  cursor: pointer;
  color: #fff;
}

.message-enter-active,
.message-leave-active {
  transition: opacity 0.15s cubic-bezier(0, 0, 0.2, 1);
}

.message-enter-from,
.message-leave-to {
  opacity: 0;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style> 