import importlib.util
import json
import pathlib
import tempfile
import threading
import unittest
from unittest.mock import patch

MODULE = pathlib.Path(__file__).with_name('codex-model-preflight.py')
spec = importlib.util.spec_from_file_location('spots_model_preflight', MODULE)
preflight = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preflight)

FIXTURE = '''#!/usr/bin/env python3
import json, pathlib, sys, time, uuid
if '--version' in sys.argv:
 print('codex-cli fixture'); sys.exit(0)
if '--help' in sys.argv:
 print('--ephemeral --json --output-schema --output-last-message --sandbox --cd --add-dir --model'); sys.exit(0)
prompt=sys.stdin.read()
model=sys.argv[sys.argv.index('--model')+1]
if model=='timeout': time.sleep(10)
print(json.dumps({'type':'thread.started','thread_id':str(uuid.uuid4())}))
if model=='unsupported':
 print(json.dumps({'type':'error','message':'model_not_found'}));sys.exit(1)
if model=='tools':
 print(json.dumps({'type':'item.started','item':{'type':'mcp_tool_call'}}))
if model=='malformed': print('invalid JSON event')
out=pathlib.Path(sys.argv[sys.argv.index('--output-last-message')+1])
out.write_text('CODEX_MODEL_PROBE_OK')
if model!='incomplete':print(json.dumps({'type':'turn.completed','usage':{'output_tokens':10}}))
'''


class PreflightTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='spots-model-preflight-test-')
        self.root = pathlib.Path(self.temp.name)
        self.binary = self.root / 'codex-fixture'
        self.binary.write_text(FIXTURE)
        self.binary.chmod(0o700)
        self.config = {'version': 1, 'queueRoot': str(self.root / 'queue'),
                       'codexBinary': str(self.binary), 'model': 'fixture'}

    def tearDown(self):
        self.temp.cleanup()

    def test_success_requires_actual_completed_turn_and_sentinel(self):
        result = preflight.probe(self.config)
        self.assertTrue(result['ok'])
        self.assertEqual(result['placeAttemptsConsumed'], 0)
        invocation = json.loads(pathlib.Path(result['report']).with_name('invocation.json').read_text())
        self.assertIn('--ephemeral', invocation['command'])
        self.assertIn('read-only', invocation['command'])
        self.assertNotIn('resume', invocation['command'])
        self.assertFalse((self.root / 'queue' / 'queue.sqlite3').exists())

    def test_unsupported_model_does_not_claim_or_recover_any_place(self):
        self.config['model'] = 'unsupported'
        with patch.object(preflight.controller, 'Queue') as queue, patch.object(preflight.controller, 'run') as run:
            result = preflight.execute_batch(self.config)
            queue.assert_not_called()
            run.assert_not_called()
        self.assertEqual(result['status'], 'batch_not_started')
        self.assertEqual(result['reason'], 'model_incompatible')
        self.assertEqual(result['placeAttemptsConsumed'], 0)

    def test_sentinel_without_completion_or_unexpected_tool_is_rejected(self):
        for model in ['incomplete', 'tools', 'malformed']:
            result = preflight.probe({**self.config, 'model': model})
            self.assertFalse(result['ok'])

    def test_every_batch_gets_fresh_probe_not_cached_compatibility(self):
        with patch.object(preflight.controller, 'run', return_value={'status': 'stopped'}) as run:
            preflight.execute_batch(self.config)
            preflight.execute_batch(self.config)
        reports = list((self.root / 'queue' / 'runtime-probes').glob('*/result.json'))
        self.assertEqual(len(reports), 2)
        self.assertEqual(len({json.loads(p.read_text())['sessionId'] for p in reports}), 2)
        self.assertEqual(run.call_count, 2)
        self.assertEqual(run.call_args.kwargs['model'], 'fixture')
        self.assertEqual(run.call_args.kwargs['binary'], str(self.binary))

    def test_timeout_and_cancellation_reap_own_probe(self):
        for stop in [None, threading.Event()]:
            if stop is not None:
                stop.set()
            result = preflight.probe({**self.config, 'model': 'timeout'}, timeout=.2, stop=stop)
            self.assertFalse(result['ok'])
            self.assertIn(result['processStatus'], ['timeout', 'cancelled'])

    def test_invalid_configuration_or_batch_bounds_launch_nothing(self):
        file = self.root / 'runtime.json'
        file.write_text(json.dumps({**self.config, 'model': '--bad'}))
        with self.assertRaises(ValueError):
            preflight.load_config(file)
        with patch.object(preflight, 'probe') as probe:
            with self.assertRaises(ValueError):
                preflight.execute_batch(self.config, limit=282)
            probe.assert_not_called()


if __name__ == '__main__':
    unittest.main()
