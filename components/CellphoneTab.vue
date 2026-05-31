<template>
    <div class='col-12'>
        <PingForm />
    </div>
</template>

<script setup lang='ts'>
import { defineAsyncComponent } from 'vue';

const PingForm = defineAsyncComponent(
    () => import('./cellphone/PingForm.vue'),
);
</script>
