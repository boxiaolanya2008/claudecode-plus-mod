# agent-charter

Claude Code Mod：给智能体立一份行为宪章，覆盖 skill 使用、注释规范、
提交格式、分支纪律。

## 内容

宪章是静态文本（`plus:agent-charter`），默认追加在 shared 阵营末尾，
不花缓存、四 Mod 行为：

- **Skill 优先**：开工先列相关 skill/plugin，有现成的不重造；不臆造 API。
- **注释规范**：只解释为什么；Java Javadoc、Python Docstring、C# XML、
  PHP PHPDoc、C/C++ Doxygen、Go Go Doc、Rust Rustdoc、Ruby RDoc/YARD、
  Kotlin KDoc。
- **提交格式**：`[模块][n/m]{【类型】【版本】中文\英文描述}(需求号)`。
- **分支纪律**：一事一分支，主分支不动；自测通过才合，合完删分支；
  PR 讲清改了什么、为什么、怎么验证。

## 两种模式

`charterMode: append`（默认）：保留引擎原 composition，工具说明和
安全边界都在，只加宪章。`replace`： constitutional charter 之外
全部丢掉——模型会变笨、工具会残、安全会裸奔，只给知道自己在干什么
的人用：

```json
{ "charterMode": "replace" }
```

## 使用

```bash
claude --plugin-dir mods/agent-charter
claude plugin test mods/agent-charter
claude plugin install plus@claudecode-plus-mod --scope user
```
