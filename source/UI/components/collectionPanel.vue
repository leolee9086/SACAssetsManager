<template>
    <div class="fn__flex-column fn__flex-1">
        <collection></collection>
        <tagTree></tagTree>
        <diskInfosTiny></diskInfosTiny>
    </div>
</template>
<script setup>
import diskInfosTiny from './fileSystem/diskInfosTiny.vue';
import collection from './collection/collection.vue';
import tagTree from './tags/tagTree.vue';
</script>
