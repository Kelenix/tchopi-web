#!/bin/sh
# Site web Tchopi sur le VPS (Ubuntu, root), appelé par la CI ou par deploy/vps.ps1. Guide : docs/mise-en-ligne.md.
#   sh server.sh install <domaine>   première installation : site nginx + HTTPS (certbot), conteneur
#   sh server.sh deploy <archive>    installe la version (archive .tar.gz de la sortie standalone) et relance
# Le nginx, le pare-feu et l'API Tchopi existants ne sont pas modifiés (site ajouté à côté).
set -eu

ROOT=/opt/tchopi-web
SRC=$ROOT/deploy

install() {
  site=/etc/nginx/sites-available/tchopi-web.conf
  if [ ! -f "$site" ]; then
    sed "s/__DOMAIN__/$1/g" "$SRC/nginx.conf" > "$site"
    ln -sf "$site" /etc/nginx/sites-enabled/tchopi-web.conf
    nginx -t && systemctl reload nginx
  fi
  certbot --nginx -d "$1" -d "www.$1" --non-interactive --redirect --keep-until-expiring
}

deploy() {
  release=$ROOT/releases/$(date +%Y%m%d%H%M%S)
  mkdir -p "$release"
  tar -xzf "$1" -C "$release"
  rm -f "$1"
  # Bascule atomique, puis redémarrage ; les 3 dernières versions restent pour un retour arrière.
  ln -sfn "$release" "$ROOT/current.new" && mv -Tf "$ROOT/current.new" "$ROOT/current"
  docker compose -f "$SRC/compose.yml" -p tchopi-web up -d --force-recreate --wait
  ls -1dt "$ROOT"/releases/* | tail -n +4 | xargs -r rm -rf
}

case "${1:-}" in
  install) install "$2" ;;
  deploy) deploy "$2" ;;
  *) sed -n '2,5p' "$0"; exit 1 ;;
esac
