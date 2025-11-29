<script lang='ts' setup>
import { useInfoStore } from '../stores/userStores'

const userInfo = useInfoStore();
</script>

<template>
    <div>
        数据分析
        ????????????

        {{ userInfo.userInfo }}
    </div>
</template>

<style lang='scss' scoped>

</style>
