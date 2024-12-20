<template>
  <div class="list-wrapper">
    <NestedDirective 
      v-if="Array.isArray(modelValue)"
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
      class="w-full"
    >
      <template #item="{ item, isCollapsed, onToggle }">
        <div 
          class="layer-item"
          :class="{ 'is-selected': item === selectedLayer }"
          @click="handleLayerSelect(item)"
        >
          <span 
            v-if="item.type === 'folder'"
            class="icon folder"
            :class="{ 'is-collapsed': isCollapsed }"
            @click.stop="onToggle"
          >📁</span>
          <span v-else class="icon" :class="item.layerType">
            {{ getLayerIcon(item.layerType) }}
          </span>
          
          <span class="layer-name">{{ item.name }}</span>
          
          <div class="layer-controls">
            <button 
              class="control-btn"
              :class="{ 'is-active': item.visible }"
              @click.stop="toggleVisibility(item)"
            >
              {{ item.visible ? '👁️' : '👁️‍🗨️' }}
            </button>
            <button 
              class="control-btn"
              :class="{ 'is-active': item.locked }"
              @click.stop="toggleLock(item)"
            >
              {{ item.locked ? '🔒' : '🔓' }}
            </button>
          </div>
        </div>
      </template>
    </NestedDirective>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'
import NestedDirective from '../NestedDirective.vue'

const props = defineProps({
  modelValue: {
    type: Array,
    required: true,
    default: () => []
  },
  selectedLayer: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'select'])

const getLayerIcon = (layerType: string) => {
  const icons = {
    text: '📝',
    image: '🖼️',
    rect: '⬜',
    grid: '📏'
  }
  return icons[layerType] || '⚈'
}

const handleLayerSelect = (layer: any) => {
  if (layer.type === 'folder') return
  emit('select', layer)
}

const toggleVisibility = (item: any) => {
  item.visible = !item.visible
  emit('update:modelValue', [...props.modelValue])
}

const toggleLock = (item: any) => {
  item.locked = !item.locked
  emit('update:modelValue', [...props.modelValue])
}
</script>

<style scoped>
.list-wrapper {
  width: 280px;
  min-width: 280px;
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 4px;
  cursor: pointer;
}

.layer-item.is-selected {
  background: var(--cc-theme-primary-lighter);
}

.icon {
  font-size: 14px;
  cursor: pointer;
}

.icon.folder {
  transition: transform 0.2s ease;
}

.icon.folder.is-collapsed {
  transform: rotate(-90deg);
}

.layer-name {
  flex: 1;
  font-size: 14px;
  color: var(--cc-theme-on-background);
}

.layer-controls {
  display: flex;
  gap: 4px;
}

.control-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  font-size: 12px;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.control-btn:hover {
  opacity: 1;
}

.control-btn.is-active {
  opacity: 1;
}
</style>
