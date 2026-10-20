# Site web Tchopi sur le VPS, piloté depuis ce PC (même accès SSH « tchopi » que le backend : ../tchopi/vps.ps1 cle).
#   .\deploy\vps.ps1 installer tchopi.com   première installation : site nginx, HTTPS, puis première version
#   .\deploy\vps.ps1 deployer               compile et met en ligne la version commitée (la CI le fait à chaque push)
param(
  [Parameter(Mandatory)][ValidateSet('installer', 'deployer')][string]$Action,
  [string]$Domaine
)

$root = Split-Path $PSScriptRoot -Parent

function Fail([string]$message) { Write-Host "ÉCHEC : $message" -ForegroundColor Red; exit 1 }
function Remote([string]$command) {
  ssh tchopi $command
  if ($LASTEXITCODE -ne 0) { Fail "commande sur le VPS : $command" }
}

# Fichiers du serveur (deploy/) envoyés dans /opt/tchopi-web/deploy.
function Send-Deploy {
  Remote 'mkdir -p /opt/tchopi-web/deploy /opt/tchopi-web/releases'
  scp -q "$root\deploy\compose.yml" "$root\deploy\nginx.conf" "$root\deploy\server.sh" tchopi:/opt/tchopi-web/deploy/
  if ($LASTEXITCODE -ne 0) { Fail 'envoi vers le VPS : accès SSH de ce PC configuré ? (../tchopi/docs/deployer-sur-vps.md § 1)' }
}

# Sortie « standalone » + fichiers statiques, empaquetée pour le serveur.
function Send-Build {
  Push-Location $root
  try {
    pnpm install --frozen-lockfile; if ($LASTEXITCODE -ne 0) { Fail 'installation des dépendances' }
    pnpm build; if ($LASTEXITCODE -ne 0) { Fail 'compilation' }
    Copy-Item -Recurse -Force public .next\standalone\public
    Copy-Item -Recurse -Force .next\static .next\standalone\.next\static
    $archive = Join-Path $env:TEMP 'tchopi-web.tar.gz'
    tar -czf $archive -C .next\standalone .
    scp -q $archive tchopi:/tmp/tchopi-web.tar.gz
    if ($LASTEXITCODE -ne 0) { Fail 'envoi de la version' }
    Remove-Item $archive
  } finally {
    Pop-Location
  }
  Remote 'sh /opt/tchopi-web/deploy/server.sh deploy /tmp/tchopi-web.tar.gz'
}

switch ($Action) {
  'installer' {
    if ($Domaine -notmatch '^[a-z0-9-]+(\.[a-z0-9-]+)+$') { Fail 'nom de domaine attendu, ex. tchopi.com' }
    Send-Deploy
    Send-Build
    Remote "sh /opt/tchopi-web/deploy/server.sh install $Domaine"
    Write-Host "Site en ligne : https://$Domaine" -ForegroundColor Green
  }
  'deployer' {
    Send-Deploy
    Send-Build
    Write-Host 'Nouvelle version du site en ligne.' -ForegroundColor Green
  }
}
