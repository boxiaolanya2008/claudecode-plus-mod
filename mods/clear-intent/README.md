# clear-intent

Claude Code Mod：让模型动工前先搞清用户到底要什么，不瞎猜、不瞎扩。

## 机理

外部钩子逼不出真正的内心循环，能做的是给每轮指令加协议。本 Mod 在
`prompt.submit` 处贴一份意图协议（模型看得到，用户看不到）：

- 标准：用一句话说清目标；严格区分【已确认】和【脑补】；靠脑补才
  成立的关键步骤先问再动手；没说的需求不许自行实现。
- 输入过短（<12 字）或命中模糊模式（随便/看着办/都可以/都行/…）时
  升级：先复述理解等确认，确认前只做只读操作。

`confirmFirst: true` 则每轮都按强的来。误伤代价只是一次追问，
比猜错开工便宜。

## 使用

```bash
claude --plugin-dir mods/clear-intent
claude plugin test mods/clear-intent
claude plugin install plus@claudecode-plus-mod --scope user
```
