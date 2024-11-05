<template>


</template>
<script nodeDefine>
export const nodeDefine={
    flowType:'start',
    outputs:(values)=>{
        return  values.map(
            item=>{
                return {...item,type:'any'}
            }
        )
    },
    async process (appData){
        const {meta}=appData
        return Object.entries(meta).map(([key, value]) => ({ name:key, value:value,type:typeof value }));
    }
}
</script>
<script setup>

</script>