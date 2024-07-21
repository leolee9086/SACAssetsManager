<template>
    <li class="b3-list-item b3-list-item--hide-action" :draggable="draggable" :data-type="dataType" :data-path="dataPath">
        <span class="b3-list-item__toggle b3-list-item__toggle--hl">
            <svg class="b3-list-item__arrow">
                <use xlink:href="#iconRight"></use>
            </svg>
        </span>
        <span class="b3-list-item__icon b3-tooltips b3-tooltips__e" :aria-label="iconLabel">{{ icon }}</span>
        <span class="b3-list-item__text">{{ text }}</span>
        <span :data-type="moreType" class="b3-list-item__action b3-tooltips b3-tooltips__w" :aria-label="moreLabel">
            <svg>
                <use xlink:href="#iconMore"></use>
            </svg>
        </span>
        <span :data-type="newType" class="b3-list-item__action b3-tooltips b3-tooltips__w" :aria-label="newLabel">
            <svg>
                <use xlink:href="#iconAdd"></use>
            </svg>
        </span>
    </li>
</template>

<script setup>
import { defineProps } from 'vue';

const props = defineProps({
    draggable: Boolean,
    dataType: String,
    dataPath: String,
    icon: String,
    text: String,
    moreLabel: String,
    newLabel: String,
    iconLabel: {
        type: String,
        default: '修改图标'
    },
    moreType: {
        type: String,
        default: 'more-root'
    },
    newType: {
        type: String,
        default: 'new'
    }
});
</script>