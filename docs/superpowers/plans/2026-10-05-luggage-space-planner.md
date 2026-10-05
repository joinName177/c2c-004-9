# 行李箱空间规划师 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付可配置行李箱、管理物品、生成三种装箱方案、检测风险并打印的纯前端应用。

**Architecture:** 核心层使用纯 TypeScript 完成几何、装箱策略和风险分析；端口层定义存储与打印；浏览器适配器实现 localStorage/print；Vue 界面只负责编排用例和展示。装箱输出统一的 `PackingPlan`，两个投影视图和方案对比均消费同一结果。

**Tech Stack:** Vue 3, TypeScript, Vite, Vitest, Vue Test Utils, native CSS, Nginx

**Spec:** `docs/superpowers/specs/2026-10-05-luggage-space-planner-design.md`

## Global Constraints

- 仅创建纯前端资源，不调用远程服务。
- 核心层不得依赖 Vue、DOM、localStorage 或 Canvas。
- 原生 CSS；桌面和移动端均可使用。
- Docker 生产端口映射固定为 `8104:80`。
- 所有长度为 cm、重量为 kg，计算结果必须可重复。

## Review Focus

- 箱体任一尺寸或承重非正数：Task 2 校验测试必须拒绝规划。
- 物品旋转后才可放入：Task 2 测试必须选中可行旋转。
- 总重量恰好等于上限：Task 2 测试必须允许装入。
- localStorage JSON 损坏：Task 4 测试必须回退示例数据并返回提示。
- 必需品因空间不足被遗漏：Task 3 测试必须产生 `critical` 风险。

---

