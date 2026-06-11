# 🥤 Cola Cup 2026 — 世界杯可乐竞猜平台

同事之间「赌可口可乐」的内部竞猜小工具：赛前给球队投票下注，赛后按**群众投票的帕里-玛图尔（Pari-Mutuel）赔率**结算每个人该买/该收多少瓶可乐，并维护排行榜。跑在家用机上，通过 Tailscale 内网供全员访问。

<p align="center">
  <img src="docs/preview.gif" alt="界面预览：赛程列表 / 比赛详情与赔率对比 / 玩法说明" width="640">
</p>

## 功能

- **赛程**：2026 世界杯全部 104 场比赛、48 支球队（中文名展示），数据源 [openfootball](https://github.com/openfootball/worldcup.json)，淘汰赛对阵确定后自动更新。
- **下注**：用 X（Twitter）账号登录后选方向下注（小组赛 胜/平/负，淘汰赛 胜/负），注额按阶段固定（小组赛 1 瓶 → 淘汰赛 2 瓶 → 半决赛起 5 瓶），开赛前 1 小时锁盘，锁盘前可改票。
- **两种赔率**：结算用**群众投票分池赔率**（押冷门赢多、押热门赢少，零和、平台不抽水）；同时抓取 [Polymarket](https://polymarket.com) 市场概率，仅作「群众 vs 市场」对比展示。
- **比分同步**：[football-data.org](https://www.football-data.org) 自动拉取已结束比赛的比分（也可在后台手动录入/修正）。
- **结算与账本**：精确小数账本，零头跨场累计；结算账号在 `/admin` 后台发起结算、查看每人净瓶数总账、标记可乐已结清。
- **额度兑换**：余额可在「我的」页面直接兑换饮料（可乐 1 / 各种茶、外星人 1.5 / 红牛 2.5 额度一瓶），兑换自动扣额度。
- **排行榜与个人页**：`/leaderboard` 看排名，`/me` 看个人账本、待结/已结清状态，可改昵称、用 emoji 覆盖头像。
- **定时任务内置**：赔率/比分/赛程/锁盘的周期任务跑在应用容器内，无需宿主机 crontab。

## 两个实现版本

同一套产品有两份完整实现，分别位于：

| 目录 | 技术栈 |
|---|---|
| [`nextjs/`](nextjs/) | Next.js 16 (App Router) + React 19 + better-sqlite3 + Auth.js |
| [`rails/`](rails/) | Rails 8.1 + Hotwire + Solid Stack + Devise |

两版共用同一套环境变量约定（Twitter OAuth、`SETTLER_USERNAMES`、football-data key 等，对照表见 `rails/README.md`），数据可通过 `legacy:import` 从 Next.js 版的 SQLite 整库迁移到 Rails 版。部署都是单容器 Docker Compose + SQLite volume，监听宿主机 8026 端口。

### Next.js 版（`nextjs/`）的优点

- **前端生态与组件模型**：React 19 + App Router，交互组件（投票面板、赔率对比、管理后台）以客户端组件表达，前端同学上手成本低。
- **类型贯穿全栈**：TypeScript 从 DB 查询层（better-sqlite3 同步 API）到页面组件端到端覆盖。
- **静态资源可上 CDN**：支持 `ASSET_PREFIX` 把 `/_next/static` 托管到 Cloudflare Pages，公网带宽差的家用机也能快。
- **久经实战**：作为初版承载了真实玩法迭代，行为是后续重写的对照基准。

### Rails 8 版（`rails/`）的优点

- **Hotwire 是核心体验**：跨用户**实时更新**全程由 Turbo + Stimulus 驱动——任何人投票后，其他人打开的首页卡片、赔率条、投票名单约 1 秒内经 Turbo Stream 广播自动刷新，**无需手动刷新页面**；页面间导航走 Turbo Drive（进度条融入页头），局部交互用 Turbo Frame + Stimulus 控制器，几乎不写自定义前端胶水代码。
- **零 Node 构建**：importmap-rails + Propshaft + tailwindcss-rails（standalone 二进制），没有 node_modules、没有打包器，构建快、依赖面小。
- **Solid Stack 去 Redis 化**：Solid Queue（后台/定时任务）、Solid Cache、Solid Cable（WebSocket）全部落在 SQLite 上，开发与生产同构，单容器即全栈。
- **现代单体的运维简单性**：Thruster 直接服务预编译资源，发布就是 `make publish`（rebuild + restart）；迁移随容器启动自动执行。
- **测试与安全基线**：RSpec 测试金字塔（资金安全 P0 用例优先）+ RuboCop + Brakeman 静态扫描。

## 技术路线讨论：两条路通向同一个单体

有意思的是，这两个版本其实殊途同归：都是**单仓库、单进程、单容器、SQLite 落盘**的现代单体（Modern Monolith）——没有微服务，没有独立的前后端仓库，没有 API 网关。对于「百人内网、家用机部署」这种规模的项目，这是一个被两边社区共同验证过的答案，分歧只在抵达的路径。

### Rails 社区的视角

DHH 在 [The Majestic Monolith](https://signalvnoise.com/svn3/the-majestic-monolith/) 中描述的单体，并非领域驱动设计里讽刺的「大泥球」，而是一种高度整合的系统：业务逻辑、数据模型、后台任务和界面共存于一个代码库，所有依赖触手可及，所有上下文清晰可见。这背后有几条朴素的判断：

- **微服务解决的是组织问题，不是技术问题**。对中小团队，它带来的是昂贵的「复杂度债务」：纳秒级函数调用退化为毫秒级 HTTP 请求、简单事务变成分布式事务、部署一个应用变成编排数十个容器。Martin Fowler（[Monolith First](https://martinfowler.com/bliki/MonolithFirst.html)）、Dan McKinley（[Choose Boring Technology](https://boringtechnology.club/)）、Kelsey Hightower 等人都从不同角度表达过类似观点。
- **前后端分离有真实代价**：服务端与客户端的状态永远在博弈；后端写一遍 DTO、前端再写一遍 TypeScript Interface 的「类型体操」；为一个 API 字段命名反复开会；前端包与后端服务的版本兼容演习。
- **硬件已经追平了曾经的性能借口**。今天一台普通的 EC2 实例算力超过十年前的整个集群，NVMe SSD 让 I/O 不再是瓶颈——把逻辑放在同一个内存空间里执行，是物理上最高效的方式。
- **One Person Framework**：DHH 在 Rails 20 周年提出的理念——通过整合的工具链消除不产生业务价值的工作（Nginx 配置、Redis 集群、JSON 序列化），让一个人重获对软件完全的掌控。本项目的 Rails 版正是这个理念的实践：Solid Stack 去掉了 Redis，importmap 去掉了打包器，Kamal 风格的单容器部署去掉了编排。

### 公平地说，Next.js 是 JS 世界对同一问题的回答

把上面这些痛点当作对 Next.js 的批判并不公平——它们针对的是「SPA + 独立 API 后端」那种分离式架构，而 **Next.js App Router 本身就是 JS 社区向服务端、向整合回归的产物**：

- **Server Components 与 Server Actions** 把数据获取和变更拉回服务端，同一个仓库、同一个进程，消除了传统 SPA 的 API 胶水层——这和 Rails 的出发点是一致的。
- **TypeScript 端到端贯穿**是另一种消灭「类型体操」的方式：类型只写一遍，从 `better-sqlite3` 查询到页面组件全程静态检查，重构时编译器兜底，这是 Ruby 给不了的安全感。
- **React 的组件模型**对重交互界面（投票面板、赔率对比这类状态密集的 UI）表达力很强，且生态、工具链、人才池都是当今最大的。
- 本项目的 Next.js 版同样是单容器单体，并且作为初版**实打实地承载过真实流量**，证明这条路完全走得通。

### 殊途同归

两个版本的差别不在「单体 vs 分离」，而在实现单体的哲学：Rails 用**约定优于配置**和服务端渲染 + Hotwire 把客户端 JavaScript 压到最少，需求变更就是改几行 Ruby；Next.js 用 **React 统一服务端与客户端**，把全栈纳入同一种组件模型和类型系统。选哪条路，更多取决于团队的背景与口味，而不是孰优孰劣。

## 快速开始

两版各自的本地开发、Docker 部署、Twitter OAuth 配置、Tailscale 内网访问与运维细节，见各自目录下的 README：

- Next.js 版：[`nextjs/README.md`](nextjs/README.md)
- Rails 版：[`rails/README.md`](rails/README.md)
