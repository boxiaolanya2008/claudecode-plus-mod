param(
  [string]$Version = "0.1.0"
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$bundle = Join-Path $root 'bundle'
$mods = @('prompt-shield', 'cache-guard', 'human-tone', 'clear-intent', 'agent-charter')
$noBom = New-Object System.Text.UTF8Encoding($false)

if (Test-Path $bundle) {
  Remove-Item -Recurse -Force $bundle
}
New-Item -ItemType Directory -Force (Join-Path $bundle '.claude-plugin') | Out-Null
New-Item -ItemType Directory -Force (Join-Path $bundle 'hooks') | Out-Null

foreach ($m in $mods) {
  $src = Join-Path $root "mods/$m/hooks"
  if (-not (Test-Path $src)) {
    throw "missing hooks dir: $src"
  }
  Copy-Item -Recurse -Force $src (Join-Path $bundle "hooks/$m")
  $strayManifest = Join-Path $bundle "hooks/$m/hooks.json"
  if (Test-Path $strayManifest) {
    Remove-Item -Force $strayManifest
  }
}

$pluginJson = @'
{
  "name": "plus",
  "version": "__VERSION__",
  "description": "All claudecode-plus-mod Mods in one install: prompt-shield, cache-guard, human-tone, clear-intent and agent-charter.",
  "author": {
    "name": "claudecode-plus-mod"
  }
}
'@.Replace('__VERSION__', $Version)

$hooksJson = @'
{
  "description": "Bundle entry: composes every Mod in this marketplace through one register.",
  "modules": ["./register.ts"]
}
'@

$registerTs = @'
import type { On } from 'claude-code'

import { register as agentCharter } from './agent-charter/register'
import { register as cacheGuard } from './cache-guard/register'
import { register as clearIntent } from './clear-intent/register'
import { register as humanTone } from './human-tone/register'
import { register as promptShield } from './prompt-shield/register'

type PlusOptions = {
  verbose?: boolean
  forbidAutoCompact?: boolean
  dropAttachmentTypes?: string[]
  mode?: string
  extra?: string
  confirmFirst?: boolean
  charterMode?: string
}

/**
 * Registers every Mod in the bundle through one entry: each Mod reads only
 * the option keys it owns, so one options object serves all of them.
 *
 * @param on the engine's registrar
 * @param options shared options; `verbose` for all Mods, `forbidAutoCompact`
 * and `dropAttachmentTypes` for cache-guard, `mode` and `extra` for
 * human-tone, `confirmFirst` for clear-intent, `charterMode` for
 * agent-charter
 */
export function register(on: On, options: PlusOptions = {}): void {
  promptShield(on, options)
  cacheGuard(on, options)
  humanTone(on, options)
  clearIntent(on, options)
  agentCharter(on, options)
}
'@

$readmeMd = @'
# plus

聚合包：一次装全本仓库所有 Mod。生成文件，不要手改。

```bash
claude plugin install plus@claudecode-plus-mod --scope user
```

重新生成（仓库根目录）：

```powershell
./scripts/build-bundle.ps1 -Version 0.1.0
```
'@

[System.IO.File]::WriteAllText((Join-Path $bundle '.claude-plugin/plugin.json'), $pluginJson, $noBom)
[System.IO.File]::WriteAllText((Join-Path $bundle 'hooks/hooks.json'), $hooksJson, $noBom)
[System.IO.File]::WriteAllText((Join-Path $bundle 'hooks/register.ts'), $registerTs, $noBom)
[System.IO.File]::WriteAllText((Join-Path $bundle 'README.md'), $readmeMd, $noBom)

Write-Output "bundle built at $bundle with $($mods.Count) mods, version $Version"
