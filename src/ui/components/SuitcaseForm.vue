<script setup lang="ts">
import type { Suitcase } from '../../core/models';
defineProps<{ suitcase: Suitcase; errors: string[] }>();
const emit = defineEmits<{ update: [patch: Partial<Suitcase>] }>();
</script>

<template>
  <section class="panel suitcase-form">
    <div class="section-title"><div><span>01 / SUITCASE</span><h2>行李箱配置</h2></div><b>内部尺寸</b></div>
    <div class="dimension-grid">
      <label>长度 <span>CM</span><input aria-label="行李箱长度" type="number" min="1" :value="suitcase.length" @input="emit('update', { length: Number(($event.target as HTMLInputElement).value) })" /></label>
      <i>×</i>
      <label>宽度 <span>CM</span><input aria-label="行李箱宽度" type="number" min="1" :value="suitcase.width" @input="emit('update', { width: Number(($event.target as HTMLInputElement).value) })" /></label>
      <i>×</i>
      <label>高度 <span>CM</span><input aria-label="行李箱高度" type="number" min="1" :value="suitcase.height" @input="emit('update', { height: Number(($event.target as HTMLInputElement).value) })" /></label>
    </div>
    <label class="weight-field">最大承重 <span>{{ suitcase.maxWeight }} kg</span><input type="range" min="1" max="35" step="0.5" :value="suitcase.maxWeight" @input="emit('update', { maxWeight: Number(($event.target as HTMLInputElement).value) })" /></label>
    <p v-for="error in errors" :key="error" class="field-error">{{ error }}</p>
  </section>
</template>
