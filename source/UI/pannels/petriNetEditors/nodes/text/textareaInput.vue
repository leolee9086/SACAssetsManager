<template>
  <div class="textarea-input-control">
    <div class="input-label">{{ label }}</div>
    <textarea 
      :value="inputValue" 
      @input="handleInput" 
      class="b3-text-field textarea" 
      :placeholder="placeholder"
      :rows="rows"
    ></textarea>
  </div>
</template>

<script nodeDefine>
import { ref } from 'vue';
const inputValue = ref('')
const outputText = ref('')

//这个函数可以在定义函数模式下没有执行时输入时的输入
export const getDefaultInput=()=>{
  return outputText
}

const nodeDefine = {
  geom: {
    size: 'fixed',
    width: 250,
    height: 180,
  },
  type:'start',
  outputs: {
    "text": {
      type: "string",
      default: '',
      side:'right'
    }
  },
  process(input) {
    outputText.value=(input.value || input)
    return {
      text: input.value || input
    }
  }
}
</script>

<script setup>
import { defineProps, defineEmits, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: '多行文本'
  },
  placeholder: {
    type: String,
    default: '请输入...'
  },
  rows: {
    type: Number,
    default: 8
  }
});

const emit = defineEmits(['update:modelValue']);

watch(outputText, () => {
  if(outputText.value !== inputValue.value){
    inputValue.value = outputText.value
  }
})

const handleInput = (e) => {
  const value = e.target.value;
  nodeDefine.process({value})
};
</script>

<style scoped>
.textarea-input-control {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  height: 100%;
  width: 100%;
  padding: 8px;
}

.input-label {
  font-size: 14px;
  color: var(--b3-theme-on-surface);
}

.textarea {
  flex: 1;
  resize: none;
  width: 100%;
  font-family: var(--b3-font-family);
  border: 1px solid var(--b3-border-color);
  border-radius: 4px;
  padding: 8px;
}
</style> 