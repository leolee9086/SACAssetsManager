<template>
    <div class="list-wrapper">
      <NestedDirective 
        v-if="Array.isArray(props.modelValue)"
        v-model="props.modelValue"
        class="w-full"
        @update:modelValue="handleLayerUpdate"
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
              <button 
                class="control-btn"
                @click.stop="deleteLayer(item)"
              >
                🗑️
              </button>
            </div>
          </div>
        </template>
      </NestedDirective>
    </div>
    
</template>

<script setup lang="ts">
import { defineProps, defineEmits, ref } from 'vue'
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

const emit = defineEmits(['update:modelValue', 'select', 'add', 'delete'])

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
}

const toggleLock = (item: any) => {
  item.locked = !item.locked
}

const deleteLayer = (layer: any) => {
  emit('delete', layer)
}

const handleLayerUpdate = (newValue: any[]) => {
  emit('update:modelValue', newValue)
}




</script>

<style scoped>
.layer-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 280px;
  min-width: 280px;
}


.layer-gallery {
  padding: var(--cc-space-sm);
  background: var(--cc-theme-surface-lighter);
}

.gallery-title {
  font-size: 14px;
  color: var(--cc-theme-on-background-muted);
  margin-bottom: var(--cc-space-sm);
  padding-left: var(--cc-space-xs);
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--cc-space-sm);
}

.gallery-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--cc-space-sm);
  background: var(--cc-theme-surface);
  border: 1px solid var(--cc-border-color);
  border-radius: var(--cc-border-radius);
  cursor: move;
  transition: all 0.2s ease;
}

.gallery-item:hover {
  background: var(--cc-theme-surface-hover);
  transform: translateY(-2px);
}

.item-icon {
  font-size: 24px;
  margin-bottom: var(--cc-space-xs);
}

.item-name {
  font-size: 12px;
  color: var(--cc-theme-on-background);
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
