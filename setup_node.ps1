$destDir = "C:\Users\dasar\AppData\Local\Programs\nodejs"
New-Item -ItemType Directory -Force -Path $destDir | Out-Null
$zipPath = Join-Path $env:TEMP "node.zip"
Write-Host "Downloading Node.js..."
curl.exe -L -o $zipPath "https://nodejs.org/dist/v20.18.0/node-v20.18.0-win-x64.zip"
Write-Host "Extracting..."
tar.exe -xf $zipPath -C $destDir --strip-components=1
Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notmatch "nodejs") {
    [Environment]::SetEnvironmentVariable("Path", "$destDir;$userPath", "User")
}
Write-Host "Node setup complete."
& "$destDir\node.exe" -v
& "$destDir\npm.cmd" -v
