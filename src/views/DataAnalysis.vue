<script lang='ts' setup>
import { useInfoStore } from '../stores/userStores'

import AdvancedUploader from '../components/AdvancedUploader.vue';

const userInfo = useInfoStore();
</script>

<template>
    <div>
        数据分析
        ????????????

        {{ userInfo.userInfo }}

        <AdvancedUploader/>
    </div>
</template>

<style lang='scss' scoped>

</style>
