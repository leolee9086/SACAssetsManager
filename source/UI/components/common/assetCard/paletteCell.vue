<template>
    <div :style="`border: 1px solid var(--b3-theme-background-light);
    display: 'grid';
                    width:${width};
                    min-width:${width};
                    max-width:${width};
                    height:${height};
                    min-height:${height};
                    max-height:${height};

    gridTemplateColumns: 'repeat(auto-fill, minmax(16px, 1fr))';
`">
        <template v-for="colorItem in pallet" :key="colorItem.color">
            <colorPalletButton :colorItem="colorItem"></colorPalletButton>
        </template>
    </div>
</template>

<script setup>
import { onMounted, ref, toRef } from 'vue';
import colorPalletButton from '../pallets/colorPalletButton.vue';
import { getAssetItemColor } from '../../../../data/attributies/getAsyncAttributes.js';
const props = defineProps(['pallet', 'cardData', 'width', 'height']);
const { cardData } = props
const width = toRef(props, 'width')
const height = toRef(props, 'height')

const pallet = ref([])
onMounted(
    () => {
        getAssetItemColor(cardData.data).then(
            () => { pallet.value = cardData.data.colorPllet })
    }
)

</script>