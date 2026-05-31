<template>
    <img
        :src='rapidsosUrl'
        :width='size'
        :height='size'
        alt='RapidSOS'
        style='object-fit: contain;'
    >
</template>

<script setup lang='ts'>
const rapidsosUrl = new URL('../RapidSOS.svg', import.meta.url).href;

withDefaults(
    defineProps<{
        size?: number | string;
        stroke?: number | string;
    }>(),
    { size: 24 },
);
</script>
