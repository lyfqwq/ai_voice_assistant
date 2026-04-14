param(
  [Parameter(Mandatory = $true)]
  [string]$Phase
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "git command was not found."
}

git add .
git commit -m "feat($Phase): complete $Phase"
