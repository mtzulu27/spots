#!/usr/bin/env python3
"""Task adapter: explicit 2026-11-04 user instruction to advance past blocked jobs.
Keeps the original queue, attempt limits, validation, catalog guard and evidence.
"""
import argparse
import importlib.util
import pathlib
import signal
import threading
import time
import uuid

SKILL = pathlib.Path('/Users/mateo/.codex/skills/spots-crear-actualizar-lugar')
spec = importlib.util.spec_from_file_location('spots_controller', SKILL / 'scripts/orchestrator/controller.py')
controller = importlib.util.module_from_spec(spec)
spec.loader.exec_module(controller)

class AdvancingQueue(controller.Queue):
    def stats(self):
        result = super().stats()
        with self.connect() as db:
            row = db.execute("SELECT id,name,status FROM jobs WHERE status IN ('pendiente','en_proceso') ORDER BY position LIMIT 1").fetchone()
            deferred = db.execute("SELECT count(*) FROM jobs WHERE status IN ('bloqueado','requiere_revision')").fetchone()[0]
        result['nextEligible'] = dict(row) if row else None
        result['deferredUnresolved'] = deferred
        result['advancePolicy'] = 'User authorized advancing past blocked/review jobs; these remain incomplete.'
        with controller.file_lock(self.root / 'progress.lock', blocking=True):
            controller.atomic(self.root / 'progress.json', result)
        return result

    def claim(self):
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            if controller.json.loads(db.execute("SELECT value FROM settings WHERE key='paused'").fetchone()[0]):
                db.rollback()
                return None
            # Never skip a live worker. Only terminal blocked/review jobs are bypassed.
            if db.execute("SELECT 1 FROM jobs WHERE status='en_proceso'").fetchone():
                db.rollback()
                return None
            row = db.execute("SELECT * FROM jobs WHERE status='pendiente' ORDER BY position LIMIT 1").fetchone()
            if not row:
                db.rollback()
                return None
            if row['attempts'] >= self.config()['maxAttempts']:
                db.execute("UPDATE jobs SET status='requiere_revision',reason='attempt_budget_exhausted' WHERE id=?", (row['id'],))
                db.commit()
                return None
            job = dict(row)
            run_id = str(uuid.uuid4())
            number = row['attempts'] + 1
            directory = self.root / 'attempts' / run_id
            directory.mkdir(parents=True, exist_ok=False)
            db.execute("UPDATE jobs SET status='en_proceso',attempts=?,run_id=?,updated=? WHERE id=?", (number, run_id, time.time(), row['id']))
            db.execute('INSERT INTO attempts(run_id,job_id,number,directory,state,started) VALUES(?,?,?,?,?,?)', (run_id, row['id'], number, str(directory), 'claimed', time.time()))
            db.execute('INSERT INTO history(at,job_id,run_id,event,detail) VALUES(?,?,?,?,?)', (time.time(), row['id'], run_id, 'user_authorized_advance', 'User: si un lugar se bloquea, pasa al siguiente en lista. Preserve stopped jobs and maxAttempts=3.'))
            db.commit()
            job.update(run_id=run_id, attempts=number, directory=str(directory))
            return job

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--root', required=True)
    p.add_argument('--limit', type=int, default=1)
    p.add_argument('--execute', action='store_true')
    p.add_argument('--network-worker', action='store_true', help='Enable HTTP networking per invocation; no global config changes')
    a = p.parse_args()
    q = AdvancingQueue(a.root)
    stop = threading.Event()
    for s in (signal.SIGINT, signal.SIGTERM):
        signal.signal(s, lambda *_: stop.set())
    binary = str(pathlib.Path(__file__).with_name('codex-network-worker.py').resolve()) if a.network_worker else 'codex'
    result = controller.run(q, binary=binary, limit=a.limit, concurrency=1, execute=a.execute, stop=stop)
    controller.emit(result, q.root / 'controller-output')
