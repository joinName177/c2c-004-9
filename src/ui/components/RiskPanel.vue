<script setup lang="ts">
import type { Risk } from '../../core/models';
defineProps<{ risks: Risk[]; stale?: boolean }>();
</script>

<template><aside class="risk-panel" :class="{ stale }"><div class="section-title"><div><span>RISK SCAN</span><h2>装箱风险</h2><em v-if="stale" class="stale-tag">待更新 · 按上次数据评估</em></div><b>{{ risks.filter(r => r.severity !== 'info').length }}</b></div><article v-for="risk in risks" :key="risk.id" :class="['risk-row', risk.severity]"><i>{{ risk.severity === 'critical' ? '!' : risk.severity === 'warning' ? '△' : '✓' }}</i><div><strong>{{ risk.title }}</strong><p>{{ risk.message }}</p></div></article></aside></template>
