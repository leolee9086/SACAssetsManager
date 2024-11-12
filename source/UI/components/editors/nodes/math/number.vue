<template>
  <div class="number-control">
    <span>{{ label }}</span>
    <input type="range" :min="min" :max="max" :value="inputValue" @input="handleInput" class="b3-slider fn__block" />
    <input type="number" :value="inputValue" @input="handleInput" class="b3-text-field size30"/>
    <span v-if="unit">{{ unit }}</span>
  </div>
</template>
<script nodeDefine>
import { ref } from 'vue';
const inputValue = ref(80)
const outputNumber = ref(80)
//这个函数可以在定义函数模式下没有执行时输入时的输入
export const getDefaultInput=()=>{
  return outputNumber
}
const nodeDefine = {
  geom: {
    size: 'fixed',
    width: 200,
    height: 30,
  },
  type:'start',
  outputs: {
    "number": {
      type: "number",
      default: 80,
      side:'right'
    }
  },
  process(input) {
    outputNumber.value=(input.value||input)
    return {
      number:input.value||input
    }
  }
}
</script>
<script setup>
import { defineProps, defineEmits,watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Number,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  min: {
    type: Number,
    default: 1
  },
  max: {
    type: Number,
    default: 100
  },
  unit: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue']);
watch(outputNumber,()=>{
  if(outputNumber.value!==inputValue.value){
    inputValue.value = outputNumber.value
  }
})
const handleInput = (e) => {
  const value = Number(e.target.value);
  if (value >= props.min && value <= props.max) {
    nodeDefine.process({value})
  }
};
</script>
<style scoped>
.number-control {
  display: flex;
  align-items: center;
  gap: 8px;
  margin:0
}

.slider-input {
  flex: 1;
}
.size30{
  width: 50px;

}
.number-input {
  width: 60px;
  padding: 4px;
  text-align: center;
}
</style>