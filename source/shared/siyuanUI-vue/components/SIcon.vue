<template>
  <span class="svg-icon" :class="{ 'svg-icon--small': small }">
    <svg v-if="name">
      <use :xlink:href="`#${name}`"></use>
    </svg>
    <span v-else-if="emoji" class="emoji-icon">{{ renderEmoji }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  name: {
    type: String,
    default: ''
  },
  emoji: {
    type: String,
    default: ''
  },
  small: {
    type: Boolean,
    default: false
  }
});

const renderEmoji = computed(() => {
  if (!props.emoji) return '';
  // 将 Unicode 格式的表情符号转换为显示字符
  if (props.emoji.startsWith('U+')) {
    return String.fromCodePoint(parseInt(props.emoji.replace('U+', ''), 16));
  }
  return props.emoji;
});
</script>

<style scoped>
.svg-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
}

.svg-icon--small {
  width: 14px;
  height: 14px;
}

.svg-icon svg {
  width: 100%;
  height: 100%;
}

.emoji-icon {
  font-size: 16px;
  line-height: 1;
}
</style> 