#!/usr/bin/env bash
# Runs the BuildFixture golden-corpus generator (task 1.6).
# Usage: tools/java-harness/run-build-fixtures.sh [outputDir]
set -euo pipefail
HARNESS_DIR="$(cd "$(dirname "$0")" && pwd)"
CLASSES="$HARNESS_DIR/classes"
UPSTREAM="$HARNESS_DIR/../../src/SweetHome3D-7.5-src"
OUT="${1:-$HARNESS_DIR/../../test/fixtures/generated}"

java -cp "$CLASSES:$UPSTREAM/libtest/AppleJavaExtensions.jar:$UPSTREAM/libtest/javaAwtDesktop.jar" \
  BuildFixture "$OUT"
