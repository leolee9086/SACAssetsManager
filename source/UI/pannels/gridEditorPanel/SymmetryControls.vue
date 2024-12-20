<template>
    <div class="control-section">
        <div class="fn__flex fn__flex-1">
            <h4>对称类型</h4>
            <div class="fn__flex-1"></div>

            <div class="control-group">
                <select :value="modelValue" @change="handleSymmetryChange">
                    <option v-for="group in symmetryGroups" :key="group.value" :value="group.value">
                        {{ group.label }}
                    </option>
                </select>
            </div>

        </div>
    </div>
</template>

<script setup>
const symmetryGroups = [
    { value: 'p1', label: 'P1 - 基本平移' },
    { value: 'p2', label: 'P2 - 2次旋转' },
    { value: 'pg', label: 'PG - 滑移' },
    { value: 'pm', label: 'PM - 镜像' },
    { value: 'pgg', label: 'PGG - 双滑移' },
    { value: 'pmm', label: 'PMM - 双向镜像' },
    { value: 'pmg', label: 'PMG - 镜像+滑移' },
    { value: 'p4', label: 'P4 - 4次旋转' },
    { value: 'p4m', label: 'P4M - 4次旋转+镜像' },
    { value: 'p4g', label: 'P4G - 4次旋转+镜像(变体)' },
    { value: 'cm', label: 'CM - 菱形中心镜像' },
    { value: 'cmm', label: 'CMM - 菱形双向镜像' },
    { value: 'p3', label: 'P3 - 3次旋转' },
    { value: 'p3m1', label: 'P3M1 - 3次旋转+镜像' },
    { value: 'p6', label: 'P6 - 6次旋转' },
    { value: 'p6m', label: 'P6M - 6次旋转+镜像' },
    { value: 'p31m', label: 'P31M - 三重旋转+镜像' }
]

defineProps({
    modelValue: {
        type: String,
        required: true
    }
})

const emit = defineEmits(['update:modelValue'])

const handleSymmetryChange = (event) => {
    emit('update:modelValue', event.target.value)
}
</script>