param(
  [string]$Region = "us-east-1",
  [string]$Stage = "dev",
  [switch]$Google,
  [switch]$Facebook,
  [switch]$WriteDeployScript
)

$ErrorActionPreference = "Stop"

function Convert-SecureStringToPlainText {
  param([securestring]$Value)

  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
  try {
    [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    if ($bstr -ne [IntPtr]::Zero) {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
  }
}

function Upsert-SecureParameterValue {
  param(
    [string]$Name,
    [string]$Value,
    [string]$Region
  )

  aws ssm put-parameter `
    --name $Name `
    --type SecureString `
    --value $Value `
    --overwrite `
    --region $Region *> $null

  if ($LASTEXITCODE -ne 0) {
    throw "Failed to write secure parameter $Name in $Region."
  }
}

if (-not $Google -and -not $Facebook) {
  throw "Pass -Google, -Facebook, or both."
}

$context = [ordered]@{
  projectName = "despensalista"
  stage = $Stage
  awsRegion = $Region
  localFrontendBaseUrl = "http://localhost:48673"
  productionFrontendBaseUrl = ""
  removalPolicy = "retain"
  deletionProtection = $false
}
$providers = @()

if ($Google) {
  $googleSecret = Convert-SecureStringToPlainText `
    (Read-Host "Google OAuth Client Secret" -AsSecureString)
  $googleSecretName = "/despensalista/$Stage/google-client-secret"

  Upsert-SecureParameterValue `
    -Name $googleSecretName `
    -Value $googleSecret `
    -Region $Region
  $googleSecret = $null

  $providers += "Google"
}

if ($Facebook) {
  $facebookSecret = Convert-SecureStringToPlainText `
    (Read-Host "Facebook App Secret" -AsSecureString)
  $facebookSecretName = "/despensalista/$Stage/facebook-client-secret"

  Upsert-SecureParameterValue `
    -Name $facebookSecretName `
    -Value $facebookSecret `
    -Region $Region
  $facebookSecret = $null

  $providers += "Facebook"
}

$context.externallyManagedSocialProviders = $providers -join ","

function Convert-ContextToArguments {
  param([System.Collections.IDictionary]$Context)

  $arguments = @()
  foreach ($key in $Context.Keys) {
    $value = $Context[$key]
    if ($value -is [bool]) {
      $value = $value.ToString().ToLowerInvariant()
    }

    $arguments += "--context $key=$value"
  }

  $arguments
}

$deployArguments = Convert-ContextToArguments -Context $context

if ($WriteDeployScript) {
  $deployScriptPath = Join-Path $PSScriptRoot "..\Deploy-SocialProviders.local.ps1"
  $deployScriptLines = @(
    '$ErrorActionPreference = "Stop"',
    'npx cdk deploy --require-approval never `'
  )

  for ($index = 0; $index -lt $deployArguments.Count; $index++) {
    $suffix = if ($index -lt ($deployArguments.Count - 1)) {
      " $([char]96)"
    } else {
      ""
    }
    $deployScriptLines += "  $($deployArguments[$index])$suffix"
  }

  $deployScriptLines | Set-Content -Path $deployScriptPath -Encoding utf8
  Write-Host "Wrote local deploy script to $deployScriptPath"
}

Write-Host "Social provider secrets were written to SSM SecureString parameters in $Region."
Write-Host "Next deploy command:"
Write-Host ("npx cdk deploy --require-approval never " + ($deployArguments -join ' '))
