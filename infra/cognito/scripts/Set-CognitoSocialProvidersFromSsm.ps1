param(
  [Parameter(Mandatory = $true)]
  [string]$UserPoolId,
  [Parameter(Mandatory = $true)]
  [string]$UserPoolClientId,
  [Parameter(Mandatory = $true)]
  [string]$GoogleClientId,
  [string]$GoogleClientSecretParameterName = "/despensalista/prod/google-client-secret",
  [Parameter(Mandatory = $true)]
  [string]$FacebookClientId,
  [string]$FacebookClientSecretParameterName = "/despensalista/prod/facebook-client-secret",
  [string]$FacebookApiVersion = "v17.0",
  [string]$Region = "us-east-1",
  [string]$Profile = "ADMIN-AIM-CLI"
)

$ErrorActionPreference = "Stop"

function Get-SecureParameterValue {
  param([string]$Name)

  aws ssm get-parameter `
    --name $Name `
    --with-decryption `
    --region $Region `
    --profile $Profile `
    --query "Parameter.Value" `
    --output text
}

function Invoke-WithProviderDetailsFile {
  param(
    [hashtable]$ProviderDetails,
    [scriptblock]$Command
  )

  $temp = New-TemporaryFile
  try {
    $ProviderDetails | ConvertTo-Json -Compress | Set-Content -Path $temp -Encoding utf8NoBOM
    & $Command "file://$temp"
  } finally {
    Remove-Item $temp -Force -ErrorAction SilentlyContinue
  }
}

function Test-ProviderExists {
  param([string]$ProviderName)

  aws cognito-idp describe-identity-provider `
    --user-pool-id $UserPoolId `
    --provider-name $ProviderName `
    --region $Region `
    --profile $Profile *> $null

  $LASTEXITCODE -eq 0
}

function Upsert-GoogleProvider {
  $secret = Get-SecureParameterValue -Name $GoogleClientSecretParameterName
  $details = @{
    client_id = $GoogleClientId
    client_secret = $secret
    authorize_scopes = "email profile openid"
  }
  $mapping = "email=email,name=name,preferred_username=email"

  Invoke-WithProviderDetailsFile -ProviderDetails $details -Command {
    param($detailsFile)
    if (Test-ProviderExists -ProviderName "Google") {
      aws cognito-idp update-identity-provider --user-pool-id $UserPoolId --provider-name Google --provider-details $detailsFile --attribute-mapping $mapping --region $Region --profile $Profile *> $null
    } else {
      aws cognito-idp create-identity-provider --user-pool-id $UserPoolId --provider-name Google --provider-type Google --provider-details $detailsFile --attribute-mapping $mapping --region $Region --profile $Profile *> $null
    }
  }
}

function Upsert-FacebookProvider {
  $secret = Get-SecureParameterValue -Name $FacebookClientSecretParameterName
  $details = @{
    client_id = $FacebookClientId
    client_secret = $secret
    authorize_scopes = "public_profile, email"
    api_version = $FacebookApiVersion
  }
  $mapping = "email=email,name=name"

  Invoke-WithProviderDetailsFile -ProviderDetails $details -Command {
    param($detailsFile)
    if (Test-ProviderExists -ProviderName "Facebook") {
      aws cognito-idp update-identity-provider --user-pool-id $UserPoolId --provider-name Facebook --provider-details $detailsFile --attribute-mapping $mapping --region $Region --profile $Profile *> $null
    } else {
      aws cognito-idp create-identity-provider --user-pool-id $UserPoolId --provider-name Facebook --provider-type Facebook --provider-details $detailsFile --attribute-mapping $mapping --region $Region --profile $Profile *> $null
    }
  }
}

Upsert-GoogleProvider
Upsert-FacebookProvider

aws cognito-idp update-user-pool-client `
  --user-pool-id $UserPoolId `
  --client-id $UserPoolClientId `
  --supported-identity-providers COGNITO Google Facebook `
  --region $Region `
  --profile $Profile *> $null

Write-Host "Configured Google and Facebook providers for $UserPoolId from SSM SecureString parameters."
