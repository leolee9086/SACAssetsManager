<template>
    <div class="property-editor">
        <div v-for="(value, key) in modelValue" :key="key" class="property-item">
            <label>{{ key }}</label>
            <input type="text" :value="value" @input="updateProperty(key, $event.target.value)">
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    modelValue: {
        type: Object,
        required: true
    }
});

const emit = defineEmits(['update:modelValue']);

const updateProperty = (key, value) => {
    emit('update:modelValue', {
        ...props.modelValue,
        [key]: value
    });
};
</script>