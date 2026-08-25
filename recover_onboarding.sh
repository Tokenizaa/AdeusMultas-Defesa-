#!/usr/bin/env bash

# ==============================================================================
# recover_onboarding.sh
# Script para auditoria e recuperação do histórico de commits do Onboarding
# ==============================================================================

set -e

TARGET_DIR="src/components/onboarding"
TARGET_FILE="src/components/onboarding/OnboardingWizard.tsx"
DAYS_AGO="${1:-3}"

echo "=================================================================="
echo "🔍 [1/3] ÚLTIMOS 20 COMMITS EM: $TARGET_DIR"
echo "=================================================================="

if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo "⚠️ O diretório atual não é um repositório Git (.git não encontrado neste ambiente)."
    echo "💡 Dica: Quando executado no seu repositório local ou servidor com histórico Git clonado,"
    echo "   este script listará os commits e gerará o diff com o commit de $DAYS_AGO dias atrás."
    exit 0
fi

git log -n 20 --oneline --decorate --stat -- "$TARGET_DIR"

echo ""
echo "=================================================================="
echo "📅 [2/3] IDENTIFICANDO COMMIT DE ~$DAYS_AGO DIAS ATRÁS"
echo "=================================================================="

# Busca o commit de N dias atrás ou o mais recente antes dessa data
COMMIT_REFERENCE=$(git log -n 1 --before="${DAYS_AGO} days ago" --format="%H" -- "$TARGET_FILE" 2>/dev/null || true)

if [ -z "$COMMIT_REFERENCE" ]; then
    echo "ℹ️ Nenhum commit encontrado com --before='${DAYS_AGO} days ago' para $TARGET_FILE."
    echo "Buscando o commit mais antigo disponível no histórico..."
    COMMIT_REFERENCE=$(git log -n 20 --format="%H" -- "$TARGET_FILE" | tail -n 1)
fi

if [ -n "$COMMIT_REFERENCE" ]; then
    COMMIT_DATE=$(git log -n 1 --format="%cd (%cr)" "$COMMIT_REFERENCE")
    COMMIT_AUTHOR=$(git log -n 1 --format="%an <%ae>" "$COMMIT_REFERENCE")
    COMMIT_MSG=$(git log -n 1 --format="%s" "$COMMIT_REFERENCE")
    
    echo "Commit alvo: $COMMIT_REFERENCE"
    echo "Autor:       $COMMIT_AUTHOR"
    echo "Data:        $COMMIT_DATE"
    echo "Mensagem:    $COMMIT_MSG"
    echo ""
    echo "=================================================================="
    echo "📊 [3/3] COMPARANDO $TARGET_FILE (HEAD vs $COMMIT_REFERENCE)"
    echo "=================================================================="
    git diff "$COMMIT_REFERENCE" HEAD -- "$TARGET_FILE" || true
else
    echo "❌ Nenhum histórico de commits encontrado para o arquivo $TARGET_FILE."
fi

echo ""
echo "=================================================================="
echo "✅ Análise concluída!"
echo "=================================================================="

