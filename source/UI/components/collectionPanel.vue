<template>
    <div class="fn__flex-column fn__flex-1">

        <div class="block__icons">
            <div class="block__logo">
                <svg class="block__logoicon">
                    <use xlink:href="#iconFiles"></use>
                </svg>资源收藏夹
            </div>
            <span class="fn__flex-1 fn__space"></span>
            <span data-type="focus" class="block__icon b3-tooltips b3-tooltips__sw" aria-label="定位打开的文档 "><svg>
                    <use xlink:href="#iconFocus"></use>
                </svg></span>
            <span class="fn__space"></span>
            <span data-type="collapse" class="block__icon b3-tooltips b3-tooltips__sw" aria-label="折叠 Ctrl+↑">
                <svg>
                    <use xlink:href="#iconContract"></use>
                </svg>
            </span>
            <div class="fn__space"></div>
            <div data-type="more" class="b3-tooltips b3-tooltips__sw block__icon" aria-label="更多">
                <svg>
                    <use xlink:href="#iconMore"></use>
                </svg>
            </div>
            <span class="fn__space"></span>
            <span data-type="min" class="block__icon b3-tooltips b3-tooltips__sw" aria-label="最小化 Ctrl+W"><svg>
                    <use xlink:href="#iconMin"></use>
                </svg></span>
        </div>
        <div>默认收藏夹</div>
        <template v-for="收藏夹定义 in 默认收藏夹组">
            <div>
                {{ 收藏夹定义.name }}
            </div>
        </template>
        <div>自定义</div>
        <div class="block__icons">
            <div class="block__logo">
                <svg class="block__logoicon">
                    <use xlink:href="#iconFiles"></use>
                </svg>本地磁盘
            </div>
            <span class="fn__flex-1 fn__space"></span>
            <span data-type="focus" class="block__icon b3-tooltips b3-tooltips__sw" aria-label="定位打开的文档 "><svg>
                    <use xlink:href="#iconFocus"></use>
                </svg></span>
            <span class="fn__space"></span>
            <span data-type="collapse" class="block__icon b3-tooltips b3-tooltips__sw" aria-label="折叠 Ctrl+↑">
                <svg>
                    <use xlink:href="#iconContract"></use>
                </svg>
            </span>
            <div class="fn__space"></div>
            <div data-type="more" class="b3-tooltips b3-tooltips__sw block__icon" aria-label="更多">
                <svg>
                    <use xlink:href="#iconMore"></use>
                </svg>
            </div>
            <span class="fn__space"></span>
            <span data-type="min" class="block__icon b3-tooltips b3-tooltips__sw" aria-label="最小化 Ctrl+W"><svg>
                    <use xlink:href="#iconMin"></use>
                </svg></span>
        </div>
        <div class="fn__flex fn__flex-1">
            <div class="fn__flex-column fn__flex-1">
                <template v-for="disk in diskInfos">
                    <div class="disk-info">
                        <div :key="disk.name" class="disk">
                            <div class="disk-header">
                                <span>{{ disk.name }}</span>
                                <span>{{ (disk.total/1024).toFixed(2) }} GB</span>
                            </div>
                            <div class="disk-body">
                                <div class="disk-progress">
                                    <div class="disk-progress-bar" :style="{ width: 100- Math.floor(disk.usedPercentage) + '%' }">
                                        {{100- Math.floor(disk.usedPercentage) + '%' }}
                                    </div>
                                </div>
                                <div class="disk-space">
                                    <span>{{ (disk.free/1024).toFixed(2) }} GB 可用</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { plugin } from 'runtime'
const 默认收藏夹组 = [
    {
        id: '000',
        name: "思源附件引用",
        parent: null,
        ruler: {
            type: 'siyuanSql',
            content: 'select * from assets limit 102400'
        }
    },
    {
        id: '001',
        name: "失效的附件引用",
        parent: '000',
        ruler: '@internal/失效的附件引用.js'
    }
]

const { exec } = window.require('child_process');
const { statfsSync, existsSync } = window.require('fs');

function listLocalDisks() {
    return new Promise((resolve, reject) => {
        let disks = [];
        let diskInfos = []
        const platform = process.platform;
        if (platform === 'win32') {
            // Windows平台
            const command = 'wmic logicaldisk get name';
            exec(command, (error, stdout) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                    reject(error)
                }
                // 获取输出中每个磁盘名称，通常是C:, D: 等
                disks = stdout.split('\n').filter(Boolean).map(disk => disk.trim()).filter(letter => { return existsSync(letter + "/") })
                disks.forEach(disk => {
                    try {
                        let stats = statfsSync(`\\\\.\\${disk}`)
                        stats && diskInfos.push(
                            {
                                name: disk,
                                Filesystem: stats.type,
                                /**MB */
                                total: stats.blocks * stats.bsize / 1024 / 1024,
                                free: stats.bfree * stats.bsize / 1024 / 1024,
                                usedPercentage:stats.bfree/stats.blocks*100
                            }
                        )
                    } catch (e) {
                        console.error(e)
                    }
                });
                resolve(diskInfos)
            });
        } else {
            // Unix-like平台
            const command = 'df -P | tail -n +2';
            exec(command, (error, stdout) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                    reject(error)
                }
                // 获取输出中每个磁盘的设备和挂载点
                const lines = stdout.split('\n');
                lines.forEach(line => {
                    try {
                        const parts = line.split(/\s+/);
                        if (parts.length > 1) {
                            const device = parts[0];
                            disks.push(device);
                            let stats = statfsSync(`/dev/${device}`)
                            stats && diskInfos.push(
                                {
                                    name: device,
                                    Filesystem: stats.type,
                                    /**MB */
                                    total: stats.blocks * stats.bsize / 1024 / 1024,
                                    free: stats.bfree * stats.bsize / 1024 / 1024
                                }
                            )
                        }
                    } catch (e) {
                        console.error(e)
                    }
                });
            });
        }

    })
}
const diskInfos = ref([])
// 调用函数
onMounted(async () => {
    console.log(diskInfos.value)

    diskInfos.value = await listLocalDisks();
    console.log(diskInfos.value)

})
</script>
<style scoped>
.disk-info {
    display: flex;
    flex-wrap: wrap;
    width: 100%;
}

.disk {
    width: 100%;
    margin: 10px;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 5px;
}

.disk-header {
    display: flex;
    justify-content: space-between;
    font-weight: bold;
}

.disk-body {
    margin-top: 10px;
}

.disk-progress {
    width: 100%;
    height: 20px;
    background-color: #f0f0f0;
    border-radius: 5px;
    overflow: hidden;
}

.disk-progress-bar {
    height: 100%;
    background-color: #4caf50;
}

.disk-space {
    margin-top: 5px;
    text-align: right;
}
</style>