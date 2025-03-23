<template>
    <v-window v-model:isFloating="isFloating" :component-def="myComponent" title="组件窗口" msg="Hello" :count="42"
        @custom-event="handleEvent">

    </v-window>
    <button @click="handleEvent">点击</button>
</template>

<script setup>
import { ref, h } from 'vue';
import VWindow from '../../components/VWindow.vue';

const isFloating = ref(false);

const myComponent = (props) => h('div', props.msg);

const handleEvent = () => {
    isFloating.value = !isFloating.value;
}
</script>