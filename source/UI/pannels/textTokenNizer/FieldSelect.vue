<template>
  <select v-model="selectedField" class="field-select">
    <option value="">名称</option>
    <option v-for="field in fields" :key="field.name" :value="field.name">
      {{ field.name }}
    </option>
    <option value="subquery">子查询</option>
  </select>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: String,
  fields: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:modelValue']);

const selectedField = ref(props.modelValue);

watch(selectedField, (newValue) => {
  emit('update:modelValue', newValue);
});
</script> 