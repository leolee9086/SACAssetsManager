<template>
    <div class="block__icons">
        <div class="block__logo">
            <svg class="block__logoicon">
                <use xlink:href="#iconFiles"></use>
            </svg>资源收藏夹
        </div>
        <span class="fn__flex-1 fn__space"></span>
        <span 
        @click="打开后端控制台"
        data-type="min" class="block__icon b3-tooltips b3-tooltips__sw" aria-label="打开后端控制台 Ctrl+W"><svg>
                <use xlink:href="#iconBug"></use>
            </svg>
        </span>
        <span data-type="min" class="block__icon b3-tooltips b3-tooltips__sw" aria-label="最小化 Ctrl+W"><svg>
                <use xlink:href="#iconMin"></use>
            </svg>
        </span>
    </div>
    <div class="fn__flex">
        <div class="fn__flex fn__flex-column fn__flex-1" style="padding-left:14px;max-height: 30vh;">
            <div>默认收藏夹</div>
            <template v-for="收藏夹定义 in 默认收藏夹组">
                <div class="fn__flex fn__flex-1">
                    <div>
                        {{ 收藏夹定义.name }}
                    </div>
                    <div class="fn__flex fn__flex-1"></div>
                    <div>{{ 收藏夹定义.content ? 收藏夹定义.content.length : 0 }}</div>
                </div>
            </template>
        </div>
    </div>
</template>
<script setup>
import {plugin} from 'runtime'
const 默认收藏夹组 = [
    {
        id: '000',
        name: "全部索引",
        parent: null,
        getter: () => {
            return []
        },
    },
    {
        id: '000',
        name: "思源附件引用",
        parent: null,
        getter: () => {
            return []
        },
        conuter: () => {
            return this.content.length
        }
    },
    {
        id: '001',
        name: "失效的附件引用",
        parent: '000',
        ruler: '@internal/失效的附件引用.js'
    }
]
const 打开后端控制台 = ()=>{
    plugin.eventBus.emit('openDevTools')
}
</script>