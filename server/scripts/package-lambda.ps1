$ErrorActionPreference = 'Stop'
$serverRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Push-Location $serverRoot
try {
  $stage = Join-Path $serverRoot ('.lambda-build/' + [guid]::NewGuid().ToString())
  New-Item -ItemType Directory -Path $stage -Force | Out-Null
  & node 'node_modules/typescript/bin/tsc' -p tsconfig.json --outDir (Join-Path $stage 'dist')
  if ($LASTEXITCODE -ne 0) { throw 'Backend compilation failed.' }
  Copy-Item -LiteralPath 'package.json','package-lock.json' -Destination $stage
  Push-Location $stage
  try {
    # Fetch Linux prebuilds instead of copying Windows node_modules.
    & npm.cmd ci --omit=dev --include=optional --ignore-scripts --os=linux --cpu=x64 --libc=glibc
    if ($LASTEXITCODE -ne 0) { throw 'Lambda dependency installation failed.' }
    foreach ($required in @(
      'node_modules/@img/sharp-linux-x64/lib/sharp-linux-x64.node',
      'node_modules/argon2/prebuilds/linux-x64/argon2.glibc.node'
    )) {
      if (!(Test-Path -LiteralPath $required)) { throw "Required Linux binary missing: $required" }
    }
    if (!(Get-ChildItem -Path 'node_modules/@img/sharp-libvips-linux-x64/lib/libvips-cpp.so.*' -ErrorAction SilentlyContinue)) { throw 'Linux libvips binary missing.' }
    $archive = Join-Path $serverRoot 'lambda.zip'
    # Windows bsdtar preserves ZIP path separators and handles many small files quickly.
    if (Get-Command tar.exe -ErrorAction SilentlyContinue) {
      & tar.exe -a -c -f $archive dist node_modules package.json
      if ($LASTEXITCODE -ne 0) { throw 'ZIP creation failed.' }
    } else {
      Compress-Archive -LiteralPath 'dist','node_modules','package.json' -DestinationPath $archive -Force
    }
    Write-Output "Lambda ZIP created: $archive (Node.js 22, x86_64, handler dist/lambda.handler)"
    Write-Output 'Environment files and secrets are excluded. Configure Lambda environment variables separately.'
  } finally { Pop-Location }
} finally { Pop-Location }
