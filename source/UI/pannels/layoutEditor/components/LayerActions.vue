<template>
  <div class="layer-item-actions">
    <button 
      v-if="layer.state?.isGroup" 
      @click.stop="$emit('add-child', layer.id)" 
      title="添加子图层"
    >
      <svg width="16" height="16">
        <use href="#iconAddChild" />
      </svg>
    </button>
    <button 
      v-if="layer.id !== 1" 
      @click.stop="$emit('remove', layer.id)" 
      title="删除"
    >
      <svg width="16" height="16">
        <use href="#iconDelete" />
      </svg>
    </button>
  </div>
</template>

<script setup>
defineProps({
  layer: {
    type: Object,
    required: true
  }
})
</script> 