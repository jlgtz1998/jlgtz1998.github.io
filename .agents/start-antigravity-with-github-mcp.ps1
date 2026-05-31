param(
  [string]$Workspace = "E:\NOSTROMO\01_PROJECTS Desarrollo Activo\15_QUIET_COLORSTUDIO"
)

$ErrorActionPreference = "Stop"

$antigravity = @(
  "$env:LOCALAPPDATA\Programs\Antigravity\Antigravity.exe",
  "$env:LOCALAPPDATA\Programs\Antigravity\antigravity.exe",
  "$env:LOCALAPPDATA\Google\Antigravity\Application\Antigravity.exe",
  "$env:LOCALAPPDATA\Google\Antigravity\Application\antigravity.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $antigravity) {
  throw "Antigravity.exe was not found in the expected Windows install locations."
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  throw "GitHub CLI was not found. Install GitHub CLI or sign in before launching Antigravity with GitHub MCP."
}

$token = (& gh auth token 2>$null).Trim()
if (-not $token) {
  throw "GitHub CLI is not authenticated. Run 'gh auth login' first."
}

$env:GITHUB_PERSONAL_ACCESS_TOKEN = $token
& $antigravity $Workspace
