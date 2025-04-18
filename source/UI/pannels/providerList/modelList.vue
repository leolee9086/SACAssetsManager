<template>
  <div class="model-list">
    <div class="fixed-header">
      <div class="search-container">
        <input 
          type="text" 
          v-model="searchQuery" 
          class="search-input b3-text-field fn__block b3-form__icon-input"
          placeholder="搜索模型..."
        >
      </div>
      <TagsFilter 
        :tags="availableTags" 
        v-model:selectedTags="selectedTags" 
        title="标签筛选："
      />
    </div>
    
    <div class="scrollable-content">
      <SCard 
        v-for="model in filteredModels" 
        :key="model.id"
        class="model-card-container"
        hoverable
      >
        <template #image>
          <div class="model-avatar">
            <img 
              :src="model.avatar" 
              :alt="model.name"
              @error="handleImageError($event, model.name)"
              ref="modelImage"
            >
          </div>
        </template>
        
        <div class="card-content">
          <div class="model-info">
            <div class="model-name">{{ model.name }}</div>
            <div class="model-creator">{{ model.creator }} · {{ model.type }}</div>
          </div>
          <div class="model-description">{{ model.description }}</div>
        </div>
        
        <template #actions>
          <div class="card-footer">
            <div class="tags">
              <span class="tag" v-for="tag in model.tags" :key="tag">{{ tag }}</span>
            </div>
            <div class="stats">
              <span class="stat-item">{{ model.likes }}K</span>
              <span class="stat-item">{{ model.downloads }}K</span>
            </div>
          </div>
        </template>
      </SCard>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import SCard from '../../../shared/siyuanUI-vue/components/SCard.vue'
import TagsFilter from './components/TagsFilter.vue'
import { modelList as 硅基流动模型列表 } from '../../../../assets/modelProviders/modelCards/硅基流动.js'
import { providerList } from '../../../../assets/modelProviders/index.js'
import { generateTextAvatar } from '../../../../src/toolBox/feature/useSvg/forSvgGeneration.js'

const props = defineProps({
  providerId: {
    type: String,
    default: ''
  }
})

const models = ref([])
const searchQuery = ref('')
const selectedTags = ref([])

const availableTags = computed(() => {
  const tagsSet = new Set()
  models.value.forEach(model => {
    model.tags.forEach(tag => tagsSet.add(tag))
  })
  return Array.from(tagsSet)
})

const filteredModels = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  return models.value.filter(model => {
    // 搜索词过滤
    const matchesSearch = !query || 
      model.name.toLowerCase().includes(query) ||
      model.description.toLowerCase().includes(query)
    
    // 标签过滤
    const matchesTags = selectedTags.value.length === 0 || 
      selectedTags.value.every(tag => model.tags.includes(tag))
    
    return matchesSearch && matchesTags
  })
})

const loadModels = () => {
  console.error(props.providerId)
  if (!props.providerId) {
    models.value = 硅基流动模型列表 // 默认显示硅基流动的模型
    return
  }
  console.error(models.value,providerList)

  const provider = providerList.find(p => p.id === props.providerId)
  console.error(models.value,provider)

  if (provider && provider.modelList) {
    console.error(providerList)

    // 动态导入对应供应商的模型列表
    import(`../../../../assets/modelProviders/${provider.modelList}`).then(module => {
      models.value = module.modelList
      console.error(models.value)
    }).catch(err => {
      console.error('加载模型列表失败:', err)
      models.value = []
    })
  } else {
    models.value = []
  }
}

watch(() => props.providerId, () => {
  loadModels()
}, { immediate: true })

onMounted(() => {
  loadModels()
})

// 处理图片加载错误
const handleImageError = (event, modelName) => {
  event.target.src = generateTextAvatar(modelName)
  // 防止循环触发错误
  event.target.onerror = null
}
</script>

<style scoped>
.model-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.fixed-header {
  padding: 16px 16px 0;
  background-color: white;
  z-index: 10;
}

.scrollable-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 16px;
}

.model-card-container {
  margin-bottom: 16px;
}

.card-content {
  padding: 0 16px;
}

.model-avatar {
  width: 100%;
  height: 120px;
  overflow: hidden;
}

.model-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.model-info {
  margin-top: 12px;
  margin-bottom: 8px;
}

.model-name {
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 4px;
}

.model-creator {
  color: #666;
  font-size: 14px;
}

.model-description {
  color: #333;
  font-size: 14px;
  margin-bottom: 12px;
  line-height: 1.5;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
}

.tags {
  display: flex;
  gap: 8px;
}

.tag {
  background: #f0f0f0;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
}

.stats {
  display: flex;
  gap: 12px;
}

.stat-item {
  color: #666;
  font-size: 14px;
}

.search-container {
  margin-bottom: 16px;
}

.search-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
}

.search-input:focus {
  border-color: #666;
}

.tags-filter {
  margin-bottom: 16px;
}

.tags-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-tag {
  background: #f0f0f0;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-tag:hover {
  background: #e0e0e0;
}

.filter-tag.active {
  background: #666;
  color: white;
}
</style>
