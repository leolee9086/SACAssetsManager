<template>
  <div :class="[ iconPosition ? 'b3-form__icona fn__block' : '', wrapperClass ]">
    <input
      :type="type"
      class="b3-text-field"
      :class="[
        iconPosition ? 'b3-form__icona-input' : '',
        block ? 'fn__block' : '',
        inputClass,
        blockFilter ? 'search__label' : '',
        modelValue ? 'search__input--block' : '',
        size ? `fn__size${size}` : '',
        className,
        { 'b3-text-field--small': small, 'b3-text-field--error': error },
        { 'search__label': search }
      ]"
      :value="modelValue"
      @input="handleInput"
      @change="handleChange"
      @blur="handleBlur"
      @compositionend="handleCompositionEnd"
      :placeholder="placeholder"
      :disabled="disabled"
      :min="min"
      :max="max"
    />
    <slot name="icon">
      <svg v-if="iconPosition" class="b3-form__icona-icon" @click="onIconClick">
        <use :xlink:href="iconName"></use>
      </svg>
    </slot>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  placeholder: {
    type: String,
    default: ''
  },
  small: {
    type: Boolean,
    default: false
  },
  error: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  block: {
    type: Boolean,
    default: false
  },
  iconPosition: {
    type: String,
    default: ''
  },
  iconName: {
    type: String,
    default: ''
  },
  min: {
    type: Number,
    default: null
  },
  max: {
    type: Number,
    default: null
  },
  inputClass: {
    type: String,
    default: ''
  },
  wrapperClass: {
    type: String,
    default: ''
  },
  blockFilter: {
    type: Boolean,
    default: false
  },
  size: {
    type: [String, Number],
    default: ''
  },
  className: {
    type: String,
    default: ''
  },
  search: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'input', 'change', 'blur', 'composition-end', 'icon-click', 'enter']);

const handleInput = (event) => {
  emit('update:modelValue', event.target.value);
  emit('input', event);
};

const handleChange = (event) => {
  emit('change', event);
};

const handleBlur = (event) => {
  emit('blur', event);
};

const handleCompositionEnd = (event) => {
  emit('composition-end', event);
};

const onIconClick = (event) => {
  emit('icon-click', event);
};

const handleKeydown = (event) => {
  if (!event.isComposing && event.key === "Enter") {
    emit('enter', event);
  }
};
</script>

<style scoped>
/* 基础样式会从思源的CSS中继承 */
</style> 