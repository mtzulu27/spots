#!/usr/bin/env python3
"""Per-invocation network for authorized Spots HTTP research; preserves workspace-write."""
import os,sys
CODEx='/opt/homebrew/bin/codex'
os.execv(CODEx, [CODEx, "-c", "sandbox_workspace_write.network_access=true", *sys.argv[1:]])
