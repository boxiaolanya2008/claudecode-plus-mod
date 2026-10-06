# cache-guard

Claude Code Mod：把 prompt cache 前缀里我们自己造成的抖动抹掉，
把省下来的 miss 变成 hit，并用每轮真实数字证明。

## 能涨命中的唯一杠杆

服务端按请求前缀精确匹配给缓存，断点由引擎放置——这两样 Mod 都碰不到。
正常多轮会话里追加在末尾的新消息本来就不破坏前缀，命中早该有；
真正的漏发生在**前缀中段被改写**时：section 重组装混入新时间戳、
context 块措辞漂移、compact 重写历史。`cache-guard` 0.2.0 干的就是这个：

| 钩子 | 动作 | 效果 |
| --- | --- | --- |
| `prompt.section` | 仅挥发部分（时间戳、换行符）漂移时钉回上次定稿；真变了才放行并警告 | 重组装不再无故烧缓存 |
| `prompt.context` | 同上，按块名钉住 | 同上 |
| `prompt.attachment` | `dropAttachmentTypes` 点名的类型直接丢掉（默认空） | 可选，少一段不稳定输入 |
| `session.measure` | 每轮打出 `cache read X/Y (Z%)`，零命中警告 | 证明涨没涨，看数字 |
| `turn.complete`（主循环） | 对 transcript 做 append-only 校验：上轮指纹必须按序存活，消失的消息按编号+内容头报警，乱序也报警 | 正常会话丢字当场抓获，不只查 compact |
| `session.compact` | compact 前把全量消息快照进 `$.store`（键 `compact-evidence:<时间>`，只留最近 2 份；超 4 MiB 上限自动降级为指纹快照），compact 后审计 kept/dropped/added 并存档 10 份 | compact 是唯一真正改写历史的地方，丢的每个字符在这里都有数 |

钉住规则（`normalizeVolatile`）：ISO 日期时间只留日期，钟点归零，
CRLF 归一为 LF；端口号、版本号、无时间戳文本原样不动。每次钉住和
放行都记日志。

## 仍然做不到的事

5 分钟缓存 TTL、换模型即失缓存、compact 本体重置——这些在 Mod 之外，
涨不了。也别拿它跟引擎自带的断点机制比上限，它只负责堵住我们自己的漏。

## 保真度说明

指纹是 FNV-1a + 键排序的规范序列化：同一内容无论键顺序、handle 如何
变化哈希都相同；差一个字符哈希必变。compact 审计的是“引擎实际发出
了什么”，而不是“应该发出什么”。

## 使用

```bash
claude --plugin-dir mods/cache-guard
claude plugin test mods/cache-guard
claude plugin validate mods/cache-guard
```

一次装全改装聚合包，见仓库根 `README.md`：

```bash
claude plugin install plus@claudecode-plus-mod --scope user
```
