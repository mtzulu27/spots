import importlib.util
import pathlib
import unittest

file = pathlib.Path(__file__).with_name('codex-spots-worker.py')
spec = importlib.util.spec_from_file_location('spots_worker_scope', file)
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


class WorkerScopeTests(unittest.TestCase):
    def setUp(self):
        self.config = {'codexBinary': '/verified/codex', 'model': 'verified-model', 'workerNetworkAccess': True}
        self.args = ['exec', '--ephemeral', '--json', '--sandbox', 'workspace-write', '--cd', str(worker.PROJECT),
                     '--model', 'verified-model', '--output-schema', '/schema.json', '--output-last-message', '/final.json', '-']

    def test_only_network_setting_added_and_no_bypass(self):
        command = worker.worker_command(self.args, self.config)
        self.assertEqual(command, ['/verified/codex', '-c', 'sandbox_workspace_write.network_access=true', *self.args])
        self.assertIn('workspace-write', command)

    def test_network_permission_is_explicit_not_a_default(self):
        self.assertEqual(worker.worker_command(self.args, {**self.config, 'workerNetworkAccess': False}), ['/verified/codex', *self.args])

    def test_help_and_version_do_not_enable_network(self):
        for args in [['--version'], ['exec', '--help']]:
            self.assertEqual(worker.worker_command(args, self.config), ['/verified/codex', *args])

    def test_changed_scope_model_or_bypass_rejected(self):
        for args in [self.args + ['--dangerously-bypass-approvals-and-sandbox'],
                     ['exec', 'resume', *self.args[1:]], self.args[:-1] + ['-c', 'sandbox_mode="danger-full-access"', '-']]:
            with self.assertRaises(ValueError):
                worker.worker_command(args, self.config)
        for flag, value in [('--cd', '/elsewhere'), ('--sandbox', 'danger-full-access'), ('--model', 'other')]:
            args = list(self.args)
            args[args.index(flag) + 1] = value
            with self.assertRaises(ValueError):
                worker.worker_command(args, self.config)


if __name__ == '__main__':
    unittest.main()
