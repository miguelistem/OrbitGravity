param(
    [string]$Url
)

$localAppData = [System.Environment]::GetFolderPath('LocalApplicationData')
$logFile = Join-Path $localAppData "BetterMultigravity\dispatcher.log"
$timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")

function Log-Message([string]$msg) {
    $line = "[$timestamp] $msg"
    Add-Content -Path $logFile -Value $line -ErrorAction SilentlyContinue
}

if ([string]::IsNullOrWhiteSpace($Url)) {
    Log-Message "Dispatcher invoked with empty URL. Exiting."
    exit 0
}

Log-Message "Received protocol URL: $Url"

$schemeType = "any"
if ($Url -match '^antigravity-ide:') {
    $schemeType = "antigravity_ide"
} elseif ($Url -match '^antigravity:') {
    $schemeType = "antigravity"
}

$fleetPath = Join-Path $localAppData "BetterMultigravity\fleet_state.json"
$activeTargetPath = Join-Path $localAppData "BetterMultigravity\active_target.txt"

$target = $null
$fleet = $null

if (Test-Path $fleetPath) {
    try {
        $fleet = Get-Content $fleetPath -Raw | ConvertFrom-Json
    } catch {
        Log-Message "Error parsing fleet_state.json: $_"
    }
}

$activeTargetId = $null
if (Test-Path $activeTargetPath) {
    $activeTargetId = (Get-Content $activeTargetPath -Raw).Trim()
}

if ($fleet -and $fleet.instances) {
    # 1. Preferred target: Active target if running
    if ($activeTargetId) {
        $target = $fleet.instances | Where-Object { $_.id -eq $activeTargetId -and $_.status -eq 'running' } | Select-Object -First 1
    }

    # 2. Running instance matching the protocol type
    if (-not $target -and $schemeType -ne 'any') {
        $target = $fleet.instances | Where-Object { $_.status -eq 'running' -and $_.app_type -eq $schemeType } | Select-Object -First 1
    }

    # 3. Any running instance
    if (-not $target) {
        $target = $fleet.instances | Where-Object { $_.status -eq 'running' } | Select-Object -First 1
    }

    # 4. Fallback: Preferred target even if stopped
    if (-not $target -and $activeTargetId) {
        $target = $fleet.instances | Where-Object { $_.id -eq $activeTargetId } | Select-Object -First 1
    }
}

function Find-Binary([string]$type) {
    $candidates = @()
    if ($type -eq "antigravity") {
        $candidates += Join-Path $localAppData "Programs\antigravity\Antigravity.exe"
        $candidates += Join-Path $localAppData "Programs\antigravity\antigravity.exe"
        $candidates += Join-Path $env:ProgramFiles "Antigravity\Antigravity.exe"
        if (${env:ProgramFiles(x86)}) {
            $candidates += Join-Path ${env:ProgramFiles(x86)} "Antigravity\Antigravity.exe"
        }
        $cmd = Get-Command "Antigravity.exe" -ErrorAction SilentlyContinue
        if ($cmd) { $candidates += $cmd.Source }
    } else {
        $candidates += Join-Path $localAppData "Programs\Antigravity IDE\Antigravity IDE.exe"
        $candidates += Join-Path $env:ProgramFiles "Antigravity IDE\Antigravity IDE.exe"
        if (${env:ProgramFiles(x86)}) {
            $candidates += Join-Path ${env:ProgramFiles(x86)} "Antigravity IDE\Antigravity IDE.exe"
        }
        $cmd = Get-Command "Antigravity IDE.exe" -ErrorAction SilentlyContinue
        if ($cmd) { $candidates += $cmd.Source }
    }

    foreach ($c in $candidates) {
        if ($c -and (Test-Path $c)) {
            return $c
        }
    }
    return $null
}

if ($target) {
    $instName = $target.name
    $profileDir = $target.profile_dir
    $appType = if ($target.app_type) { $target.app_type } else { "antigravity_ide" }
    
    Log-Message "Selected target instance '$instName' (appType: $appType, profile: $profileDir)"

    $dataDir = Join-Path $profileDir "data"
    $extDir = Join-Path $profileDir "extensions"

    $binary = $null
    if ($target.binary_path -and (Test-Path $target.binary_path)) {
        $binary = $target.binary_path
    } else {
        $binary = Find-Binary $appType
    }

    if (-not $binary) {
        # Fallback to whatever binary is available on the machine
        $binary = Find-Binary "antigravity_ide"
        if (-not $binary) { $binary = Find-Binary "antigravity" }
    }

    if ($binary) {
        Log-Message "Spawning binary '$binary' with profile data '$dataDir' for URL '$Url'"
        if ($binary -like "*Antigravity IDE*") {
            Start-Process -FilePath $binary -ArgumentList @(
                "--user-data-dir=$dataDir",
                "--extensions-dir=$extDir",
                "--open-url",
                "--",
                $Url
            )
        } else {
            Start-Process -FilePath $binary -ArgumentList @(
                "--user-data-dir=$dataDir",
                $Url
            )
        }
        Log-Message "Dispatch completed successfully."
        exit 0
    }
}

# Fallback to default binaries if no profile found
Log-Message "No profile instance active. Falling back to default system binary."
$fallbackBinary = Find-Binary $schemeType
if (-not $fallbackBinary) {
    $fallbackBinary = Find-Binary "antigravity_ide"
    if (-not $fallbackBinary) { $fallbackBinary = Find-Binary "antigravity" }
}

if ($fallbackBinary) {
    if ($fallbackBinary -like "*Antigravity IDE*") {
        Start-Process -FilePath $fallbackBinary -ArgumentList @("--open-url", "--", $Url)
    } else {
        Start-Process -FilePath $fallbackBinary -ArgumentList @($Url)
    }
}
