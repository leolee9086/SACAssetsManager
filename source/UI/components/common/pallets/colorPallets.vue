<template>
    <div>
        <template v-for="colorItem in pallet">
            <colorPalletButton :colorItem="colorItem"></colorPalletButton>
        </template>
    </div>
</template>
<script setup>
defineProps(['pallet'])
</script>