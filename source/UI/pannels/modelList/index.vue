<template>
  <div class="provider-list">
    <div class="search-container">
      <input 
        type="text" 
        v-model="searchQuery" 
        class="search-input"
        placeholder="搜索供应商..."
      >
    </div>
    <div class="tags-filter">
      <div class="tags-title">服务类型：</div>
      <div class="filter-tags">
        <span 
          v-for="tag in availableTags" 
          :key="tag"
          :class="['filter-tag', { active: selectedTags.includes(tag) }]"
          @click="toggleTag(tag)"
        >
          {{ tag }}
        </span>
      </div>
    </div>
    <div class="provider-card" v-for="provider in filteredProviders" :key="provider.id" @click="selectProvider(provider.id)">
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
        </span>
      </div>

      <div class="provider-links">
        <a v-for="(url, type) in provider.links" 
           :key="type" 
           :href="url" 
           target="_blank"
           class="link-item"
        >
          <i :class="`icon-${type}`"></i>
          {{ getLinkText(type) }}
        </a>
      </div>

      <div class="card-footer">
        <div class="tags">
          <span class="tag" v-for="tag in provider.services" :key="tag">{{ tag }}</span>
        </div>
      </div>

      <div class="expand-indicator" v-if="selectedProviderId === provider.id">
        <i class="icon-up"></i>
      </div>
    </div>

    <transition name="slide">
      <model-list
        v-if="selectedProviderId"
        :provider-id="selectedProviderId"
        class="provider-models"
      />
    </transition>
  </div>
</template>

<script>
import { providerList } from '../../../../assets/modelProviders/index.js'
import ModelList from './modelList.vue'

export default {
  name: 'ProviderList',
  components: {
    ModelList
  },
  data() {
    return {
      providers: providerList,
      searchQuery: '',
      selectedTags: [],
      selectedProviderId: ''
    }
  },
  computed: {
    availableTags() {
      const tagsSet = new Set()
      this.providers.forEach(provider => {
        provider.services.forEach(service => tagsSet.add(service))
      })
      return Array.from(tagsSet)
    },
    filteredProviders() {
      const query = this.searchQuery.toLowerCase().trim()
      return this.providers.filter(provider => {
        const matchesSearch = !query || 
          provider.name.toLowerCase().includes(query) ||
          provider.description.toLowerCase().includes(query)
        
        const matchesTags = this.selectedTags.length === 0 || 
          this.selectedTags.every(tag => provider.services.includes(tag))
        
        return matchesSearch && matchesTags
      })
    }
  },
  methods: {
    toggleTag(tag) {
      const index = this.selectedTags.indexOf(tag)
      if (index === -1) {
        this.selectedTags.push(tag)
      } else {
        this.selectedTags.splice(index, 1)
      }
    },
    getLinkText(type) {
      const textMap = {
        homepage: '官网',
        console: '控制台',
        docs: '文档',
        pricing: '价格',
        github: 'GitHub'
      }
      return textMap[type] || type
    },
    selectProvider(providerId) {
      this.selectedProviderId = this.selectedProviderId === providerId ? '' : providerId
    }
  }
}
</script>

<style scoped>
.provider-list {
  padding: 16px;
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

.icon-homepage { color: #1890ff; }
.icon-console { color: #722ed1; }
.icon-docs { color: #13c2c2; }
.icon-pricing { color: #52c41a; }
.icon-github { color: #333; }

.search-container,
.search-input,
.tags-filter,
.tags-title,
.filter-tags,
.filter-tag,
.card-footer,
.tags,
.tag,
.stats,
.stat-item {
  /* 与 modelList.vue 相同的样式 */
}

.filter-tag:hover {
  background: #e0e0e0;
}

.filter-tag.active {
  background: #666;
  color: white;
}

.provider-models {
  margin-top: -16px;
  margin-bottom: 16px;
  border: 1px solid #eee;
  border-top: none;
  border-radius: 0 0 8px 8px;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.expand-indicator {
  text-align: center;
  margin-top: 8px;
  color: #666;
}
</style>
