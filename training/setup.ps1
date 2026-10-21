$ErrorActionPreference = 'Stop'
$trainingRoot = $PSScriptRoot
$temporaryDirectory = Join-Path $trainingRoot '.tmp'
New-Item -ItemType Directory -Force -Path $temporaryDirectory | Out-Null
$env:TEMP = $temporaryDirectory
$env:TMP = $temporaryDirectory
$trainingPython = Join-Path $trainingRoot '.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $trainingPython)) {
    python -m venv (Join-Path $trainingRoot '.venv')
    if ($LASTEXITCODE -ne 0) { throw 'Could not create training virtual environment.' }
}
& $trainingPython -m ensurepip --upgrade
if ($LASTEXITCODE -ne 0) { throw 'Could not initialize pip.' }
& $trainingPython -m pip install -r (Join-Path $trainingRoot 'requirements.txt')
if ($LASTEXITCODE -ne 0) { throw 'Could not install training dependencies.' }
& $trainingPython (Join-Path $trainingRoot 'run.py') doctor
if ($LASTEXITCODE -ne 0) { throw 'Training environment check failed.' }
