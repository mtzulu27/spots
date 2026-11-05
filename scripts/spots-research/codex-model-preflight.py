#!/usr/bin/env python3
"""Local launcher: verify inference before handing a batch to the installed queue."""
import argparse
import json
import os
import pathlib
import signal
import subprocess
import sys
import tempfile
import threading
import time
import uuid

SKILL = pathlib.Path.home() / '.codex/skills/spots-crear-actualizar-lugar'
sys.path.insert(0, str(SKILL / 'scripts/orchestrator'))
import controller

SENTINEL = 'CODEX_MODEL_PROBE_OK'
PROMPT = ('Return exactly ' + SENTINEL + '. Do not use tools, read files, invoke skills, '
          'browse, change files, research any place, start services or publish anything.')


def load_config(file):
    file = pathlib.Path(file).resolve()
    config = json.loads(file.read_text())
    if config.get('version') != 1:
        raise ValueError('Unsupported local runtime configuration')
    binary = pathlib.Path(config['codexBinary'])
    if not binary.is_absolute() or not binary.is_file() or not os.access(binary, os.X_OK):
        raise ValueError('Configured Codex executable is missing or not executable')
    controller.validate_model(config.get('model'))
    if not config.get('model'):
        raise ValueError('An explicit verified model is required; no implicit fallback')
    root = pathlib.Path(config['queueRoot'])
    if not root.is_absolute():
        raise ValueError('queueRoot must be absolute')
    if config.get('workerBinary'):
        worker = pathlib.Path(config['workerBinary'])
        if not worker.is_absolute() or not worker.is_file() or not os.access(worker, os.X_OK):
            raise ValueError('Configured scoped worker executable is unavailable')
    return config


def classify_probe(directory, exit_code):
    final = directory / 'final.txt'
    completed = False
    forbidden = []
    errors = []
    session = None
    events = directory / 'events.jsonl'
    with events.open('rb') as stream:
        while True:
            line = stream.readline(65537)
            if not line:
                break
            if len(line) > 65536:
                while line and not line.endswith(b'\n'):
                    line = stream.readline(65537)
                forbidden.append('oversized_event')
                continue
            try:
                event = json.loads(line)
            except (ValueError, UnicodeError):
                forbidden.append('malformed_event')
                continue
            if not isinstance(event, dict):
                forbidden.append('invalid_event')
                continue
            kind = event.get('type')
            if kind == 'thread.started':
                session = str(event.get('thread_id', ''))[:160]
            if kind == 'turn.completed':
                completed = True
            if kind in ('error', 'turn.failed'):
                error = event.get('error', {})
                message = str(event.get('message') or (error.get('message', '') if isinstance(error, dict) else error))
                errors.append('model_not_found' if 'model_not_found' in message else 'request_failed')
            if kind in ('item.started', 'item.completed'):
                item = event.get('item', {})
                if not isinstance(item, dict):
                    forbidden.append('invalid_item')
                    continue
                item_type = item.get('type')
                if item_type not in ('agent_message', 'reasoning', 'error'):
                    forbidden.append(str(item_type)[:80])
    exact = final.is_file() and final.stat().st_size < 200 and final.read_text().strip() == SENTINEL
    ok = exit_code == 0 and completed and exact and not errors and not forbidden
    return {'status': 'model_compatible' if ok else ('model_incompatible' if 'model_not_found' in errors else 'probe_failed'),
            'ok': ok, 'exitCode': exit_code, 'sessionId': session, 'turnCompleted': completed,
            'sentinelMatched': exact, 'unexpectedItems': forbidden[:8], 'errorClasses': sorted(set(errors))}


