<template>
    <div class="protyle-breadcrumb">
        <div class="protyle-breadcrumb__bar protyle-breadcrumb__bar--nowrap">
            <span class="protyle-breadcrumb__item protyle-breadcrumb__item--active">
                <svg class="popover__block">
                    <use xlink:href="#iconTags"></use>
                </svg>
                {{ props.tagLabel }}
            </span>
        </div>
    </div>
</template>
<script setup>
import { ref } from 'vue'
const props=defineProps({
    tagLabel:String
})

</script>