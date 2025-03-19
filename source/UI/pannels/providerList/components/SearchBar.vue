<template>
    <div :class="containerClass || 'fn__flex'">

            <div class="b3-form__icon">
                <svg v-if="showIcon" :class="iconClass || 'b3-form__icon-icon'">
                    <use :xlink:href="iconName"></use>
                </svg>
            </div>
            <input type="text" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)"
                :class="inputClass || 'b3-text-field fn__block b3-form__icon-input'" :placeholder="placeholder">
    </div>
</template>

<script setup>
defineProps({
    modelValue: String,
    placeholder: {
        type: String,
        default: '搜索'
    },
    showIcon: {
        type: Boolean,
        default: true
    },
    iconName: {
        type: String,
        default: '#iconSearch'
    },
    containerClass: String,
    iconClass: String,
    inputClass: String
})

defineEmits(['update:modelValue'])
</script>
