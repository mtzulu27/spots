#!/usr/bin/env python3
"""Scoped Codex launcher; retains filesystem sandbox and inherited queue locks."""
import json
import os
import pathlib
import sys

PROJECT = pathlib.Path(__file__).resolve().parents[2]
DEFAULT_CONFIG = PROJECT / 'docs/catalog-review/central-20261103/controller-live/runtime.json'


def worker_command(args, config, project=PROJECT):
    binary = config['codexBinary']
    if args in (['--version'], ['exec', '--help']):
        return [binary, *args]
    forbidden = {'--dangerously-bypass-approvals-and-sandbox', '--dangerously-bypass-hook-trust',
                 '--ignore-user-config', '--ignore-rules', '--config', '-c', '--profile', '-p',
                 '--oss', '--worktree', 'resume', 'fork', 'review'}
    if not args or args[0] != 'exec' or any(x in forbidden or x.startswith('--config=') for x in args):
        raise ValueError('Only a fresh scoped worker execution is allowed')
    def value(flag):
        if args.count(flag) != 1 or args.index(flag) + 1 >= len(args):
            raise ValueError('Exactly one ' + flag + ' is required')
        return args[args.index(flag) + 1]
    if pathlib.Path(value('--cd')).resolve() != pathlib.Path(project).resolve():
        raise ValueError('Worker must stay in the Spots project')
    if value('--sandbox') != 'workspace-write' or value('--model') != config['model']:
        raise ValueError('Keep the configured model and filesystem sandbox')
    if '--ephemeral' not in args or '--output-schema' not in args or args[-1] != '-':
        raise ValueError('Worker requires ephemeral schema-constrained execution via stdin')
    prefix = ['-c', 'sandbox_workspace_write.network_access=true'] if config.get('workerNetworkAccess') is True else []
    return [binary, *prefix, *args]


def main():
    config = json.loads(pathlib.Path(os.environ.get('SPOTS_ORCHESTRATOR_RUNTIME_CONFIG', DEFAULT_CONFIG)).read_text())
    try:
        command = worker_command(sys.argv[1:], config)
        if '--output-schema' in sys.argv:
            for key, env, maximum in [('workerChatChars', 'SPOTS_CHAT_CHARS', 100000),
                                      ('workerStdoutChars', 'SPOTS_STDOUT_CHARS', 4000)]:
                if key in config:
                    value = config[key]
                    if type(value) is not int or not 512 <= value <= maximum:
                        raise ValueError('Invalid scoped output budget: ' + key)
                    os.environ[env] = str(value)
        # Full read evidence goes to the private dossier via the existing capture
        # client; do not require writes to API Anything's home result cache.
        os.environ['PATH'] = str(PROJECT / 'scripts/spots-research/api-file-output/bin') + os.pathsep + os.environ.get('PATH', '')
        # exec preserves the catalog/attempt lock descriptors passed by the controller.
        os.execv(command[0], command)
    except (ValueError, OSError) as error:
        sys.stderr.write(json.dumps({'status': 'worker_configuration_rejected', 'reason': str(error)[:300]}) + '\n')
        return 2


if __name__ == '__main__':
    sys.exit(main())
