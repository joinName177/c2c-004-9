import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import App from '../App.vue';
import { LocalPlannerRepository } from '../../adapters/local-planner.repository';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.get(key) ?? null; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string) { this.data.delete(key); }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

function render(storage = new MemoryStorage()) {
  let printCount = 0;
  const wrapper = mount(App, { props: {
    repository: new LocalPlannerRepository(storage),
    printPort: { print: () => { printCount += 1; } },
  } });
  return { wrapper, storage, getPrintCount: () => printCount };
}

describe('Luggage planner App', () => {
  it('renders sample luggage and catches invalid dimensions', async () => {
    const { wrapper } = render();
    expect(wrapper.text()).toContain('行李箱空间规划师');
    expect(wrapper.text()).toContain('轻薄外套');
    await wrapper.get('[aria-label="行李箱长度"]').setValue('0');
    expect(wrapper.text()).toContain('行李箱长度必须大于 0');
  });

  it('adds and deletes an item', async () => {
    const { wrapper } = render();
    await wrapper.get('[aria-label="物品名称"]').setValue('新物品');
    await wrapper.get('[data-testid="item-editor"]').trigger('submit');
    expect(wrapper.text()).toContain('新物品');
    await wrapper.get('[aria-label="删除 新物品"]').trigger('click');
    expect(wrapper.text()).not.toContain('新物品');
  });

  it('selects a plan and highlights the same item in both projections', async () => {
    const { wrapper } = render();
    await wrapper.get('[data-plan="shopping"]').trigger('click');
    expect(wrapper.get('[data-plan="shopping"]').classes()).toContain('active');
    const jacket = wrapper.findAll('[data-item-id="jacket"]');
    expect(jacket.length).toBe(2);
    await jacket[0].trigger('click');
    expect(wrapper.findAll('[data-item-id="jacket"].selected')).toHaveLength(2);
  });

  it('delegates printing through the print port', async () => {
    const { wrapper, getPrintCount } = render();
    await wrapper.get('[data-testid="print-button"]').trigger('click');
    expect(getPrintCount()).toBe(1);
  });

  it('freezes the last result after an edit and blocks printing until recalculated', async () => {
    const { wrapper, getPrintCount } = render();
    await wrapper.get('[aria-label="删除 轻薄外套"]').trigger('click');

    expect(wrapper.get('[data-testid="sync-status"]').text()).toBe('方案待更新');
    expect(wrapper.get('[data-testid="stale-banner"]')).toBeTruthy();
    // 编辑区清单里已删除，但两幅摆放图仍是上次结果，色块保留
    expect(wrapper.get('.inventory').text()).not.toContain('轻薄外套');
    expect(wrapper.findAll('[data-item-id="jacket"]')).toHaveLength(2);
    // 打印单同样冻结在上次计算，重算前不可打印
    expect(wrapper.get('.print-sheet').text()).toContain('轻薄外套');
    // 打印按钮禁用，强制触发也不会调用打印端口
    const printButton = wrapper.get('[data-testid="print-button"]');
    expect((printButton.element as HTMLButtonElement).disabled).toBe(true);
    await printButton.trigger('click');
    expect(getPrintCount()).toBe(0);

    await wrapper.get('[data-testid="regenerate-button"]').trigger('click');
    expect(wrapper.get('[data-testid="sync-status"]').text()).toBe('规划已同步');
    expect(wrapper.find('[data-testid="stale-banner"]').exists()).toBe(false);
    expect(wrapper.findAll('[data-item-id="jacket"]')).toHaveLength(0);
    await wrapper.get('[data-testid="print-button"]').trigger('click');
    expect(getPrintCount()).toBe(1);
  });

  it('keeps judging risks with the old weight limit while a new limit is pending', async () => {
    const { wrapper } = render();
    await wrapper.get('[data-plan="shopping"]').trigger('click');
    await wrapper.get('input[type="range"]').setValue('4');

    expect(wrapper.get('[data-testid="stale-banner"]')).toBeTruthy();
    // 方案卡仍显示上次结果的 10kg 承重，而不是编辑中的 4kg
    expect(wrapper.get('[data-plan="shopping"]').text()).toContain('/10kg');
    const riskText = wrapper.get('.risk-panel').text();
    expect(riskText).not.toContain('超出承重 0');
  });

  it('clears the projection highlight after the selected item is deleted and recalculated', async () => {
    const { wrapper } = render();
    await wrapper.findAll('[data-item-id="jacket"]')[0].trigger('click');
    expect(wrapper.findAll('.selected')).toHaveLength(2);

    await wrapper.get('[aria-label="删除 轻薄外套"]').trigger('click');
    // 待更新时高亮跟随旧结果
    expect(wrapper.findAll('[data-item-id="jacket"].selected')).toHaveLength(2);
    await wrapper.get('[data-testid="regenerate-button"]').trigger('click');
    expect(wrapper.findAll('.selected')).toHaveLength(0);
  });

  it('does not show a synced state or allow recalculation with invalid inputs', async () => {
    const { wrapper } = render();
    await wrapper.get('[aria-label="行李箱长度"]').setValue('0');
    expect(wrapper.get('[data-testid="sync-status"]').text()).toBe('方案待更新');
    expect((wrapper.get('[data-testid="regenerate-button"]').element as HTMLButtonElement).disabled).toBe(true);
    expect((wrapper.get('[data-testid="print-button"]').element as HTMLButtonElement).disabled).toBe(true);
    // 旧结果仍可展示
    expect(wrapper.findAll('[data-item-id="jacket"]').length).toBeGreaterThan(0);
  });

  it('keeps edit and last result separate across a page refresh', async () => {
    const { wrapper, storage } = render();
    await wrapper.get('[aria-label="删除 轻薄外套"]').trigger('click');
    await wrapper.get('input[type="range"]').setValue('6');
    expect(wrapper.findAll('[data-item-id="jacket"]')).toHaveLength(2);

    // 模拟刷新：同一 localStorage，新建 App 实例
    const reloaded = render(storage).wrapper;
    expect(reloaded.get('[data-testid="sync-status"]').text()).toBe('方案待更新');
    expect(reloaded.get('.inventory').text()).not.toContain('轻薄外套');
    expect((reloaded.get('input[type="range"]').element as HTMLInputElement).value).toBe('6');
    // 结果区域仍是上次成功计算：色块保留、承重仍是 10
    expect(reloaded.findAll('[data-item-id="jacket"]')).toHaveLength(2);
    expect(reloaded.get('[data-plan="comfort"]').text()).toContain('/10kg');
    expect((reloaded.get('[data-testid="print-button"]').element as HTMLButtonElement).disabled).toBe(true);
  });
});
