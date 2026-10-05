<script setup lang="ts">
import { computed, ref } from 'vue';
import { LocalPlannerRepository } from '../adapters/local-planner.repository';
import { BrowserPrintAdapter } from '../adapters/browser-print.adapter';
import { validateSuitcase } from '../core/packing-engine';
import type { PlannerRepository } from '../ports/planner-repository.port';
import type { PrintPort } from '../ports/print.port';
import { usePlanner } from './usePlanner';
import SuitcaseForm from './components/SuitcaseForm.vue';
import ItemEditor from './components/ItemEditor.vue';
import ItemList from './components/ItemList.vue';
import PackingProjection from './components/PackingProjection.vue';
import PlanCompare from './components/PlanCompare.vue';
import RiskPanel from './components/RiskPanel.vue';
import PrintSheet from './components/PrintSheet.vue';

const props = defineProps<{ repository?: PlannerRepository; printPort?: PrintPort }>();
const planner = usePlanner({ repository: props.repository ?? new LocalPlannerRepository(window.localStorage), printPort: props.printPort ?? new BrowserPrintAdapter() });
const selectedItem = ref('');
const errors = computed(() => validateSuitcase(planner.state.suitcase));
</script>

<template>
  <div class="app-shell">
    <header class="topbar"><div class="brand"><span class="brand-mark">PACK<br><b>WISE</b></span><div><small>TRAVEL LAB / 004</small><h1>行李箱空间规划师</h1></div></div><div class="header-actions"><span :class="{ stale: planner.isStale.value }">{{ planner.isStale.value ? '方案待更新' : '规划已同步' }}</span><button type="button" data-testid="print-button" @click="planner.print">打印清单</button><button type="button" class="primary" :disabled="errors.length > 0" @click="planner.regenerate">智能装箱 ↗</button></div></header>
    <main>
      <section class="hero"><div><small>SPACE, WEIGHT & PRIORITY</small><h2>把每一寸空间，<em>留给真正重要的。</em></h2><p>输入清单，比较三种策略，在出发前看清重量、空间与风险。</p></div><div class="hero-stamp"><b>{{ planner.state.items.length }}</b><span>ITEMS<br>TO PACK</span></div></section>
      <PlanCompare :plans="planner.plans.value" :selected="planner.state.selectedPlan" :suitcase="planner.state.suitcase" @select="planner.selectPlan" />
      <div class="workspace">
        <aside class="left-column">
          <SuitcaseForm :suitcase="planner.state.suitcase" :errors="errors" @update="planner.updateSuitcase" />
          <section class="panel inventory"><div class="section-title"><div><span>02 / INVENTORY</span><h2>待装物品</h2></div><b>{{ planner.state.items.length }} 件</b></div><ItemEditor @add="planner.addItem" /><ItemList :items="planner.state.items" @remove="planner.removeItem" @toggle="(id, mustHave) => planner.updateItem(id, { mustHave })" /></section>
        </aside>
        <section class="right-column">
          <div class="canvas-panel"><div class="canvas-head"><div><span>03 / PACKING MAP</span><h2>{{ planner.currentPlan.value.name }}摆放方案</h2></div><div class="metrics"><span><b>{{ Math.round(planner.currentPlan.value.capacityRatio * 100) }}%</b>空间利用</span><span><b>{{ planner.currentPlan.value.totalWeight.toFixed(1) }}</b>kg 已装</span><span><b>{{ planner.currentPlan.value.unplaced.length }}</b>件未装</span></div></div><div class="projections"><PackingProjection view="top" :plan="planner.currentPlan.value" :suitcase="planner.state.suitcase" :items="planner.state.items" :selected-id="selectedItem" @select="selectedItem = $event" /><PackingProjection view="side" :plan="planner.currentPlan.value" :suitcase="planner.state.suitcase" :items="planner.state.items" :selected-id="selectedItem" @select="selectedItem = $event" /></div><p class="canvas-note">点击色块可在两个视图中同步定位物品。摆放坐标以箱体左下后角为原点。</p></div>
          <RiskPanel :risks="planner.risks.value" />
        </section>
      </div>
      <p class="notice" aria-live="polite">{{ planner.notice.value }}</p>
    </main>
    <PrintSheet :suitcase="planner.state.suitcase" :items="planner.state.items" :plan="planner.currentPlan.value" :risks="planner.risks.value" />
  </div>
</template>
