<template>
  <div 
    class="layout__resize" 
    :class="[
      direction === 'width' ? 'layout__resize--lr' : 'layout__resize--tb',
      { 'layout__resize--active': isResizing }
    ]"
    @mousedown="onMouseDown"
  ></div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  target: {
    type: Object,
    required: true
  },
  direction: {
    type: String,
    default: 'width',
    validator: (value) => ['width', 'height'].includes(value)
  },
  minSize: {
    type: Number,
    default: 200
  },
  maxSize: {
    type: Number,
    default: 800
  }
});

const emit = defineEmits(['resize']);
const isResizing = ref(false);
const lastPosition = ref(0);

const onMouseDown = (event) => {
  event.preventDefault();
  isResizing.value = true;
  
  const isWidth = props.direction === 'width';
  lastPosition.value = isWidth ? event.clientX : event.clientY;
  
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  
  document.body.style.userSelect = 'none';
  document.body.style.cursor = isWidth ? 'col-resize' : 'row-resize';
};

const handleMouseMove = (event) => {
  if (!isResizing.value) return;
  
  const isWidth = props.direction === 'width';
  const currentPosition = isWidth ? event.clientX : event.clientY;
  
  const delta = currentPosition - lastPosition.value;
  lastPosition.value = currentPosition;
  
  emit('resize', delta);
};

const onMouseMove = (event) => {
  handleMouseMove(event);
};

const onMouseUp = () => {
  isResizing.value = false;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
  
  document.body.style.userSelect = '';
  document.body.style.cursor = '';
};
</script>
<style>

.layout__resize--lr {
    min-height: 100%;
}


</style>