<template>
    <div class="fn__flex fn__flex-1">
        <div class="fn__flex-column fn__flex-1">
            <template v-for="disk in diskInfos">
                <div class="disk-info" @click="plugin.eventBus.emit(
        'click-galleryLocalFIleicon',
        disk.name+'/',
    )">
                    <div :key="disk.name" class="disk">
                        <div class="disk-header">
                            <span>{{ disk.name }}</span>
                            <span>{{ (disk.total / 1024).toFixed(2) }} GB</span>
                        </div>
                        <div class="disk-body">
                            <div class="disk-progress">
                                <div class="disk-progress-bar"
                                    :style="{ width: 100 - Math.floor(disk.usedPercentage) + '%' }">
                                    {{ 100 - Math.floor(disk.usedPercentage) + '%' }}
                                </div>
                            </div>
                            <div class="disk-space">
                                <span>{{ (disk.free / 1024).toFixed(2) }} GB 可用</span>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { listLocalDisks } from '../../../data/diskInfo.js';
import {plugin} from 'runtime'
const diskInfos = ref([])
// 调用函数
onMounted(async () => {
    console.log(diskInfos.value)

    diskInfos.value = await listLocalDisks();
    console.log(diskInfos.value)

})
</script>
<style scoped>

</style>