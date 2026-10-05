<script setup lang="ts">
import type { PackingItem } from '../../core/models';
defineProps<{ items: PackingItem[] }>();
const emit = defineEmits<{ remove: [id: string]; toggle: [id: string, mustHave: boolean] }>();
</script>

<template>
  <div class="item-list">
    <article v-for="item in items" :key="item.id" class="item-row">
      <div class="item-icon">{{ item.category.slice(0, 1) }}</div>
      <div class="item-copy"><strong>{{ item.name }}</strong><span>{{ item.length }}×{{ item.width }}×{{ item.height }} cm · {{ item.weight }} kg</span></div>
      <button class="must-button" :class="{ checked: item.mustHave }" type="button" @click="emit('toggle', item.id, !item.mustHave)">{{ item.mustHave ? '必带' : '可选' }}</button>
      <b class="priority">P{{ item.priority }}</b>
      <button class="icon-button" type="button" :aria-label="`删除 ${item.name}`" @click="emit('remove', item.id)">×</button>
    </article>
  </div>
</template>
