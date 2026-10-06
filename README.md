# claudecode-plus-mod

Claude Code Mod 合集：以函数钩子（`register(on, options)`）实现、随插件系统
分发的 Mod 集合。`prompt-shield` 只是其中之一，位于 `mods/prompt-shield/`。

| Mod | 说明 | 目录 |
| --- | --- | --- |
| `plus`（聚合包，一条命令装全） | 下面所有 Mod 的合集 | `bundle/`（生成文件，见 `scripts/`） |
| `prompt-shield` | 剥离外发提示词中的不可见指纹字符并审计 | `mods/prompt-shield/` |
| `cache-guard` | 前缀稳定、compact 证据柜、逐轮防丢审计、每轮命中报告 | `mods/cache-guard/` |
| `human-tone` | system prompt 风格宪法：说人话，无吹捧克制格式 | `mods/human-tone/` |
| `clear-intent` | 每轮意图确认协议，模糊输入先复述等确认 | `mods/clear-intent/` |

加新 Mod 见 `mods/README.md`；加完后重跑 `./scripts/build-bundle.ps1`，
让聚合包同步。改代码必同步改对应 README 和根 `CHANGELOG.md`。

## 全局安装

原理：本仓库根的 `.claude-plugin/marketplace.json` 把它声明成一个
marketplace；用户把 marketplace 加进来并以 `user` scope 安装插件，
该 Mod 就对这台机器上所有项目生效。

1. 把本仓库推到 GitHub（假设为 `<owner>/claudecode-plus-mod`
   ，下文出现处自行替换）：

```bash
git remote add origin git@github.com:<owner>/claudecode-plus-mod.git
git push -u origin main
```

2. 添加 marketplace（只需一次）：

```
/plugin marketplace add <owner>/claudecode-plus-mod
```

或命令行：

```bash
claude plugin marketplace add <owner>/claudecode-plus-mod
```

3. 一次装全（推荐）：

```bash
claude plugin install plus@claudecode-plus-mod --scope user
```

只装其中一个 Mod：

```bash
claude plugin install prompt-shield@claudecode-plus-mod --scope user
```

装完后用户级 `settings.json` 的 `enabledPlugins` 会记一笔，
此后任何目录跑 `claude` 都会加载它。不加 `--scope` 时默认装到
当前项目，只对该项目生效；`--scope project` 则把选择写进项目
配置，适合团队统一。

4. 团队分发（可选）：在项目仓库的 `.claude/settings.json` 里预告
   marketplace，新人 clone 即得提示：

```json
{
  "extraKnownMarketplaces": ["<owner>/claudecode-plus-mod"]
}
```

`extraKnownMarketplaces` 还有个别名 `additionalMarketplaces`。

## 本地调试（不安装）

```bash
claude --plugin-dir mods/prompt-shield
claude plugin test mods/prompt-shield
claude plugin validate mods/prompt-shield
```

本地目录也可以直接当 marketplace 加进来先行验证：

```bash
claude plugin marketplace add D:\31702\claudecode-plus-mod
```

## 注意事项

函数钩子 Mod 属于 early access API：只在启用了函数钩子的版本加载，
API 可能随版本变化而不另行通知。升级 Claude Code 后若 Mod 失效，
先跑 `claude plugin validate mods/<name>`，再对照新版类型声明修订。
