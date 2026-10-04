$env:Path = "C:\Program Files\nodejs;" + $env:Path
Set-Location $PSScriptRoot
node "$PSScriptRoot\node_modules\vite\bin\vite.js" build
