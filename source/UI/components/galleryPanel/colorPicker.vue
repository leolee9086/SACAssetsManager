<template>
    <div class="fn__flex" style="margin:auto">
      <button 
        ref="palletButton"
        @click.right.stop.prevent="clearColor"
        @click.left="togglePallet"
        class="cc-panel-toolbar-button"
      >
        <svg class="panel-toolbar-button-icon" :style="iconStyle">
          <use xlink:href="#iconColors"></use>
        </svg>
      </button>
      
      <div v-if="showPallet" 
        class="grid__container"
        :style="palletStyle"
      >
        <template v-for="color in pallet">
          <div 
            @click="selectColor(color)"
            :style="getColorStyle(color)"
          />
        </template>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed } from 'vue'
  
  const props = defineProps({
    modelValue: Array,
    pallet: Array
  })
  
  const emit = defineEmits(['update:modelValue'])
  
  const showPallet = ref(false)
  const palletButton = ref(null)
  
  const iconStyle = computed(() => ({
    color: props.modelValue.length ? 
      `rgb(${props.modelValue.join(',')})` : ''
  }))
  
  const palletStyle = computed(() => ({
    position: 'absolute',
    top: `${palletButton.value?.offsetTop + palletButton.value?.offsetHeight + 10}px`,
    left: `${palletButton.value?.offsetLeft - 100}px`,
    width: '200px',
    maxHeight: '300px',
    background: 'var(--b3-menu-background)',
    height: '300px',
    overflow: 'auto',
    zIndex: 10
  }))
  
  const clearColor = () => {
    emit('update:modelValue', [])
  }
  
  const togglePallet = () => {
    showPallet.value = !showPallet.value
  }
  
  const selectColor = (color) => {
    emit('update:modelValue', color)
    showPallet.value = false
  }
  
  const getColorStyle = (color) => ({
    backgroundColor: `rgb(${color.join(',')})`,
    height: '36px',
    width: '36px',
    display: 'inline-block',
    margin: '0 2px'
  })
  </script>
  
