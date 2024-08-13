<template>
    <div class="block__icons">
        <div class="block__logo">
            <svg class="block__logoicon">
                <use :xlink:href="data.icon"></use>
            </svg>{{ data.title }}
        </div>
        <span class="fn__flex-1"></span>
        <template v-for="(item,i) in data.titleActions" :key="`icon_${i}_item.label`">
            <span class="fn__space"></span>
            <span 
            class="block__icon b3-tooltips b3-tooltips__sw" 
            @click="(e)=>item.click(e,item)"
            :aria-label="item.label"
            >
                <svg >
                    <use :xlink:href="item.icon"></use>
                </svg>
            </span>
        </template>
    </div>
</template>
<script setup>
import { ref,toRef } from 'vue'
const props = defineProps({
    data:Object
})
const data = toRef(props.data)

</script>