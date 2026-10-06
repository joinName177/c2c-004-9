<script setup lang="ts">
import type { PackingPlan, PlanMode, Suitcase } from '../../core/models';
defineProps<{ plans: Record<PlanMode, PackingPlan>; selected: PlanMode; suitcase: Suitcase; stale?: boolean }>();
const emit = defineEmits<{ select: [mode: PlanMode] }>();
</script>

<template>
  <div class="plan-tabs" :class="{ stale }" data-testid="plan-compare">
    <span v-if="stale" class="tabs-stale-tag">待更新 · 展示上次计算结果</span>
    <button v-for="plan in plans" :key="plan.id" type="button" :data-plan="plan.id" :class="{ active: plan.id === selected }" @click="emit('select', plan.id)">
      <span>{{ plan.id === 'minimal' ? 'LIGHT' : plan.id === 'comfort' ? 'BALANCED' : 'RESERVE' }}</span>
      <strong>{{ plan.name }}</strong>
      <small>{{ plan.placements.length }} 件 · {{ Math.round(plan.capacityRatio * 100) }}% 空间 · {{ plan.totalWeight.toFixed(1) }}/{{ suitcase.maxWeight }}kg</small>
    </button>
  </div>
</template>
