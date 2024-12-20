<template>
  <div 
    class="layer-item" 
    :class="itemClasses"
    :style="layerStyle"
    @click="$emit('select', layer)"
  >
    <LayerIndent 
      :depth="layer.state?.depth"
      v-if="layer.state?.depth > 0"
    />
    
    <div class="layer-item-content">
      <LayerExpandButton 
        v-if="layer.state?.isGroup"
        :expanded="layer.state?.expanded"
        @toggle="$emit('toggle-expand', layer)"
      />

      <LayerVisibilityButton 
        :visible="layer.state?.visible"
        @toggle="$emit('toggle-visibility', layer)"
      />

      <LayerName :name="layer.meta?.name" />

      <LayerActions 
        :layer="layer"
        @add-child="$emit('add-child', $event)"
        @remove="$emit('remove', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import LayerIndent from './LayerIndent.vue'
import LayerExpandButton from './LayerExpandButton.vue'
import LayerVisibilityButton from './LayerVisibilityButton.vue'
import LayerName from './LayerName.vue'
import LayerActions from './LayerActions.vue'

const props = defineProps({
  layer: {
    type: Object,
    required: true
  },
  activeLayerId: {
    type: Number,
    required: true
  }
})

defineEmits([
  'select',
  'toggle-expand',
  'toggle-visibility',
  'add-child',
  'remove'
])

const itemClasses = computed(() => ({
  'is-active': props.layer.id === props.activeLayerId,
  'is-group': props.layer.state?.isGroup
}))

const layerStyle = computed(() => ({
  marginLeft: `${props.layer.state?.depth * 20}px`
}))
</script>

<style scoped>
.layer-item {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 32px;
  margin: 2px 0;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.layer-item-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: var(--layer-bg, rgba(255, 255, 255, 0.03));
}

.layer-item:hover .layer-item-content {
  background-color: var(--layer-hover-bg, rgba(255, 255, 255, 0.05));
}

.is-active .layer-item-content {
  background-color: var(--layer-active-bg, rgba(26, 115, 232, 0.1));
}

.is-group .layer-item-content {
  font-weight: 500;
  background-color: var(--group-layer-bg, rgba(255, 255, 255, 0.05));
}

.is-group:hover .layer-item-content {
  background-color: var(--group-layer-hover-bg, rgba(255, 255, 255, 0.08));
}

.is-group.is-active .layer-item-content {
  background-color: var(--group-layer-active-bg, rgba(26, 115, 232, 0.15));
}
</style>