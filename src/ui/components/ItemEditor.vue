<script setup lang="ts">
import { reactive } from 'vue';
import type { PackingItem } from '../../core/models';
const emit = defineEmits<{ add: [item: PackingItem] }>();
const draft = reactive({ name: '', category: '衣物', length: 20, width: 15, height: 5, weight: 0.3, priority: 2 as 1|2|3, mustHave: false, fragile: false });
function submit() {
  const name = draft.name.trim() || '未命名物品';
  emit('add', { ...draft, name, id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` });
  draft.name = '';
}
</script>

<template>
  <form class="item-editor" data-testid="item-editor" @submit.prevent="submit">
    <input v-model="draft.name" aria-label="物品名称" placeholder="添加物品名称" />
    <select v-model="draft.category" aria-label="物品类别"><option>衣物</option><option>鞋履</option><option>数码</option><option>洗护</option><option>随身</option><option>其他</option></select>
    <button type="submit">＋ 添加</button>
  </form>
</template>
