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
        <div class="fn__flex fn__flex-1">
            <div class="fn__flex fn__flex-column" style="padding-left:14px">
                <div >默认收藏夹</div>
                <template v-for="收藏夹定义 in 默认收藏夹组">
                    <div>
                        {{ 收藏夹定义.name }}
                    </div>
                    <template v-for="资产定义 in 收藏夹定义.content">
                        <div>{{ 资产定义.path }}</div>
                    </template>
                </template>
                <div>自定义1</div>
            </div>
        </div>
        <diskInfosTiny></diskInfosTiny>
    </div>
</template>
<script setup>
import diskInfosTiny from './fileSystem/diskInfosTiny.vue';
const 默认收藏夹组 = [
    {
        id: '000',
        name: "思源附件引用",
        parent: null,
        ruler: {
            type: 'siyuanSql',
            content: 'select * from assets limit 102400'
        },
        content:[
            {
                name:'测试',
                path:'/test'
            }
        ]
    },
    {
        id: '001',
        name: "失效的附件引用",
        parent: '000',
        ruler: '@internal/失效的附件引用.js'
    }
]
</script>
