<template>
  <div class="provider-list fn__flex fn__flex-column" >
    <SearchBar v-model="searchQuery" />
    
    <TagsFilter 
      :tags="availableTags" 
      v-model:selectedTags="selectedTags" 
    />
    
    <div class="providers-wrapper fn__flex-1`">
      <ProviderCard 
        v-for="provider in filteredProviders" 
        :key="provider.id"
        :provider="provider"
        :isActive="selectedProviderId === provider.id"
        @select="selectProvider"
      />
      
      <AddProviderButton @add="addProviderAddress" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import SearchBar from './SearchBar.vue'
import TagsFilter from './TagsFilter.vue'
import ProviderCard from './ProviderCard.vue'
import AddProviderButton from './AddProviderButton.vue'

const props = defineProps({
  providers: {
    type: Array,
    required: true
  },
  selectedProviderId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:selectedProviderId', 'addProvider'])

// 响应式状态
const searchQuery = ref('')
const selectedTags = ref([])

// 计算属性
const availableTags = computed(() => {
  const tagsSet = new Set()
  props.providers.forEach(provider => {
    provider.services.forEach(service => tagsSet.add(service))
  })
  return Array.from(tagsSet)
})

const filteredProviders = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  return props.providers.filter(provider => {
    const matchesSearch = !query ||
      provider.name.toLowerCase().includes(query) ||
      provider.description.toLowerCase().includes(query)

    const matchesTags = selectedTags.value.length === 0 ||
      selectedTags.value.every(tag => provider.services.includes(tag))

    return matchesSearch && matchesTags
  })
})

// 方法
const selectProvider = (providerId) => {
  emit('update:selectedProviderId', 
       props.selectedProviderId === providerId ? '' : providerId)
}

const addProviderAddress = () => {
  emit('addProvider')
}
</script>

