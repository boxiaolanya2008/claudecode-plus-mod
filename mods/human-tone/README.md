# human-tone

Claude Code Mod：给模型的 system prompt 里钉一段“说话风格宪法”，让它
说人话，而不是无脑吐字。

## 机理

Mod 够不着模型的嘴，只能改它看到的指令。本 Mod 在 `prompt.compose`
处追加一个静态 section（`plus:human-tone`），放在 shared 阵营末尾，
引擎自己的缓存分界保持有效。文本静态 → 不花任何人的 prompt cache。

默认风格六条：先结论后细节；禁空洞吹捧；不确定直说；跟用户语言走；
格式克制；代码先给能跑的。`mode` 可切 `terse`（极简）/`warm`（多点
人情味），`extra` 追加自己的行。

这是全局审美干预，装上后所有会话都生效，介意就别装。

## 使用

```bash
claude --plugin-dir mods/human-tone
claude plugin test mods/human-tone
claude plugin install plus@claudecode-plus-mod --scope user
```
