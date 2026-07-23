# CLAUDE.md - 项目指南与开发规范

## 1. 项目概述 (Project Overview)

- **项目名称**：Tenda 波兰价格与利润管理台（tenda3）
- **技术栈**：纯原生 HTML/CSS/JavaScript（ES6+，无框架），通过 Vite + vite-plugin-singlefile 打包为单文件产物；后端使用 Supabase（Postgres + Auth + Row Level Security），前端通过 `@supabase/supabase-js` CDN 引入直接调用，没有自建后端服务器。
- **核心功能**：波兰子公司业务管理后台的单页应用，面向两类用户：
  - **内部员工**（`@tenda.cn` 邮箱登录）：销售订单/发票查看、客户报价管理、总部报价模拟测算、促销与营销活动管理、新品 GTM、库存管理（Tenda 库存 + 代理商库存）、客户管理（含返利阶梯、退货管理）等完整后台功能。
  - **客户账号**（在 Supabase 后台手动创建 Auth 用户，并在 `customer_accounts` 表绑定 `customer_code`）：登录后只显示“客户服务门户”——提交退货申请（单条录入 / Excel 批量导入）、查看并自助编辑/删除自己“待处理”状态的退货记录，与内部后台数据和界面完全隔离。
- **单文件架构**：项目不是多文件前端工程，整个应用（HTML 结构、CSS、JavaScript 逻辑）都写在同一个源文件 `app/index.html` 里，没有拆分组件/模块文件，也没有打包 npm 三方 UI 库。

## 2. 目录结构地图 (Directory Map)

```
tenda3/
├── app/
│   └── index.html          ← 唯一的源代码文件，所有 HTML/CSS/JS 都写在这里，开发时只改这个文件
├── index.html               ← ⚠️ CI 自动生成的构建产物，禁止手动编辑，每次 push 后会被覆盖
├── vite.config.js           ← Vite 配置：root 指向 app/，构建产物输出到 ../dist/
├── package.json
├── .gitignore
└── .github/workflows/build.yml   ← CI：push 到 main 后自动 npm install + vite build，
                                      再把 dist/index.html 回写到仓库根目录 index.html（即线上实际部署内容）
```

**关键规则：只编辑 `app/index.html`，永远不要直接改根目录的 `index.html`**——它是构建产物，手动改了也会在下次 CI 跑完后被覆盖丢失。

## 3. 常用开发命令 (Build & Development Commands)

```bash
npm install       # 安装依赖（vite、vite-plugin-singlefile）
npm run dev       # 本地启动 Vite 开发服务器，实时预览 app/index.html
npm run build     # 打包为单文件产物，输出到 dist/index.html
npm run preview   # 本地预览构建产物
```

- 本项目**没有** TypeScript、React、测试框架（Jest/Vitest）、ESLint/Prettier 配置。`package.json` 里只有以上三个 script，不要假设或调用 `type-check` / `test` / `lint` 等不存在的命令。
- 推送到 `main` 分支后，GitHub Actions（`.github/workflows/build.yml`）会自动执行构建并把结果回写到根目录 `index.html`。改完 `app/index.html` 并 push 后，需要去 Actions 标签页确认工作流跑绿，才算真正发布上线。

## 4. 代码编写规范 (Code Style & Guidelines)

- **语言标准**：原生 ES6+ JavaScript，以 `function(){}` 声明风格为主（贴合现有代码习惯），不引入 TypeScript、不做构建期类型检查。
- **无框架**：不引入 React/Vue 等框架，也不要引入 Tailwind CDN——页面已有一套基于 CSS 变量的自定义设计系统（见 `:root{ --bg; --surface; --text; --copper; ... }`），新增 UI 一律复用这些设计 token，保持与页面其他模块视觉一致。
- **样式**：所有 CSS 写在 `app/index.html` 单个 `<style>` 块里，用 class 前缀区分模块（如 `cp-*` 专属客户门户、`inv-*` 库存模块等）。新增“隐藏/显示”状态时注意 CSS 选择器优先级——只用 class（如 `.foo.hidden{display:none}`）配合特定 ID/class 复合选择器，避免裸 ID 选择器优先级意外盖过隐藏状态（历史上出过一次客户门户遮挡内部后台的严重 bug，根因就是这个）。
- **状态管理**：无 Context/Redux/Zustand，用模块级 `let`/`const` 做全局状态（如 `currentLang`、`cpCustomerCode`、`priceList` 等），统一在同一个 `<script>` 作用域下管理。
- **数据库交互**：统一通过全局 `sb`（`supabase-js` client）调用，安全边界完全依赖 Supabase Row Level Security（前端 anon key 是公开的）。新增任何表/字段时：
  1. 必须先设计并应用 RLS 策略再让前端可访问，绝不能让新表默认 `using(true)`；
  2. 内部员工判定用 `is_staff()`（邮箱以 `@tenda.cn` 结尾的 `security definer` 函数）；
  3. 客户账号判定用 `current_customer_code()`（从 `customer_accounts` 表按 `auth.uid()` 反查 `customer_code`）；
  4. 客户相关表的策略要按 `customer_code = current_customer_code()` 严格限定行级可见范围，破坏性操作（改状态、删除）要额外限定行状态条件。
- **国际化 (i18n)**：全站中/英/波兰语三语，通过 `I18N_DICT` 数组（`[中文, English, Polski]` 三元组）+ `MutationObserver` 自动翻译文本节点/占位符实现。新增任何面向用户的文案，都要同步在 `I18N_DICT` 补一条完整词条，避免用过于通用的 1-2 字短语当 key（会误伤页面其他位置的文本）。
- **错误处理**：Supabase 请求统一 `try/catch` + `if (error){...}` 判断，失败信息写入对应的 `*-form-msg` 元素展示；只有删除等破坏性操作的二次确认才用 `confirm()`/`alert()`。

## 5. 测试与验证要求 (Testing Requirements)

本项目没有自动化测试框架，改动前后需要用以下方式手工验证，而不是依赖 `npm run test`：

1. **语法检查**：改完 `app/index.html` 后，提取所有内联 `<script>` 块（跳过带 `src=` 的外链脚本），用 `new Function(code)` 逐块做语法校验，确认没有语法错误再提交。
2. **逻辑验证**：涉及纯函数/校验逻辑（表单校验、批量导入解析、去重逻辑等）的改动，建议抽出函数体在隔离沙箱（构造假 DOM + mock `sb` 客户端）里跑一遍，确认边界情况符合预期。
3. **视觉验证**：涉及 CSS/布局改动，建议把改动后的样式和相关 HTML 片段注入 iframe 沙箱截图确认渲染效果，尤其是隐藏/显示状态切换，需要在员工和客户两种登录角色下都检查一遍。
4. **RLS 安全验证**：涉及新表/新策略的改动，建议用 SQL 事务模拟（`set local role authenticated; set local request.jwt.claims = '...'`，最后 `rollback`）分别以员工和客户身份验证权限边界，确认客户看不到无关数据、也无法越权修改/删除他人或非法状态的记录。
5. **CI + 部署验证**：提交后到 Actions 标签页确认构建工作流跑绿，再直接 fetch 根目录 `index.html`（带时间戳参数避免缓存）确认关键改动内容已经出现在最终产物里，才算改动真正生效。
