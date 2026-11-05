import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initialize, validate, seal, report, compare, main } from './lab.mjs';

const workspaces = [];
after(() => workspaces.forEach(root => fs.rmSync(root, { recursive: true, force: true })));
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const save = (file, value) => fs.writeFileSync(file, JSON.stringify(value));
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aE8sAAAAASUVORK5CYII=', 'base64');

function setup({ mode = 'usability', cohort = 'student', version = 'fixture-v1', planPatch = {}, packet = false } = {}) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'spots-skill-fixture-'));
  workspaces.push(workspace);
  const plan = { tasks: [{ id: 'choose', goal: 'Choose a suitable place without submitting anything.', max_steps: 5, criteria: [{ id: 'observed', description: 'Evaluator-only fixture criterion.' }] }], environment: { viewport: { width: 390, height: 844 }, locale: 'es-CO', timezone: 'America/Bogota', auth: 'guest', writes: 'none' }, discussion_round_limit: 2, ...planPatch };
  const planPath = path.join(workspace, 'plan.json'); save(planPath, plan);
  const options = { workspace, url: 'http://localhost:8082/explore', feature: 'fixture-feature', version, plan: planPath, mode, cohort, model: 'fixture-model', driver: 'fixture-driver' };
  if (packet) {
    const image = path.join(workspace, 'source.png'); fs.writeFileSync(image, png);
    options.packet = path.join(workspace, 'packet.json'); save(options.packet, { sources: [{ id: 'screen', path: image }] });
  }
  const result = initialize(options);
  return { workspace, options, root: result.run, result };
}

function mutateTrial(root, fn) {
  const file = path.join(root, json(path.join(root, 'study.json')).trials[0].path);
  const value = json(file); fn(value); save(file, value);
}

function completeTrials(root) {
  const study = json(path.join(root, 'study.json'));
  fs.writeFileSync(path.join(root, 'evidence/screen.png'), png);
  for (const entry of study.trials) {
    const file = path.join(root, entry.path);
    const trial = json(file);
    Object.assign(trial, {
      outcome: 'completed', method: 'browser', actor: 'coordinator-perspective', isolation: 'shared',
      actions: [{ action: 'Fixture action, not real app usage', url: study.target_url, evidence_ids: ['screen'] }],
      evidence: [{ id: 'screen', kind: 'screenshot', path: 'evidence/screen.png' }],
      observations: [{ text: 'Fixture observation only', evidence_ids: ['screen'] }],
      checks: study.plan.tasks.find(t => t.id === entry.task_id).criteria.map(c => ({ criterion_id: c.id, verdict: 'pass', evidence_ids: ['screen'], note: 'Synthetic test fixture, not a real evaluator result.' })),
    });
    save(file, trial);
  }
}

function cleanup(root, resources = []) { save(path.join(root, 'cleanup.json'), { reviewed: true, owned_resources: resources, limitations: [] }); }
function discuss(root) {
  const study = json(path.join(root, 'study.json'));
  const ref = study.mode === 'discussion' ? 'material:screen' : `${study.trials[0].id}:screen`;
  save(path.join(root, 'discussion.json'), { status: 'completed', basis_sha256: json(path.join(root, 'seal.json')).sha256, responses: study.personas.map(p => ({ persona_id: p.id, round: 1, text: 'Fixture opinion, not user feedback.', evidence_refs: [ref] })), limitations: ['Fixture only.'] });
}

test('initialization records an unexecuted cohort and does not leak evaluator criteria into briefs', () => {
  const { root, result } = setup({ mode: 'hybrid', cohort: 'student,visitor' });
  assert.equal(result.trials, 2);
  assert.equal(validate(root).counts['not-run'], 2);
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'briefs/student.md'), 'utf8'), /Evaluator-only fixture criterion/);
  assert.equal(report(root).status, 'partial-not-final');
  assert.throws(() => report(root, { final: true }), /Unexecuted trial/);
  assert.throws(() => seal(root), /Unexecuted trial/);
});

