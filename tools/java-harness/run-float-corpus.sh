#!/usr/bin/env bash
# Regenerates the Float.toString golden corpora (task 1.8).
# Usage: tools/java-harness/run-float-corpus.sh
set -euo pipefail
HARNESS_DIR="$(cd "$(dirname "$0")" && pwd)"
CLASSES="$HARNESS_DIR/classes"
OUT="$HARNESS_DIR/../../test/unit/fixtures"
java -cp "$CLASSES" FloatCorpus "$OUT/float-corpus.txt"
echo "Regenerated $OUT/float-corpus.txt (1M random values)."
echo "The full corpus (65k edge-case bit patterns) is committed; regenerate with:"
echo "  java -cp $CLASSES FloatCorpus $OUT/float-corpus-full.txt --full"
