<template>
  <div class="url-input-container">
    <input
      v-model="inputValue"
      @keyup.enter="handleEnter"
      @input="handleInput"
      @keydown.down.prevent="navigateSuggestion(1)"
      @keydown.up.prevent="navigateSuggestion(-1)"
      @blur="handleBlur"
      class="url-input"
      placeholder="输入网址"
    />
    <div v-if="showSuggestions" class="suggestions" @mousedown.prevent>
      <div
        v-for="(suggestion, index) in suggestions"
        :key="index"
        :class="['suggestion-item', { active: index === selectedIndex }]"
        @mousedown="selectSuggestion(suggestion)"
        @mouseenter="selectedIndex = index"
      >
        {{ suggestion }}
        <span class="tld-hint">.{{ getTLDFromSuggestion(suggestion) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue', 'enter']);

const inputValue = ref(props.modelValue);
const showSuggestions = ref(false);
const suggestions = ref([]);
const selectedIndex = ref(-1);
const inputTimeout = ref(null);

// 常见域名后缀
const commonTLDs = ['com', 'cn', 'net', 'org', 'io', 'edu', 'gov', 'co', 'uk', 'jp', 'ru', 'de'];

const handleInput = (event) => {
  const value = event.target.value;
  inputValue.value = value; // 仅更新本地值，不触发提交
  
  if (inputTimeout.value) {
    clearTimeout(inputTimeout.value);
  }

  selectedIndex.value = -1;
  
  // 即时验证但不提交
  try {
    new URL(value.includes('://') ? value : 'http://' + value);
    showSuggestions.value = false;
  } catch {
    inputTimeout.value = setTimeout(() => {
      updateSuggestions(value);
    }, 300);
  }
};

// 自定义防抖函数
const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
};

// 使用自定义防抖替换lodash
const updateSuggestions = debounce((value) => {
  const cleanValue = value.replace(/^(https?:\/\/)?(www\.)?/i, '');
  const domainParts = cleanValue.split('.');
  
  if (domainParts.length > 1 && !commonTLDs.includes(domainParts[domainParts.length-1].toLowerCase())) {
    const base = domainParts.slice(0, -1).join('.');
    suggestions.value = commonTLDs.map(tld => `${base}.${tld}`);
    showSuggestions.value = true;
  }
  else if (domainParts.length === 1 && domainParts[0]) {
    suggestions.value = [
      ...commonTLDs.map(tld => `${cleanValue}.${tld}`),
      ...commonTLDs.map(tld => `www.${cleanValue}.${tld}`)
    ];
    showSuggestions.value = true;
  }
}, 300);

const getTLDFromSuggestion = (suggestion) => {
  return suggestion.split('.').pop();
};

const navigateSuggestion = (direction) => {
  if (!showSuggestions.value || suggestions.value.length === 0) return;
  
  const newIndex = selectedIndex.value + direction;
  if (newIndex >= 0 && newIndex < suggestions.value.length) {
    selectedIndex.value = newIndex;
    // 不再自动更新输入框内容
  }
};

const handleBlur = () => {
  // 延迟关闭建议框，以允许点击建议
  setTimeout(() => {
    showSuggestions.value = false;
  }, 200);
};

const handleEnter = () => {
  if (selectedIndex.value >= 0) {
    selectSuggestion(suggestions.value[selectedIndex.value]);
  } else {
    const normalizedUrl = normalizeUrl(inputValue.value);
    if (isValidUrl(normalizedUrl)) {
      // 仅在确认时更新值
      emit('update:modelValue', normalizedUrl);
      emit('enter', normalizedUrl);
    }
  }
  showSuggestions.value = false;
};

const isValidUrl = (urlString) => {
  try {
    new URL(urlString);
    return true;
  } catch (e) {
    return false;
  }
};

const normalizeUrl = (url) => {
  // 保留用户输入的协议
  const hasProtocol = url.startsWith('http://') || url.startsWith('https://');
  
  try {
    const urlObj = new URL(hasProtocol ? url : `https://${url}`);
    // 自动补全www前缀
    if (!urlObj.hostname.startsWith('www.') && urlObj.hostname.split('.').length === 2) {
      urlObj.hostname = `www.${urlObj.hostname}`;
    }
    return urlObj.toString().replace(/\/$/, ''); // 移除末尾斜杠
  } catch {
    return hasProtocol ? url : `https://${url}`;
  }
};

const selectSuggestion = (suggestion) => {
  const normalizedUrl = normalizeUrl(suggestion);
  inputValue.value = normalizedUrl;
  showSuggestions.value = false;
  // 同时触发更新和提交
  emit('update:modelValue', normalizedUrl);
  emit('enter', normalizedUrl);
};

watch(() => props.modelValue, (newVal) => {
  // 仅当外部值变化时同步本地值
  if (newVal !== inputValue.value) {
    inputValue.value = newVal;
  }
});
</script>

<style scoped>
.url-input-container {
  flex: 1;
}

.url-input {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid var(--b3-border-color);
  border-radius: 4px;
  background-color: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
}

.suggestions {
  position: relative;
  margin-top: 4px;
  scrollbar-width: thin;
  scrollbar-color: var(--b3-border-color) transparent;
}

.suggestion-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.9em;
}

.tld-hint {
  color: var(--b3-theme-secondary);
  opacity: 0.7;
}

.suggestions::-webkit-scrollbar {
  width: 6px;
}

.suggestions::-webkit-scrollbar-thumb {
  background-color: var(--b3-border-color);
  border-radius: 3px;
}
</style> 