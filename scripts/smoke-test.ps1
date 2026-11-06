# Installs the built setup silently, starts the installed app with no dev server, captures
# only its window, then uninstalls it. Usage: scripts\smoke-test.ps1 <setup.exe> <output.png>
param([string]$Setup, [string]$Screenshot)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System; using System.Runtime.InteropServices;
public struct Rect { public int L, T, R, B; }
public static class Win32 {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out Rect r);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
}
"@

$devServer = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
if ($devServer) { throw "A dev server is running on port 5173, so this wouldn't prove the app is standalone." }

$installDir = Join-Path $env:LOCALAPPDATA "OpenTrainer"
$dataDir = Join-Path $env:LOCALAPPDATA "io.github.ahmadreza-log.opentrainer"

Start-Process -FilePath $Setup -ArgumentList "/S" -Wait
$app = Join-Path $installDir "opentrainer.exe"
if (-not (Test-Path $app)) { throw "The installer didn't create $app" }
"Installed: $app ($((Get-Item $app).Length) bytes)"

$process = Start-Process -FilePath $app -PassThru
try {
  $deadline = (Get-Date).AddSeconds(30)
  do {
    Start-Sleep -Milliseconds 500
    $process.Refresh()
    if ($process.HasExited) { throw "The app exited with code $($process.ExitCode)" }
  } until ($process.MainWindowHandle -ne 0 -or (Get-Date) -gt $deadline)
  if ($process.MainWindowHandle -eq 0) { throw "No window appeared." }
  "Window title: $($process.MainWindowTitle)"

  Start-Sleep -Seconds 6
  [void][Win32]::SetForegroundWindow($process.MainWindowHandle)
  Start-Sleep -Seconds 1
  $rect = New-Object Rect
  [void][Win32]::GetWindowRect($process.MainWindowHandle, [ref]$rect)
  $bitmap = New-Object System.Drawing.Bitmap ($rect.R - $rect.L), ($rect.B - $rect.T)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.CopyFromScreen($rect.L, $rect.T, 0, 0, $bitmap.Size)
  $bitmap.Save($Screenshot, [System.Drawing.Imaging.ImageFormat]::Png)
  "Saved window capture."

  "Data folder files: " + ((Get-ChildItem $dataDir -File -Name) -join ", ")
  $webview = Get-CimInstance Win32_Process -Filter "Name='msedgewebview2.exe'" |
    Where-Object { $_.CommandLine -like "*io.github.ahmadreza-log.opentrainer*" }
  "WebView2 processes for this app: $(@($webview).Count)"
  "App memory: $([math]::Round($process.WorkingSet64 / 1MB)) MB"
} finally {
  if (-not $process.HasExited) { Stop-Process -Id $process.Id -Force }
  Start-Sleep -Seconds 2
  Start-Process -FilePath (Join-Path $installDir "uninstall.exe") -ArgumentList "/S" -Wait
  Start-Sleep -Seconds 3
  "Removed after uninstall: $(-not (Test-Path $app))"
}
