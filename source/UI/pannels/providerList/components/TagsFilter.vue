<template>
  <div class="tags-filter">
    <div class="tags-title">服务类型：</div>
    <div class="filter-tags">
      <span 
        v-for="tag in tags" 
        :key="tag" 
        :class="['filter-tag', { active: selectedTags.includes(tag) }]"
        @click="toggleTag(tag)"
      >
        {{ tag }}
      </span>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  tags: {
    type: Array,
    default: () => []
  },
  selectedTags: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:selectedTags'])

const toggleTag = (tag) => {
  const currentTags = [...props.selectedTags]
  const index = currentTags.indexOf(tag)
  
  if (index === -1) {
    currentTags.push(tag)
  } else {
    currentTags.splice(index, 1)
  }
  
  emit('update:selectedTags', currentTags)
}
</script>

<style scoped>
.tags-filter {
  margin-bottom: 16px;
}

.tags-title {
  font-weight: bold;
  margin-bottom: 8px;
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-tag {
  background: #f0f0f0;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
}

.filter-tag:hover {
  background: #e0e0e0;
}

.filter-tag.active {
  background: #666;
  color: white;
}
</style> 