test('init refuses unknown personas, unsafe URLs and existing run directories', () => {
  const { options } = setup();
  assert.throws(() => initialize({ ...options, cohort: 'invented' }), /Unknown or empty cohort/);
  assert.throws(() => initialize({ ...options, url: 'https://spots.com.co/?access_token=secret' }), /credentials/);
  const first = initialize({ ...options, 'run-id': 'fixed' });
  assert.ok(first.run.endsWith('fixed'));
  assert.throws(() => initialize({ ...options, 'run-id': 'fixed' }), /already exists/);
});

test('removing a planned trial cannot turn an incomplete study into a complete one', () => {
  const { root } = setup(); const file = path.join(root, 'study.json');
  const study = json(file); study.trials = []; save(file, study);
  assert.throws(() => validate(root), /inventory/);
});

test('completed browser results require screenshots, observations and all criteria verified', () => {
  const { root } = setup(); completeTrials(root);
  mutateTrial(root, t => { t.checks[0].verdict = 'unknown'; });
  assert.throws(() => validate(root), /unverified criteria/);
  completeTrials(root); mutateTrial(root, t => { t.method = 'artifact'; });
  assert.throws(() => validate(root), /browser execution/);
  completeTrials(root); mutateTrial(root, t => { t.observations = []; });
  assert.throws(() => validate(root), /observations/);
});

test('a new tab/shared storage cannot be recorded as independent-agent isolation', () => {
  const { root } = setup(); completeTrials(root);
  mutateTrial(root, t => { t.actor = 'independent-agent'; });
  assert.throws(() => validate(root), /verified storage isolation/);
});

test('unknown evidence, forged image headers and path traversal are rejected', () => {
  const { root, workspace } = setup(); completeTrials(root);
  mutateTrial(root, t => { t.checks[0].evidence_ids = ['missing']; });
  assert.throws(() => validate(root), /Unknown evidence/);
  completeTrials(root); fs.writeFileSync(path.join(root, 'evidence/screen.png'), 'not an image');
  assert.throws(() => validate(root), /not a PNG/);
  completeTrials(root); fs.writeFileSync(path.join(workspace, 'outside.png'), png);
  fs.symlinkSync(path.join(workspace, 'outside.png'), path.join(root, 'evidence/escape.png'));
  mutateTrial(root, t => { t.evidence[0].path = 'evidence/escape.png'; });
  assert.throws(() => validate(root), /escapes the run/);
});

test('action URLs cannot retain login tokens or OAuth codes', () => {
  const { root } = setup(); completeTrials(root);
  mutateTrial(root, t => { t.actions[0].url = 'https://spots.com.co/callback?code=secret'; });
  assert.throws(() => validate(root), /credentials/);
});

test('sealing protects the exact trial records and evidence bytes', () => {
  const { root } = setup(); completeTrials(root); seal(root); cleanup(root);
  assert.equal(report(root, { final: true }).counts.completed, 1);
  assert.throws(() => seal(root), /already sealed/);
  fs.appendFileSync(path.join(root, 'evidence/screen.png'), 'modified');
  assert.throws(() => validate(root), /Sealed evidence changed/);
});

test('hybrid requires a sealed first phase and contributions from every selected profile', () => {
  const { root } = setup({ mode: 'hybrid', cohort: 'student,visitor' }); completeTrials(root); cleanup(root);
  assert.throws(() => report(root, { final: true }), /Seal independent/);
  seal(root);
  assert.throws(() => report(root, { final: true }), /Discussion/);
  discuss(root);
  const file = path.join(root, 'discussion.json'); const discussion = json(file);
  discussion.responses.pop(); save(file, discussion);
  assert.throws(() => report(root, { final: true }), /Missing discussion participant/);
  discuss(root);
  assert.equal(report(root, { final: true }).counts.completed, 2);
});

