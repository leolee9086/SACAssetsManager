<template>
    <button @click.right.stop.prevent="() => { filterColor = []; refreshPanel() }" ref="palletButton"
        @click.left="swapPallet" :style="{
            padding: 0,
            margin: 0,
            width: 24 + 'px',
            height: 24 + 'px',
            backgroundColor: filterColor.length ? `rgb(${filterColor.join(',')})` : ''
        }">
        <svg style="width:24px;height:24px;">
            <use xlink:href="#iconColorPannel"></use>
        </svg>
    </button>
</template>
<script setup>
    import { ref, defineModel } from 'vue'
    const showPallet=ref('showPallet')
    //实现showPallet的v-model
     defineModel('showPallet', {
        get() {
            return showPallet.value
        },
        set(value) {
            showPallet.value = value
            emit('update:showPallet', showPallet.value)
        }
    })
</script>
