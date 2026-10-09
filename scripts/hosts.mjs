/**
 * hosts.mjs —— 宿主版本枚举的**唯一事实源**。
 *
 * 迁移基线：improve-dsh-plugins/enum-peer-migration/INDEX.md §A。
 * 枚举口径（2026-10-04 用户决定，覆盖 INDEX §E「矩阵未绿不收」的起点纪律）：
 * **起步即全量收入 npm 上六条线（0.1.0/0.1.1/0.1.2/0.1.5/0.1.7/0.2.0）的全部 rc**，
 * 由本地隔离矩阵逐格验证后**删红留绿**；矩阵结论落 `.compat-results/`。
 * 升级流程：本数组加版本 → `node scripts/sync-hosts.mjs --write` → 矩阵绿 → 发版。
 * 本数组与由它生成的三处声明（package.json peerDependencies / package.json
 * engines.dsh / dsh.plugin.json engines.dsh）**禁止手改**。
 */

/** 全部声明支持的宿主 rc（冻结；新增只在此处追加）。 */
export const supportedHosts = Object.freeze([
  // 0.1.0 线（5 个 rc）
  '0.1.0-rc.2',
  '0.1.0-rc.3',
  '0.1.0-rc.6',
  '0.1.0-rc.7',
  '0.1.0-rc.8',
  // 0.1.1 线（2 个 rc）
  '0.1.1-rc.1',
  '0.1.1-rc.2',
  // 0.1.2 线（1 个 rc；alpha 不入列）
  '0.1.2-rc.1',
  // 0.1.5 线（3 个 rc）
  '0.1.5-rc.1',
  '0.1.5-rc.2',
  '0.1.5-rc.3',
  // 0.1.7 线（2 个 rc）
  '0.1.7-rc.1',
  '0.1.7-rc.2',
  // 0.2.0 线（2 个 rc）
  '0.2.0-rc.1',
  '0.2.0-rc.2',
])

/** peerDependencies / engines.dsh 共用的枚举串（精确枚举无暗坑，INDEX §B）。 */
export const peerRange = supportedHosts.join(' || ')

/** 本地开发与矩阵默认宿主（devDependencies 若引入宿主包一律钉这里）。 */
export const developmentHost = '0.2.0-rc.2'

/**
 * peer 闸门指向的宿主子包（本插件唯一宿主契约面：注入的 `systemPrompt` 服务
 * 由 `@deepseek-ai/dsh-system-prompt` 提供；该包与宿主 `@deepseek-ai/dsh`
 * 同版本线逐版发布）。sync-hosts 据此写 peerDependencies。
 */
export const hostPeerPackages = Object.freeze(['@deepseek-ai/dsh-system-prompt'])
