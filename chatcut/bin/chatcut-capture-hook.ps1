$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$HookScript = Join-Path $ScriptDir "chatcut-capture-hook.mjs"
$HookArgs = $args

function Invoke-NodeCandidate {
  param([string] $Candidate)

  if ($Candidate -and (Test-Path -LiteralPath $Candidate -PathType Leaf)) {
    & $Candidate $HookScript @HookArgs
    exit 0
  }
}

function Join-OptionalPath {
  param([string] $Root, [string] $Child)

  if (-not $Root) { return $null }
  Join-Path $Root $Child
}

@(
  $env:CHATCUT_CODEX_NODE,
  $env:CODEX_BUNDLED_NODE,
  $env:CODEX_NODE,
  $env:NODE_BINARY,
  $env:npm_node_execpath
) | ForEach-Object { Invoke-NodeCandidate $_ }

$CodexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" }

@(
  (Join-Path $CodexHome "dependencies\node\node.exe"),
  (Join-Path $CodexHome "dependencies\node\bin\node.exe"),
  (Join-Path $CodexHome "node\node.exe"),
  (Join-Path $CodexHome "node\bin\node.exe"),
  (Join-Path $CodexHome "bin\node.exe"),
  (Join-Path $HOME ".codex\dependencies\node\node.exe"),
  (Join-Path $HOME ".codex\dependencies\node\bin\node.exe"),
  (Join-Path $HOME ".codex\node\node.exe"),
  (Join-Path $HOME ".codex\node\bin\node.exe"),
  (Join-Path $HOME ".codex\bin\node.exe"),
  (Join-OptionalPath $env:LOCALAPPDATA "OpenAI\Codex\runtimes\cua_node\bin\node.exe"),
  (Join-OptionalPath $env:LOCALAPPDATA "OpenAI\Codex\runtimes\cua_node\node.exe"),
  (Join-OptionalPath $env:LOCALAPPDATA "Programs\Codex\resources\cua_node\bin\node.exe"),
  (Join-OptionalPath $env:LOCALAPPDATA "Programs\Codex\resources\node\node.exe"),
  (Join-OptionalPath $env:LOCALAPPDATA "Programs\Codex\resources\node\bin\node.exe"),
  (Join-OptionalPath $env:LOCALAPPDATA "Programs\Codex\resources\app\node\node.exe"),
  (Join-OptionalPath $env:ProgramFiles "Codex\resources\cua_node\bin\node.exe"),
  (Join-OptionalPath $env:ProgramFiles "Codex\resources\node\node.exe"),
  (Join-OptionalPath ${env:ProgramFiles(x86)} "Codex\resources\cua_node\bin\node.exe"),
  (Join-OptionalPath ${env:ProgramFiles(x86)} "Codex\resources\node\node.exe"),
  (Join-OptionalPath $env:ProgramFiles "nodejs\node.exe"),
  (Join-OptionalPath ${env:ProgramFiles(x86)} "nodejs\node.exe")
) | ForEach-Object { Invoke-NodeCandidate $_ }

Get-ChildItem -LiteralPath $CodexHome -Recurse -Filter node.exe -File -ErrorAction SilentlyContinue |
  Select-Object -First 1 |
  ForEach-Object { Invoke-NodeCandidate $_.FullName }

$GlobalNode = Get-Command node.exe -ErrorAction SilentlyContinue
if ($GlobalNode) {
  & $GlobalNode.Source $HookScript @HookArgs
  exit 0
}

exit 0
