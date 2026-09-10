#!/usr/bin/env bash
# Instala a skill gerar-avatares-ugc no Claude Code.
#
# Uso:
#   ./install.sh              -> instala global em ~/.claude/skills/
#   ./install.sh /caminho/projeto -> instala em <projeto>/.claude/skills/
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/gerar-avatares-ugc"

if [ $# -ge 1 ]; then
  DEST="$1/.claude/skills"
  ESCOPO="projeto $1"
else
  DEST="$HOME/.claude/skills"
  ESCOPO="global (todos os projetos)"
fi

if [ ! -d "$SRC" ]; then
  echo "ERRO: pasta da skill nao encontrada em $SRC"
  exit 1
fi

if [ -d "$DEST/gerar-avatares-ugc" ]; then
  echo "Ja existe uma skill em $DEST/gerar-avatares-ugc"
  read -r -p "Sobrescrever? [s/N] " resp
  case "$resp" in
    s|S|y|Y) rm -rf "$DEST/gerar-avatares-ugc" ;;
    *) echo "Abortado."; exit 0 ;;
  esac
fi

mkdir -p "$DEST"
cp -R "$SRC" "$DEST/"

echo "OK  skill instalada em $DEST/gerar-avatares-ugc"
echo "    escopo: $ESCOPO"
echo ""

# Checagem de pre-requisitos (informativa, nao bloqueia a instalacao)
echo "Pre-requisitos:"
if command -v node >/dev/null 2>&1; then
  echo "  [ok]    node $(node -v)"
else
  echo "  [falta] node  -> instale em https://nodejs.org"
fi

if command -v python3 >/dev/null 2>&1; then
  if python3 -c "import PIL" >/dev/null 2>&1; then
    echo "  [ok]    python3 + Pillow"
  else
    echo "  [falta] Pillow  -> python3 -m pip install Pillow"
  fi
else
  echo "  [falta] python3"
fi

echo ""
echo "Proximos passos, dentro do projeto onde voce vai gerar as imagens:"
echo "  1. crie um .env na raiz com  GEMINI_API_KEY=AIza..."
echo "  2. mkdir -p _dev/scripts"
echo "  3. cp $DEST/gerar-avatares-ugc/template-gerar-com-referencia.js _dev/scripts/gerar-com-referencia.js"
echo "  4. reinicie o Claude Code e digite  /gerar-avatares-ugc"
