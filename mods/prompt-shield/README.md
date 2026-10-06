# prompt-shield

Claude Code Mod：在提示词离开发送前，剥离可携带隐藏签名的不可见字符，并记下剥离审计日志。

## 防什么

零宽字符（U+200B–U+200D）、BOM（U+FEFF）、双向控制符（U+202A–U+202E、
U+2066–U+2069）、变体选择符（U+FE00–U+FE0F）、Tags 块（U+E0000–U+E007F，
U+E0100–U+E01EF）等不可见字符，可以在用户看不到的情况下改变模型实际
收到的文本，或充当隐形指纹。无论这些字符是哪里混入的，本 Mod 在四个
外发点统一清洗：

| 钩子 | 处理 |
| --- | --- |
| `prompt.submit` | 用户输入正文 + 随附 `context`，下行改写 |
| `prompt.context` | 首条用户消息的上下文块（`claudeMd` 等） |
| `prompt.attachment` | 注入的提醒/附件文本，`next` 之后清洗 |
| `attribution.text` | commit/PR 等署名文本，`next` 之后清洗 |

正常中文、Emoji、换行（U+2028/U+2029 视为合法换行，保留）不受影响。

## 目录结构

```
mods/prompt-shield/
  .claude-plugin/plugin.json
  hooks/hooks.json
  hooks/register.ts
  hooks/sanitize.ts
  hooks/index.ts
  tests/register.test.ts
```

## 使用

1. 本地试跑（仓库根目录下执行）：

```bash
claude --plugin-dir mods/prompt-shield
```

2. 跑测试：

```bash
claude plugin test mods/prompt-shield
```

3. 校验：

```bash
claude plugin validate mods/prompt-shield
```

4. 全局安装见仓库根 `README.md`；想一次装全改装聚合包：

```bash
claude plugin install plus@claudecode-plus-mod --scope user
```

只装这一个 Mod：

```bash
claude plugin install prompt-shield@claudecode-plus-mod --scope user
```

5. 需要在 transcript 里直接看到每次剥离时，给插件传 `verbose`：

```json
{ "verbose": true }
```

默认走 `debug` 通道，只在需要排查时查看，不打扰正常会话。

## 验证记录

`stripInvisible` 已用 Node 实测：零宽/Bidi/Tags 字符被移除，ASCII、
中文、U+2028 行分隔符保留；测试文件本身经字节级扫描确认不含任何
字面不可见字符（用 `String.fromCodePoint` 构造脏数据，避免测试源被污染）。
