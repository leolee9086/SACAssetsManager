<template>
  <div class="provider-container">
    <!-- 左侧供应商列表 -->
    <div class="provider-list">
      <div class="search-container">
        <input type="text" v-model="searchQuery" class="search-input" placeholder="搜索供应商...">
      </div>
      <div class="tags-filter">
        <div class="tags-title">服务类型：</div>
        <div class="filter-tags">
          <span v-for="tag in availableTags" :key="tag" :class="['filter-tag', { active: selectedTags.includes(tag) }]"
            @click="toggleTag(tag)">
            {{ tag }}
          </span>
        </div>
      </div>
      <div class="providers-wrapper">
        <div class="provider-card" v-for="provider in filteredProviders" :key="provider.id"
          @click="selectProvider(provider.id)" :class="{ 'provider-card-active': selectedProviderId === provider.id }">
          <div class="card-header">
            <div class="provider-logo">
              <img :src="provider.logo" :alt="provider.name">
            </div>
            <div class="provider-info">
              <div class="provider-name">{{ provider.name }}</div>
              <div class="provider-location">{{ provider.location }} · {{ provider.establishedYear }}</div>
            </div>
            <div class="model-count">
              <span>{{ provider.modelCount }}个模型</span>
            </div>
          </div>
          <div class="provider-description">{{ provider.description }}</div>
          <div class="provider-features">
            <span class="feature-item" v-for="feature in provider.features" :key="feature">
              <i class="icon-check"></i>{{ feature }}
            </span>存储
          </div>
          <div class="provider-links">
            <a v-for="(url, type) in provider.links" :key="type" :href="url" target="_blank" class="link-item">
              <i :class="`icon-${type}`"></i>
              {{ getLinkText(type) }}
            </a>
          </div>
          <div class="card-footer">
            <div class="tags">
              <span class="tag" v-for="tag in provider.services" :key="tag">{{ tag }}</span>
            </div>
          </div>
        </div>
        
        <!-- 添加新供应商按钮 -->
        <div class="add-provider-button" @click="addProviderAddress">
          <span class="add-icon">+</span>
          <span>添加供应商地址</span>
        </div>
      </div>
    </div>

    <!-- 右侧模型列表 -->
    <div class="model-container fn__flex-column" v-if="selectedProviderId">
      <div class="model-header">
        <h2>{{ getSelectedProviderName() }}</h2>

      </div>
      <div class="fn__flex-column">
        <model-list :provider-id="selectedProviderId" class="provider-models" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { providerList } from '../../../../assets/modelProviders/index.js'
import ModelList from './modelList.vue'

// 响应式状态
const providers = ref(providerList)
const searchQuery = ref('')
const selectedTags = ref([])
const selectedProviderId = ref('')

// 计算属性
const availableTags = computed(() => {
  const tagsSet = new Set()
  providers.value.forEach(provider => {
    provider.services.forEach(service => tagsSet.add(service))
  })
  return Array.from(tagsSet)
})

const filteredProviders = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  return providers.value.filter(provider => {
    const matchesSearch = !query ||
      provider.name.toLowerCase().includes(query) ||
      provider.description.toLowerCase().includes(query)

    const matchesTags = selectedTags.value.length === 0 ||
      selectedTags.value.every(tag => provider.services.includes(tag))

    return matchesSearch && matchesTags
  })
})

// 方法
const toggleTag = (tag) => {
  const index = selectedTags.value.indexOf(tag)
  if (index === -1) {
    selectedTags.value.push(tag)
  } else {
    selectedTags.value.splice(index, 1)
  }
}

// 添加供应商地址的方法
const addProviderAddress = () => {
  // 这里实现添加供应商地址的逻辑
  console.log('添加供应商地址')
}

const getLinkText = (type) => {
  const textMap = {
    homepage: '官网',
    console: '控制台',
    docs: '文档',
    pricing: '价格',
    github: 'GitHub'
  }
  return textMap[type] || type
}

const selectProvider = (providerId) => {
  selectedProviderId.value = selectedProviderId.value === providerId ? '' : providerId
}

// 获取当前选中供应商的名称
const getSelectedProviderName = () => {
  const provider = providers.value.find(p => p.id === selectedProviderId.value)
  return provider ? provider.name : ''
}


</script>

<style scoped>
.provider-container {
  display: flex;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.provider-list {
  width: 40%;
  height: 100%;
  border-right: 1px solid #eee;
  display: flex;
  flex-direction: column;
}

.providers-wrapper {
  flex: 1;
  overflow-y: auto;
}

.model-container {
  width: 60%;
  height: 100%;
  overflow-y: auto;
}

.provider-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
  cursor: pointer;
}

.provider-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.provider-card-active {
  border-left: 4px solid #1890ff;
  background-color: #f0f5ff;
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  justify-content: space-between;
}

.provider-logo {
  width: 48px;
  height: 48px;
  margin-right: 12px;
}

.provider-logo img {
  width: 100%;
  height: 100%;
  border-radius: 4px;
  object-fit: contain;
}

.provider-info {
  flex: 1;
  margin-right: 16px;
}

.provider-name {
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 4px;
}

.provider-location {
  color: #666;
  font-size: 14px;
}

.provider-description {
  color: #333;
  font-size: 14px;
  margin-bottom: 12px;
  line-height: 1.5;
}

.provider-features {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 16px 0;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #666;
  background: #f5f5f5;
  padding: 4px 12px;
  border-radius: 4px;
}

.icon-check {
  color: #52c41a;
  font-size: 12px;
}

.provider-links {
  display: flex;
  gap: 16px;
  margin: 16px 0;
  flex-wrap: wrap;
}

.link-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #1890ff;
  text-decoration: none;
  font-size: 14px;
  padding: 6px 12px;
  border-radius: 4px;
  background: #f0f5ff;
  transition: all 0.3s;
}

.link-item:hover {
  background: #e6f7ff;
}

.model-count {
  background: #f0f0f0;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 13px;
  color: #666;
}

[class^="icon-"] {
  font-size: 16px;
}

.icon-homepage {
  color: #1890ff;
}

.icon-console {
  color: #722ed1;
}

.icon-docs {
  color: #13c2c2;
}

.icon-pricing {
  color: #52c41a;
}

.icon-github {
  color: #333;
}


.filter-tag:hover {
  background: #e0e0e0;
}

.filter-tag.active {
  background: #666;
  color: white;
}

.provider-models {
  height: 100%;
}

/* 移除不需要的展开动画 */
.expand-indicator {
  display: none;
}

.model-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}

.model-header h2 {
  font-size: 18px;
  margin: 0;
}

.view-models-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.3s;
}

.view-models-btn:hover {
  background: #40a9ff;
}

.icon-list {
  font-size: 16px;
}

/* 添加供应商按钮样式 */
.add-provider-button {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  cursor: pointer;
  transition: all 0.3s;
  gap: 10px;
}

.add-provider-button:hover {
  background: #e0e0e0;
  border-color: #1890ff;
  color: #1890ff;
}

.add-icon {
  font-size: 20px;
  font-weight: bold;
}
</style>
