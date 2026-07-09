param(
  [string]$EnvFile = '.env.docker.local',
  [string]$VolumeName = 'despensalista_mongodb_data',
  [string]$RepairContainer = 'despensalista-mongodb-credential-repair',
  [switch]$NoStart
)

$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Push-Location $repoRoot

try {
  $envPath = if ([System.IO.Path]::IsPathRooted($EnvFile)) {
    $EnvFile
  } else {
    Join-Path $repoRoot $EnvFile
  }

  if (-not (Test-Path $envPath)) {
    throw "Environment file not found: $envPath"
  }

  $dotenv = @{}
  Get-Content -Path $envPath | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) {
      return
    }

    $parts = $line -split '=', 2
    if ($parts.Count -ne 2) {
      return
    }

    $key = $parts[0].Trim()
    $value = $parts[1].Trim()

    if (
      ($value.StartsWith('"') -and $value.EndsWith('"')) -or
      ($value.StartsWith("'") -and $value.EndsWith("'"))
    ) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    $dotenv[$key] = $value
  }

  $required = @(
    'MONGO_INITDB_ROOT_USERNAME',
    'MONGO_INITDB_ROOT_PASSWORD',
    'MONGO_APP_DATABASE',
    'MONGO_APP_USERNAME',
    'MONGO_APP_PASSWORD'
  )

  foreach ($key in $required) {
    if (-not $dotenv.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($dotenv[$key])) {
      throw "Missing required Docker Mongo setting: $key"
    }
  }

  Write-Host 'Stopping services that use the MongoDB volume...'
  docker compose --env-file $envPath --profile app stop backend mongodb | Out-Host

  docker rm -f $RepairContainer 2>$null | Out-Null

  Write-Host 'Starting temporary no-port MongoDB repair container...'
  $containerId = docker run -d `
    --name $RepairContainer `
    --network none `
    -v "${VolumeName}:/data/db" `
    mongo:7.0 `
    --bind_ip 127.0.0.1

  if (-not $containerId) {
    throw 'Failed to start temporary MongoDB repair container.'
  }

  $ready = $false
  for ($i = 0; $i -lt 45; $i++) {
    docker exec $RepairContainer mongosh --quiet --eval 'quit(db.adminCommand({ ping: 1 }).ok ? 0 : 2)' 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
      $ready = $true
      break
    }

    Start-Sleep -Seconds 1
  }

  if (-not $ready) {
    docker logs --tail 80 $RepairContainer | Out-Host
    throw 'Temporary MongoDB repair container did not become ready.'
  }

  $repairScript = @'
const rootUser = process.env.ROOT_USER;
const rootPassword = process.env.ROOT_PASSWORD;
const appDbName = process.env.APP_DB;
const appUser = process.env.APP_USER;
const appPassword = process.env.APP_PASSWORD;

if (!rootUser || !rootPassword || !appDbName || !appUser || !appPassword) {
  throw new Error('Missing repair environment variables');
}

const adminDb = db.getSiblingDB('admin');
if (adminDb.getUser(rootUser)) {
  adminDb.updateUser(rootUser, {
    pwd: rootPassword,
    roles: [{ role: 'root', db: 'admin' }],
  });
} else {
  adminDb.createUser({
    user: rootUser,
    pwd: rootPassword,
    roles: [{ role: 'root', db: 'admin' }],
  });
}

const appDb = db.getSiblingDB(appDbName);
if (appDb.getUser(appUser)) {
  appDb.updateUser(appUser, {
    pwd: appPassword,
    roles: [{ role: 'readWrite', db: appDbName }],
  });
} else {
  appDb.createUser({
    user: appUser,
    pwd: appPassword,
    roles: [{ role: 'readWrite', db: appDbName }],
  });
}

if (!appDb.getCollectionNames().includes('products')) {
  appDb.createCollection('products');
}

print('Mongo credential repair completed for configured root and app users.');
'@

  $repairScript = ($repairScript -replace "`r?`n", ' ')

  docker exec `
    --env ROOT_USER="$($dotenv['MONGO_INITDB_ROOT_USERNAME'])" `
    --env ROOT_PASSWORD="$($dotenv['MONGO_INITDB_ROOT_PASSWORD'])" `
    --env APP_DB="$($dotenv['MONGO_APP_DATABASE'])" `
    --env APP_USER="$($dotenv['MONGO_APP_USERNAME'])" `
    --env APP_PASSWORD="$($dotenv['MONGO_APP_PASSWORD'])" `
    $RepairContainer mongosh --quiet --eval $repairScript | Out-Host

  docker rm -f $RepairContainer | Out-Null

  if (-not $NoStart) {
    Write-Host 'Starting normal authenticated Docker Compose stack...'
    docker compose --env-file $envPath --profile app up -d | Out-Host
  }
} finally {
  docker rm -f $RepairContainer 2>$null | Out-Null
  Pop-Location
}
