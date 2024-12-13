<template>
<div :key="disk.name" class=" fn__flex fn__flex-1">
    <div class="disk-body-tiny fn__flex-1">
        <div class="disk-progress">
            <div class="disk-header ">
                <span>{{ `${disk.volumeName}(${disk.name})` }}</span>
                <span>{{ (disk.total / 1024).toFixed(2) }} GB</span>
                <span>{{ (disk.free / 1024).toFixed(2) }} GB 可用</span>
            </div>
            <div class="disk-progress-bar"
                :style="{ width: Math.floor(disk.usedPercentage) + '%' }">
                {{ Math.floor(disk.usedPercentage) + '%' }}
            </div>
        </div>
    </div>
</div>
</template>
<script setup>
// 定义 props
const props = defineProps({
  disk: {
    type: Object,
    required: true,
    // 定义磁盘对象的预期结构
    default: () => ({
      name: '',
      volumeName: '',
      total: 0,
      free: 0,
      usedPercentage: 0
    })
  }
})
</script>

<style scoped>
.disk-body-tiny {
  background-color: var(--b3-theme-background);
  border-radius: 4px;
}

.disk-progress {
  width: 100%;
  background-color: var(--b3-theme-background-light);
  border-radius: 4px;
  overflow: hidden;
}

.disk-header {
  display: flex;
  justify-content: space-between;
  padding: 4px 8px;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
}

.disk-progress-bar {
  height: 20px;
  background-color: var(--b3-theme-primary);
  color: white;
  text-align: center;
  line-height: 20px;
  font-size: 12px;
  transition: width 0.3s ease;
}
</style>