def probe(config, timeout=90, stop=None):
    directory = pathlib.Path(config['queueRoot']) / 'runtime-probes' / str(uuid.uuid4())
    directory.mkdir(parents=True, mode=0o700)
    binary = config['codexBinary']
    version = subprocess.run([binary, '--version'], capture_output=True, text=True, timeout=15)
    controller.check_cli(binary, config['model'])
    started = time.monotonic()
    process = None
    code = 1
    status = 'exited'
    stop = stop or threading.Event()
    with tempfile.TemporaryDirectory(prefix='spots-codex-compat-') as cwd:
        command = [binary, 'exec', '--ephemeral', '--json', '--color', 'never', '--sandbox', 'read-only',
                   '--skip-git-repo-check', '--cd', cwd, '--model', config['model'],
                   '--output-last-message', str(directory / 'final.txt'), '-']
        controller.atomic(directory / 'invocation.json', {'command': command, 'prompt': PROMPT,
                          'purpose': 'Inference compatibility only; no place skill or APIs', 'version': version.stdout.strip()})
        try:
            with (directory / 'events.jsonl').open('wb') as stdout, (directory / 'stderr.log').open('wb') as stderr:
                process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=stdout, stderr=stderr,
                                           start_new_session=True)
                process.stdin.write(PROMPT.encode())
                process.stdin.close()
                while process.poll() is None:
                    if stop.is_set() or time.monotonic() - started >= timeout:
                        status = 'cancelled' if stop.is_set() else 'timeout'
                        break
                    stop.wait(.1)
                if process.poll() is not None:
                    code = process.returncode
        finally:
            if process is not None and process.poll() is None:
                os.killpg(process.pid, signal.SIGTERM)
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGKILL)
                    process.wait()
                code = process.returncode
    result = classify_probe(directory, code)
    result.update(model=config['model'], binary=binary, version=version.stdout.strip(),
                  processStatus=status, seconds=round(time.monotonic() - started, 3),
                  report=str(directory / 'result.json'), placeAttemptsConsumed=0)
    controller.atomic(directory / 'result.json', result)
    controller.atomic(pathlib.Path(config['queueRoot']) / 'last-model-preflight.json', result)
    return result


def execute_batch(config, limit=1, concurrency=1, timeout=1800, stop=None):
    if not 1 <= limit <= 3 or not 1 <= concurrency <= 4:
        raise ValueError('Use small batches of 1..3 places, concurrency 1..4')
    # Never claim/recover/retry a place until the actual inference probe succeeds.
    preflight = probe(config, stop=stop)
    if not preflight['ok']:
        return {'status': 'batch_not_started', 'reason': preflight['status'],
                'modelPreflight': preflight['report'], 'started': 0, 'placeAttemptsConsumed': 0}
    queue = controller.Queue(config['queueRoot'])
    return controller.run(queue, binary=config.get('workerBinary', config['codexBinary']), model=config['model'],
                          limit=limit, concurrency=concurrency, timeout=timeout,
                          execute=True, stop=stop)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--config', required=True)
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('preflight')
    run = sub.add_parser('run')
    run.add_argument('--execute', action='store_true')
    run.add_argument('--limit', type=int, default=1)
    run.add_argument('--concurrency', type=int, default=1)
    run.add_argument('--timeout', type=int, default=1800)
    args = parser.parse_args()
    stop = threading.Event()
    for signum in (signal.SIGTERM, signal.SIGINT):
        signal.signal(signum, lambda *_: stop.set())
    config = load_config(args.config)
    if args.command == 'run' and not args.execute:
        parser.error('--execute is required; no probe or place was started')
    try:
        result = probe(config, stop=stop) if args.command == 'preflight' else execute_batch(
            config, args.limit, args.concurrency, args.timeout, stop)
        controller.emit(result, pathlib.Path(config['queueRoot']) / 'runtime-output')
        return 0 if result.get('ok', result.get('status') != 'batch_not_started') else 2
    except (ValueError, OSError, subprocess.TimeoutExpired) as error:
        controller.emit({'status': 'batch_not_started', 'reason': str(error)[:300],
                         'started': 0, 'placeAttemptsConsumed': 0})
        return 2


if __name__ == '__main__':
    sys.exit(main())
