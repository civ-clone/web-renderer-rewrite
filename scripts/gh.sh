#!/usr/bin/env bash
set -euo pipefail

# Always disable paging for predictable non-interactive output.
GH_PAGER=cat gh "$@"

