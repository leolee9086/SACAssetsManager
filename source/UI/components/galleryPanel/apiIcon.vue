<template>
<span >
    <svg  class="icon-green icon-overlay"
        :style="{
            width: '20px',
            height: '20px',
            color: props.apiEnabled ? 'rgb(253, 128, 0)' : 'red'
        }
            ">
        <use xlink:href="#iconSearch"></use>
    </svg>
    {{ dataModel }}
</span>
</template>
<script setup>
const props = defineProps(['apiEnabled','apiLocation'])
</script>