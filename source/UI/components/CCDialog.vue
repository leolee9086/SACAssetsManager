<template>
  <template v-if="dialogMounted">
    <teleport :to="dialogElement">
      <slot :close="handleClose"></slot>
    </teleport>
  </template>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { Dialog } from '../../fromThirdParty/siyuanClient/runtime.js';

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  width: {
    type: String,
    default: '320px'
  },
  height: {
    type: String,
    default: '180px'
  },
  visible: {
    type: Boolean,
    default: false
  },
  mask: {
    type: Boolean,
    default: true
  },
  transparent: {
    type: Boolean,
    default: false
  },
  disableClose: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:visible', 'error', 'close']);

const dialog = ref(null);
const dialogElement = ref(null);
const dialogMounted = ref(false);

// 处理关闭事件
const handleClose = () => {
  emit('update:visible', false);
  emit('close');
};

// 监听属性变化
watch(() => props.title, (newTitle) => {
  if (dialog.value) {
    dialog.value.element.querySelector('.b3-dialog__header').textContent = newTitle;
  }
});

// 先声明这两个函数
const destroyDialog = () => {
  if (dialog.value) {
    dialog.value.destroy();
    dialog.value = null;
    dialogElement.value = null;
    dialogMounted.value = false;
  }
};

const createDialog = () => {
  try {
    dialog.value = new Dialog({
      title: props.title,
      content: '<div class="dialog-content"></div>',
      width: props.width,
      height: props.height,
      transparent: props.transparent,
      disableClose: props.disableClose,
      mask: props.mask,
      destroyCallback: () => {
        handleClose();
      }
    });
    
    dialogElement.value = dialog.value.element.querySelector('.dialog-content');
    if (!dialogElement.value) {
      throw new Error('Dialog content element not found');
    }
    
    dialogMounted.value = true;

    // 添加拖拽功能
    const header = dialog.value.element.querySelector('.b3-dialog__header');
    if (header) {
      makeDraggable(header, dialog.value.element);
    }
    
  } catch (error) {
    emit('error', error);
    console.error('Failed to create dialog:', error);
  }
};

// 添加拖拽相关函数
const makeDraggable = (handle, element) => {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  
  const dragMouseDown = (e) => {
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  };

  const elementDrag = (e) => {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
  };

  const closeDragElement = () => {
    document.onmouseup = null;
    document.onmousemove = null;
  };

  handle.onmousedown = dragMouseDown;
};

// 然后再使用这些函数
watch(() => props.visible, (visible) => {
  if (visible) {
    createDialog();
  } else {
    destroyDialog();
  }
}, { immediate: true });

onMounted(() => {
  if (props.visible) {
    createDialog();
  }
});

onBeforeUnmount(() => {
  if (dialog.value) {
    dialog.value.destroy();
  }
});

// 暴露方法给父组件
defineExpose({
  dialog,
  show: () => {
    if (dialog.value) {
      dialog.value.element.classList.remove('fn__none');
    }
  },
  hide: () => {
    if (dialog.value) {
      dialog.value.element.classList.add('fn__none');
    }
  },
  setTitle: (newTitle) => {
    if (dialog.value) {
      dialog.value.element.querySelector('.b3-dialog__header').textContent = newTitle;
    }
  },
  center: () => {
    if (dialog.value) {
      const element = dialog.value.element;
      element.style.top = `${(window.innerHeight - element.offsetHeight) / 2}px`;
      element.style.left = `${(window.innerWidth - element.offsetWidth) / 2}px`;
    }
  }
});
</script> 