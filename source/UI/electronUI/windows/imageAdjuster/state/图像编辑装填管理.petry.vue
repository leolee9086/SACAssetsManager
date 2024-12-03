<template type="colored-timed" extensions="[color, time, priority, inhibitor, reset]">
    <!-- 基础流转 -->
    <flow>
        <!-- 状态转换 -->
        <arc :from="空闲" :to="从空闲进入堆栈" p-guard="!系统忙碌" />
        <arc :from="从空闲进入堆栈" :to="堆栈" />

        <arc :from="堆栈" :to="退出堆栈" />
        <arc :from="退出堆栈" :to="空闲" />
    </flow>

    <!-- 工具控制流 -->
    <flow>
        <arc :from="编辑工具可用" :to="选择工具" p-weight="1" />

        <!-- 使用p-when代替多个arc -->
        <arc :from="选择工具" :to="工具" p-when="tool in ['透视工具', '裁剪工具', '缩放工具']" />

        <!-- 使用p-inhibitor替代type="inhibitor" -->
        <template v-for="tool in ['透视工具', '裁剪工具', '缩放工具']">
            <arc p-inhibitor :from="工具" :to="选择工具" />

        </template>
    </flow>

    <!-- 自动保存流 -->
    <flow>
        <arc :from="操作计数器" :to="自动保存" p-weight="5" />
        <arc :from="自动保存" :to="空闲" />
        <arc :from="自动保存" :to="操作计数器" />
    </flow>

    <!-- 超时处理流 -->
    <flow>
        <arc :from="操作超时" :to="系统忙碌" p-time="3000" />
    </flow>

    <!-- 历史记录流 -->
    <flow>
        <arc :from="编辑历史" :to="记录操作" p-color="历史记录" />
        <arc :from="记录操作" :to="编辑历史" p-color="历史记录" />
    </flow>

    <!-- 系统控制流 -->
    <flow>
        <!-- 使用p-reset替代type="reset" -->
        <arc p-reset :from="系统忙碌" :to="工具" p-when="tool in ['透视工具', '裁剪工具', '缩放工具']" />

        <!-- 使用p-inhibitor替代type="inhibitor" -->
        <arc p-inhibitor :from="系统忙碌" :to="从空闲进入堆栈" />

        <arc p-inhibitor :from="系统忙碌" :to="选择工具" />
    </flow>
</template>
<script setup>
import { ref } from 'vue'
const env = {
    editorMode: '编辑',
    tools: [
        {
            name: "画笔工具",
            visiable: true,
            disabled: false
        }
    ]
}
// 库所定义 - 自动转换为place标签
// content代表状态的具体值,target代表状态迁移目标
const 空闲 = {
    type: 'basic',
    initial: 1,
    capacity: 1,
    content: [
        {
            value: '空闲',
            target: env.editorMode
        }
    ]
}
//没有type就表示basic,没有声明容量代表1
const 画笔工具禁用并隐藏 = {
    content: [
        {
            target: env.tools.find(tool => tool.name === '画笔工具'),
            value: {
                visiable: false,
                disabled: true
            }
        }
    ]
}
const 堆栈 = { type: 'stack', initial: 0, capacity: 1 }
const 编辑工具可用 = { type: 'basic', initial: 1, capacity: 1 }
const 操作计数器 = { type: 'counter', initial: 0, capacity: 5 }
const 编辑历史 = {
    type: 'color',
    color: '历史记录',
    initial: 0,
    capacity: Infinity
}
const 系统忙碌 = { type: 'basic', initial: 0, capacity: 1 }

// 工具库所
const 透视工具 = { type: 'basic', use: 'clone' }
const 裁剪工具 = { type: 'basic', use: 'clone' }
const 缩放工具 = { type: 'basic', use: 'clone' }

// 转换定义 - 所有函数自动转换为迁移,统一使用from和to作为输入,没有输出,只是表示从某一个状态到另一个状态转换过程中需要做什么
const 从空闲进入堆栈 = (from, to) => {
    priority: 2
    // 实现细节
}

const 退出堆栈 = () => {
    priority: 2
    // 实现细节
}

const 选择工具 = (tool) => {
    priority: 2
    color: '工具类型'
    trans: () => { }
}

const 自动保存 = () => {
    priority: 1
    time: 5000
    // 实现细节
}

const 操作超时 = () => {
    priority: 3
    time: 3000
    // 实现细节
}

const 记录操作 = (operation) => {
    priority: 1
    color: '历史记录'
    // 实现细节
}

// 颜色集定义
const ColorSets = {
    历史记录: {
        操作类型: ['缩放', '裁剪', '透视'],
        参数: 'list<real>',
        时间戳: 'time'
    },
    工具类型: ['透视', '裁剪', '缩放']
}

export const petriNet = usePetriNet()
</script>
