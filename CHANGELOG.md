# Changelog

## 0.5.1

- 四个 Mod 全部加上 `session.start` 就绪声明：启动即工作证明，默认走
  debug 通道零打扰，`verbose: true` 可见；顺带给每个 Mod 补了启动透传测试。
- `plus` 聚合包同步到 0.5.1。

- 新增 `human-tone`：system prompt 风格宪法（shared 侧静态 section，
  `mode`/`extra` 可配）。
- 新增 `clear-intent`：每轮意图确认协议，模糊输入升级为先复述等确认
  （`confirmFirst` 可全量升级）。
- `plus` 聚合包同步到 0.5.0，一条命令装全四个 Mod。

- `cache-guard` 新增逐轮监管：`turn.complete` 后对主循环 transcript 做
  append-only 校验（`auditCustody`），中途消失的消息按编号和内容预告警，
  乱序也告警；只查主循环，子代理不查。
- `plus` 聚合包同步到 0.4.0。

- `cache-guard` 新增 compact 证据柜：compact 前把全量消息快照进 `$.store`
 （只留最近 2 份，超限自动降级为指纹），审计记录留 10 份，任何字符的去向
  都有据可查。
- `plus` 聚合包同步到 0.3.0。

- `cache-guard` 从纯审计升级为主动稳定：`prompt.section` /
  `prompt.context` 挥发性漂移钉回定稿（`normalizeVolatile` +
  `stabilize`），新增 `dropAttachmentTypes` 选项。
- `plus` 聚合包同步到 0.2.0（含新 `dropAttachmentTypes` 透传）。

## 0.1.0

- 新增 `prompt-shield`：剥离外发提示词中的不可见指纹字符并审计。
- 新增 `cache-guard`：前缀字节稳定、compact 保真审计、每轮缓存命中报告。
- 新增 `plus` 聚合包：一条命令装全所有 Mod，见根 README。
- 新增 `scripts/build-bundle.ps1`：从 `mods/*/` 组装 `bundle/`。
