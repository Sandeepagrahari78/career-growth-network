#!/usr/bin/env bash
set -euo pipefail

CLUSTER_NAME="cgn-local"

command -v k3d >/dev/null 2>&1 || {
  echo "Required command is missing: k3d" >&2
  exit 1
}

if k3d cluster list --no-headers 2>/dev/null | awk '{print $1}' | grep -qx "$CLUSTER_NAME"; then
  k3d cluster delete "$CLUSTER_NAME"
else
  echo "k3d cluster $CLUSTER_NAME does not exist; nothing to delete."
fi
