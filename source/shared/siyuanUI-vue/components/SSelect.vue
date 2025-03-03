<template>
  <div class="b3-form__icon" v-if="icon">
    <svg class="b3-form__icon-icon"><use :xlink:href="`#icon${icon}`"></use></svg>
    <select 
      :id="id"
      class="b3-select b3-form__icon-input fn__block"
      :class="{ 'fn__flex-center': center, 'fn__size200': size200 }"
      :value="modelValue"
      @change="$emit('update:modelValue', $event.target.value)"
      :disabled="disabled"
    >
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
  </div>
  <select 
    :id="id"
    v-else
    class="b3-select fn__block"
    :class="[center ? 'fn__flex-center' : '', size ? `fn__size${size}` : '']"
    :value="modelValue"
    @change="handleChange"
    :disabled="disabled"
    :style="{ minWidth: minWidth }"
  >
    <slot></slot>
  </select>
</template>

<script setup>
const props = defineProps({
  options: {
    type: Array,
    required: true
  },
  modelValue: {
    type: [String, Number],
    default: ''
  },
  id: {
    type: String,
    default: ''
  },
  center: {
    type: Boolean,
    default: true
  },
  size: {
    type: [String, Number],
    default: 200
  },
  disabled: {
    type: Boolean,
    default: false
  },
  icon: {
    type: String,
    default: ''
  },
  block: {
    type: Boolean,
    default: false
  },
  size200: {
    type: Boolean,
    default: false
  },
  minWidth: {
    type: String,
    default: '200px'
  },
  selectClass: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const handleChange = (event) => {
  emit('update:modelValue', event.target.value);
  emit('change', event.target.value);
};
</script>

<style scoped>
/* 基础样式会从思源的CSS中继承 */
</style>