### Task 1: 工程骨架与领域模型

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/vite-env.d.ts`
- Create: `src/core/models.ts`, `src/core/__tests__/models.test.ts`
- Create: `.gitignore`, `.dockerignore`

**Interfaces:**
- Produces: `Suitcase`, `PackingItem`, `Placement`, `PackingPlan`, `Risk`, `PackingSnapshot`, `PlanMode` types and `itemVolume(item)` / `suitcaseVolume(suitcase)`.

- [ ] **Step 1: Write the failing model test** asserting `itemVolume({length: 10,width: 4,height: 3}) === 120` and immutable sample shapes type-check.
- [ ] **Step 2: Run `npm test -- models.test.ts`** and confirm failure because the module is missing.
- [ ] **Step 3: Add Vite/Vitest/Vue configuration and implement the exact exported models and volume helpers.**
- [ ] **Step 4: Run `npm test -- models.test.ts` and `npm run build`**; both must exit 0.
- [ ] **Step 5: Commit** with `feat: scaffold luggage planner domain`.

### Task 2: 几何与三维装箱引擎

**Files:**
- Create: `src/core/geometry.ts`, `src/core/packing-engine.ts`
- Test: `src/core/__tests__/geometry.test.ts`, `src/core/__tests__/packing-engine.test.ts`

**Interfaces:**
- Consumes: Task 1 domain types.
- Produces: `rotationsOf(item): Dimensions[]`, `intersects(a,b): boolean`, `validateSuitcase(suitcase): string[]`, `packItems(suitcase, items, mode): PackingPlan`.

- [ ] **Step 1: Write failing geometry tests** for six-or-fewer unique rotations, face-touching non-intersection, overlapping intersection, and rotated-only fit.
- [ ] **Step 2: Run `npm test -- geometry.test.ts`** and confirm missing exports fail.
- [ ] **Step 3: Implement rotation normalization and axis-aligned box intersection.**
- [ ] **Step 4: Run the geometry test** and confirm all assertions pass.
- [ ] **Step 5: Write failing engine tests** for non-positive suitcase rejection, exact weight limit acceptance, boundary/collision prevention, deterministic coordinates and unplaced reasons.
- [ ] **Step 6: Run `npm test -- packing-engine.test.ts`** and confirm feature failures.
- [ ] **Step 7: Implement candidate-corner packing with mode-specific capacity reserves and item ordering.**
- [ ] **Step 8: Run the full test suite** and confirm zero failures.
- [ ] **Step 9: Commit** with `feat: add deterministic 3d packing engine`.

### Task 3: 多方案策略与风险检测

**Files:**
- Create: `src/core/plan-service.ts`, `src/core/risk-engine.ts`, `src/core/sample-data.ts`
- Test: `src/core/__tests__/plan-service.test.ts`, `src/core/__tests__/risk-engine.test.ts`

**Interfaces:**
- Consumes: `packItems`, domain types.
- Produces: `generatePlans(suitcase, items): Record<PlanMode,PackingPlan>`, `detectRisks(plan,suitcase,items): Risk[]`, `createSampleSnapshot(): PackingSnapshot`.

- [ ] **Step 1: Write failing plan tests** asserting all three named modes exist, must-have/high-priority order is preserved, and shopping mode reserves more capacity than comfort mode.
- [ ] **Step 2: Run the plan test** and confirm missing functions fail.
- [ ] **Step 3: Implement plan orchestration and stable sample data.**
- [ ] **Step 4: Run the plan test** and confirm pass.
- [ ] **Step 5: Write failing risk tests** for overweight, high volume, oversized item, fragile item under load, high heavy item and omitted must-have as `critical`.
- [ ] **Step 6: Run the risk test** and confirm missing rules fail.
- [ ] **Step 7: Implement risk rules with stable ids, severity and actionable Chinese messages.**
- [ ] **Step 8: Run the full test suite** and confirm zero failures.
- [ ] **Step 9: Commit** with `feat: add packing strategies and risk analysis`.

### Task 4: 端口、浏览器适配器与应用控制器

**Files:**
- Create: `src/ports/planner-repository.port.ts`, `src/ports/print.port.ts`
- Create: `src/adapters/local-planner.repository.ts`, `src/adapters/browser-print.adapter.ts`
- Create: `src/ui/usePlanner.ts`
- Test: `src/adapters/__tests__/local-planner.repository.test.ts`, `src/ui/__tests__/usePlanner.test.ts`

**Interfaces:**
- Produces: `PlannerRepository.load(): LoadResult<PackingSnapshot>`, `save(snapshot): void`; `PrintPort.print(): void`; `usePlanner(deps)` actions for add/update/remove item, update suitcase, regenerate, select plan and reset sample.

- [ ] **Step 1: Write failing repository tests** for round-trip persistence, missing data and malformed JSON fallback with warning.
- [ ] **Step 2: Run the repository test** and confirm missing adapter fails.
- [ ] **Step 3: Implement ports and localStorage adapter with injected `Storage`.**
- [ ] **Step 4: Run the repository test** and confirm pass.
- [ ] **Step 5: Write failing controller tests** for item CRUD, dirty-result flag, regeneration and selected plan persistence.
- [ ] **Step 6: Run the controller test** and confirm feature failures.
- [ ] **Step 7: Implement the controller and browser print adapter.**
- [ ] **Step 8: Run the full suite** and confirm zero failures.
- [ ] **Step 9: Commit** with `feat: connect planner application ports`.

### Task 5: Vue 工作台、投影视图与方案对比

**Files:**
- Create: `src/ui/App.vue`, `src/ui/components/SuitcaseForm.vue`, `ItemEditor.vue`, `ItemList.vue`, `PackingProjection.vue`, `PlanCompare.vue`, `RiskPanel.vue`, `PrintSheet.vue`
- Create: `src/ui/styles.css`
- Test: `src/ui/__tests__/App.test.ts`

**Interfaces:**
- Consumes: `usePlanner` and `PackingPlan`; projection accepts `view: 'top'|'side'` and emits selected item id.

- [ ] **Step 1: Write failing component tests** for default sample render, invalid suitcase message, add/delete item, plan selection and synchronized projection highlight.
- [ ] **Step 2: Run `npm test -- App.test.ts`** and confirm missing components fail.
- [ ] **Step 3: Implement the responsive Vue workbench and accessible native-CSS visual system.**
- [ ] **Step 4: Run the component test and full suite**; both must pass.
- [ ] **Step 5: Add print-only layout and verify the print button calls the print port in the component test.**
- [ ] **Step 6: Run `npm run build`** and confirm TypeScript/Vite exit 0.
- [ ] **Step 7: Commit** with `feat: build luggage planning workspace`.

### Task 6: 容器化、文档与最终重构

**Files:**
- Create: `Dockerfile`, `docker-compose.yml`, `nginx.conf`, `README.md`
- Modify: files identified by cohesion review only within this project.

**Interfaces:**
- Produces: reproducible Nginx image and documented local/Docker commands.

- [ ] **Step 1: Review layer imports and file responsibilities; record violations as assertions in existing tests before refactoring behavior.**
- [ ] **Step 2: Refactor duplicated mapping/formatting and oversized UI responsibilities while keeping the full suite green.**
- [ ] **Step 3: Add multi-stage Docker/Nginx files and README architecture, algorithm, privacy, command and limitation sections.**
- [ ] **Step 4: Run `npm test`, `npm run build`, and `docker build -t c2c-004 .`**; all must exit 0.
- [ ] **Step 5: Inspect `git diff --check` and `git status --short`.**
- [ ] **Step 6: Commit** with `chore: finalize luggage planner delivery`.
