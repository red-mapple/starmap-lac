param(
  [Parameter(Mandatory = $true)][string]$Root,
  [int]$DebounceSeconds = 90
)

$inbox = Join-Path $Root "06_private\MediaInbox"
$bat = Join-Path $Root "更新影像并发布.bat"

if (-not (Test-Path -LiteralPath $inbox)) {
  Write-Host "找不到收件箱目录：$inbox"
  exit 1
}
if (-not (Test-Path -LiteralPath $bat)) {
  Write-Host "找不到发布脚本：$bat"
  exit 1
}

Write-Host "=========================================="
Write-Host "  StarMap 影像目录监视（自动发布）"
Write-Host "  监视目录：$inbox"
Write-Host "  防抖等待：$DebounceSeconds 秒（安静下来后才开始发布）"
Write-Host "  停止：关闭本窗口或 Ctrl+C"
Write-Host "=========================================="

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $inbox
$watcher.IncludeSubdirectories = $true
$watcher.Filter = "*.*"
$watcher.NotifyFilter = [System.IO.NotifyFilters]::FileName -bor [System.IO.NotifyFilters]::LastWrite -bor [System.IO.NotifyFilters]::DirectoryName
$watcher.EnableRaisingEvents = $true

$pending = $false
$lastChange = Get-Date
$running = $false

while ($true) {
  $result = $watcher.WaitForChanged([System.IO.WatcherChangeTypes]::All, 1000)
  if (-not $result.TimedOut) {
    $pending = $true
    $lastChange = Get-Date
    Write-Host ("[{0}] 检测到变化：{1}" -f (Get-Date -Format "HH:mm:ss"), $result.Name)
  }

  if ($pending -and -not $running -and ((Get-Date) - $lastChange).TotalSeconds -ge $DebounceSeconds) {
    $pending = $false
    $running = $true
    Write-Host ("[{0}] 文件夹已安静 {1} 秒，开始自动发布…" -f (Get-Date -Format "HH:mm:ss"), $DebounceSeconds)
    $env:STARMAP_AUTORUN = "1"
    $proc = Start-Process -FilePath $bat -WindowStyle Minimized -PassThru -Wait
    $env:STARMAP_AUTORUN = ""
    Write-Host ("[{0}] 自动发布结束（退出码 {1}）" -f (Get-Date -Format "HH:mm:ss"), $proc.ExitCode)
    $running = $false
    $lastChange = Get-Date
  }
}
