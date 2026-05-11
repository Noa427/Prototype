#!/usr/bin/env bash

PROJECT_DIR="$HOME/Documents/N.C.C./antigravity-proto"
cd "$PROJECT_DIR"

echo "🐘 Démarrage PostgreSQL..."
podman start postgres-antigravity 2>/dev/null
echo "  OK"

echo "🔄 Migration base de données..."
source .venv/bin/activate
python -m alembic upgrade head
echo "  OK"

echo ""
echo "✅ Environnement prêt !"
