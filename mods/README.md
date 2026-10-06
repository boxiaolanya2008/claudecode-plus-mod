# Mods

每个子目录是一个独立的 Mod（Claude Code 插件，行为由 `register(on, options)`
函数钩子实现）。当前有四个：`prompt-shield`、`cache-guard`、`human-tone`、
`clear-intent`，另有聚合包 `plus`（`bundle/`，脚本生成，一条命令装全）。

新增一个 Mod 时：

1. 复制 `prompt-shield/` 为 `mods/<name>/`，改写 `.claude-plugin/plugin.json`
   的 `name`（kebab-case）和 `description`，实现自己的 `hooks/register.ts`。
2. 在根 `.claude-plugin/marketplace.json` 的 `plugins` 数组追加一行：

```json
{
  "name": "<name>",
  "description": "...",
  "version": "0.1.0",
  "source": "./mods/<name>",
  "category": "security"
}
```

3. 根 `tsconfig.json` 的 `include` 已用 `mods/*/` 通配，新 Mod 自动纳入类型检查。
4. 重跑 `./scripts/build-bundle.ps1 -Version <当前版本>`，把新 Mod
   装进聚合包 `plus`。
5. 更新根 `README.md` 的 Mod 表格和 `CHANGELOG.md`。
6. 单独调试某个 Mod 永远指向它自己的目录：

```bash
claude --plugin-dir mods/<name>
claude plugin test mods/<name>
claude plugin validate mods/<name>
```
