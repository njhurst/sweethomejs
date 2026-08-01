#!/usr/bin/env bash
# Runs the DumpHome golden-corpus harness against the upstream model/io code.
# Usage: tools/java-harness/run-dump.sh <input.sh3d> <outputDir>
set -euo pipefail
HARNESS_DIR="$(cd "$(dirname "$0")" && pwd)"
CLASSES="$HARNESS_DIR/classes"
UPSTREAM="$HARNESS_DIR/../../src/SweetHome3D-7.5-src"

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <input.sh3d> <outputDir>" >&2
  exit 2
fi

java -cp "$CLASSES:$UPSTREAM/libtest/AppleJavaExtensions.jar:$UPSTREAM/libtest/javaAwtDesktop.jar" \
  DumpHome "$1" "$2"
