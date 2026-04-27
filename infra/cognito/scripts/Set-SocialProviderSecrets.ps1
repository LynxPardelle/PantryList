param(
  [string]$Region = "us-east-1",
  [string]$Stage = "dev",
  [switch]$Google,
  [switch]$Facebook,
  [switch]$WriteLocalContext
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

function Upsert-SecretValue {
  param(
    [string]$Name,
    [string]$Value,
    [string]$Region
  )

  $exists = $false
  aws secretsmanager describe-secret --secret-id $Name --region $Region *> $null
  if ($LASTEXITCODE -eq 0) {
    $exists = $true
  }

  if ($exists) {
    aws secretsmanager put-secret-value `
      --secret-id $Name `
      --secret-string $Value `
      --region $Region *> $null
  } else {
    aws secretsmanager create-secret `
      --name $Name `
      --secret-string $Value `
      --region $Region *> $null
  }

  if ($LASTEXITCODE -ne 0) {
    throw "Failed to write secret $Name in $Region."
  }
}

if (-not $Google -and -not $Facebook) {
  throw "Pass -Google, -Facebook, or both."
}

$context = [ordered]@{
  projectName = "pantrylist"
  stage = $Stage
  awsRegion = $Region
  localFrontendBaseUrl = "http://localhost:48673"
  productionFrontendBaseUrl = ""
  removalPolicy = "retain"
  deletionProtection = $false
}

if ($Google) {
  $googleClientId = Read-Host "Google OAuth Client ID"
  $googleSecret = Convert-SecureStringToPlainText `
    (Read-Host "Google OAuth Client Secret" -AsSecureString)
  $googleSecretName = "/pantrylist/$Stage/google-client-secret"

  Upsert-SecretValue `
    -Name $googleSecretName `
    -Value $googleSecret `
    -Region $Region
  $googleSecret = $null

  $context.enableGoogle = $true
  $context.googleClientId = $googleClientId
  $context.googleClientSecretName = $googleSecretName
}

if ($Facebook) {
  $facebookClientId = Read-Host "Facebook App ID"
  $facebookSecret = Convert-SecureStringToPlainText `
    (Read-Host "Facebook App Secret" -AsSecureString)
  $facebookSecretName = "/pantrylist/$Stage/facebook-client-secret"

  Upsert-SecretValue `
    -Name $facebookSecretName `
    -Value $facebookSecret `
    -Region $Region
  $facebookSecret = $null

  $context.enableFacebook = $true
  $context.facebookClientId = $facebookClientId
  $context.facebookClientSecretName = $facebookSecretName
}

if ($WriteLocalContext) {
  $contextPath = Join-Path $PSScriptRoot "..\cdk.context.json"
  $context | ConvertTo-Json -Depth 5 | Set-Content -Path $contextPath -Encoding utf8
  Write-Host "Wrote local CDK context to $contextPath"
}

Write-Host "Social provider secrets were written to AWS Secrets Manager in $Region."
Write-Host "Next: run 'npx cdk deploy --require-approval never' from infra/cognito."