test('discussion-only uses explicit frozen materials, not fabricated browsing', () => {
  const { root, options } = setup({ mode: 'discussion', packet: true });
  assert.equal(validate(root).study.trials.length, 0);
  const brief = fs.readFileSync(path.join(root, 'briefs/student.md'), 'utf8');
  assert.match(brief, /Review only the supplied materials/);
  assert.match(brief, /material:screen/);
  assert.doesNotMatch(brief, /Choose a suitable place/);
  assert.throws(() => initialize({ ...options, packet: undefined }), /needs --packet/);
  seal(root); discuss(root); cleanup(root);
  assert.equal(report(root, { final: true }).counts.completed, 0);
  const file = path.join(root, 'discussion.json'); const discussion = json(file);
  discussion.responses[0].evidence_refs = ['material:invented']; save(file, discussion);
  assert.throws(() => validate(root, { final: true }), /sealed evidence/);
});

test('discussion must identify the precise evidence seal', () => {
  const { root } = setup({ mode: 'hybrid' }); completeTrials(root); seal(root); discuss(root); cleanup(root);
  const file = path.join(root, 'discussion.json'); const discussion = json(file);
  discussion.basis_sha256 = 'invented'; save(file, discussion);
  assert.throws(() => validate(root, { final: true }), /bound to the sealed/);
});

test('custom cohorts are snapshotted without changing global persona defaults', () => {
  const { options, workspace } = setup();
  const profiles = path.join(workspace, 'profiles.json');
  save(profiles, { personas: [{ id: 'custom-local', label: 'Custom fictional profile', context: 'A particular test context', constraints: ['Specific test constraint'] }] });
  const result = initialize({ ...options, profiles, cohort: 'custom-local' });
  const study = json(path.join(result.run, 'study.json'));
  assert.equal(study.personas[0].id, 'custom-local');
  assert.equal(study.trials.length, 1);
});

test('unreviewed cleanup and open owned resources block final reports', () => {
  const { root } = setup(); completeTrials(root); seal(root);
  assert.throws(() => report(root, { final: true }), /Cleanup/);
  cleanup(root, [{ kind: 'agent', id: 'fixture-agent', status: 'open' }]);
  assert.throws(() => report(root, { final: true }), /not closed/);
  cleanup(root, [{ kind: 'agent', id: 'fixture-agent', status: 'closed' }]);
  assert.equal(report(root, { final: true }).status, 'study-finished-not-human-validation');
});

test('comparisons reject changed protocols and report only descriptive deltas', () => {
  const a = setup({ version: 'fixture-v1' }), b = setup({ version: 'fixture-v2' });
  for (const run of [a, b]) { completeTrials(run.root); seal(run.root); cleanup(run.root); }
  assert.equal(compare(a.root, b.root).compatible, true);
  assert.equal(compare(a.root, b.root).outcome_deltas.completed, 0);
  assert.throws(() => compare(a.root, a.root), /distinct recorded UI versions/);
  const c = setup({ version: 'fixture-v3', cohort: 'visitor' }); completeTrials(c.root); seal(c.root); cleanup(c.root);
  assert.throws(() => compare(a.root, c.root), /Incompatible/);
});

test('CLI entrypoint validates required arguments without starting anything', () => {
  assert.throws(() => main(['init']), /Missing --workspace/);
  assert.throws(() => main(['compare']), /Need --left/);
  const { root } = setup();
  assert.equal(main(['validate', '--run', root]).counts['not-run'], 1);
  assert.throws(() => main(['init', '--cohrot', 'student,visitor']), /Unknown option/);
  assert.throws(() => main(['validate', '--run']), /Missing value/);
  assert.throws(() => main(['validate', '--run', root, '--run', root]), /Duplicate option/);
});

test('an empty or ambiguous environment cannot initialize a study', () => {
  assert.throws(() => setup({ planPatch: { environment: {} } }), /viewport/);
  const env = { viewport: { width: 390, height: 844 }, locale: 'es-CO', timezone: 'America/Bogota', auth: 'guest', writes: 'none' };
  assert.throws(() => setup({ planPatch: { environment: { ...env, auth: 'guest-or-test-account' } } }), /explicit guest/);
  assert.throws(() => setup({ planPatch: { environment: { ...env, writes: 'all' } } }), /explicit none/);
  assert.throws(() => setup({ planPatch: { environment: { ...env, timezone: 'invented' } } }), /Invalid locale/);
});
