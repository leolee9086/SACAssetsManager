<template>
  <div class="text-input-control">
    <span>{{ label }}</span>
    <input type="text" :value="inputValue" @input="handleInput" class="b3-text-field" :placeholder="placeholder" />
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
    width: 200,
    height: 30,
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
    default: '文本'
  },
  placeholder: {
    type: String,
    default: '请输入...'
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
.text-input-control {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.b3-text-field {
  flex: 1;
  min-width: 100px;
}
</style> 