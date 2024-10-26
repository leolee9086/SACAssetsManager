<template>
    <div :style="`border: 1px solid var(--b3-theme-background-light);
    display: 'grid';
                    width:${width};
                    min-width:${width};
                    max-width:${width};
    gridTemplateColumns: 'repeat(auto-fill, minmax(16px, 1fr))';
`">
        <template v-for="colorItem in pallet" :key="colorItem.color">
            <colorPalletButton :colorItem="colorItem"></colorPalletButton>
        </template>
    </div>
</template>

<script setup>
import {  onMounted, ref, toRef } from 'vue';
import colorPalletButton from '../pallets/colorPalletButton.vue';
import { getAssetItemColor } from '../../../../data/attributies/getAsyncAttributes.js';
const props = defineProps(['pallet', 'cardData', 'width']);
const { cardData } = props
const width = toRef(props, 'width')
const pallet = ref([])
onMounted(
    () => {
       getAssetItemColor(cardData.data).then(
            ()=>{pallet.value=cardData.data.colorPllet})
    }
)

</script>