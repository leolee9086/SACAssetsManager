<template>
  <div class="status__counter">
    <span class="ft__on-surface">{{ languages.runeCount }}</span>&nbsp;{{ stat.runeCount }}<span class="fn__space"></span>
    <span class="ft__on-surface">{{ languages.wordCount }}</span>&nbsp;{{ stat.wordCount }}<span class="fn__space"></span>
    <template v-if="stat.linkCount > 0">
      <span class="ft__on-surface">{{ languages.linkCount }}</span>&nbsp;{{ stat.linkCount }}<span class="fn__space"></span>
    </template>
    <template v-if="stat.imageCount > 0">
      <span class="ft__on-surface">{{ languages.imgCount }}</span>&nbsp;{{ stat.imageCount }}<span class="fn__space"></span>
    </template>
    <template v-if="stat.refCount > 0">
      <span class="ft__on-surface">{{ languages.refCount }}</span>&nbsp;{{ stat.refCount }}<span class="fn__space"></span>
    </template>
  </div>
</template>

<script setup>
const props = defineProps({
  stat: {
    type: Object,
    default: () => ({
      runeCount: 0,
      wordCount: 0,
      linkCount: 0,
      imageCount: 0,
      refCount: 0
    })
  },
  languages: {
    type: Object,
    required: true
  }
});
</script>

<style scoped>
.counter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 10px;
  background-color: var(--b3-theme-primary);
  color: var(--b3-theme-on-primary);
  font-size: 12px;
  line-height: 1;
}
</style> 