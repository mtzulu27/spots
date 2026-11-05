import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outcomes = ['not-run', 'completed', 'blocked', 'abandoned', 'not-applicable'];
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const check = (condition, message) => { if (!condition) throw new Error(message); };
const text = value => typeof value === 'string' && value.trim().length > 0;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value, exclusive = false) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: exclusive ? 'wx' : 'w' });
const list = (value, name) => { check(Array.isArray(value), `${name} must be an array`); return value; };
const unique = (values, name) => check(new Set(values).size === values.length, `Duplicate ${name}`);
const digestFile = file => hash(fs.readFileSync(file));

function safeUrl(value) {
  const url = new URL(value);
  check(['http:', 'https:'].includes(url.protocol) && !url.username && !url.password, 'Use an HTTP(S) URL without credentials');
  check(![...url.searchParams.keys()].some(k => /token|secret|password|api.?key|authorization|^code$/i.test(k)), 'Do not store credentials in URLs');
  return url;
}

function contained(root, relative) {
  check(text(relative) && !path.isAbsolute(relative), 'Evidence path must be relative');
  const base = fs.realpathSync(root);
  const resolved = fs.realpathSync(path.resolve(base, relative));
  const suffix = path.relative(base, resolved);
  check(suffix !== '..' && !suffix.startsWith('..' + path.sep) && !path.isAbsolute(suffix), 'Evidence path escapes the run');
  check(fs.statSync(resolved).isFile(), 'Evidence must be a regular file');
  return resolved;
}

function planValid(plan) {
  check(plan && typeof plan === 'object', 'Invalid task plan');
  list(plan.tasks, 'tasks');
  unique(plan.tasks.map(t => t.id), 'task IDs');
  for (const task of plan.tasks) {
    check(idPattern.test(task.id) && text(task.goal), 'Invalid task ID or goal');
    check(Number.isInteger(task.max_steps) && task.max_steps > 0, 'Task needs a positive max_steps');
    check(list(task.criteria, 'criteria').length > 0, 'Task needs criteria');
    unique(task.criteria.map(c => c.id), 'criterion IDs');
    check(task.criteria.every(c => idPattern.test(c.id) && text(c.description)), 'Invalid criterion');
  }
  check(plan.environment && typeof plan.environment === 'object', 'Record the environment');
  const env = plan.environment;
  check(env.viewport && Number.isInteger(env.viewport.width) && env.viewport.width > 0 && Number.isInteger(env.viewport.height) && env.viewport.height > 0, 'Record a positive integer viewport width and height');
  check(text(env.locale) && text(env.timezone), 'Record locale and timezone');
  try { Intl.getCanonicalLocales(env.locale); new Intl.DateTimeFormat('en', { timeZone: env.timezone }); }
  catch { throw new Error('Invalid locale or timezone'); }
  check(['guest', 'test-account'].includes(env.auth), 'Choose explicit guest or test-account auth');
  check(['none', 'test-only-approved'].includes(env.writes), 'Choose explicit none or test-only-approved writes');
  check(Number.isInteger(plan.discussion_round_limit) && plan.discussion_round_limit >= 1 && plan.discussion_round_limit <= 5, 'Discussion round limit must be 1..5');
}

export function initialize(options) {
  for (const key of ['workspace', 'url', 'feature', 'version', 'plan', 'model', 'driver']) check(text(options[key]), `Missing --${key}`);
  const url = safeUrl(options.url);
  const mode = options.mode ?? 'hybrid';
  check(['usability', 'discussion', 'hybrid'].includes(mode), 'Unknown study mode');
  const plan = read(path.resolve(options.plan));
  planValid(plan);
  check(mode === 'discussion' || plan.tasks.length > 0, 'Browser modes need tasks');
  const available = list(read(options.profiles ? path.resolve(options.profiles) : path.join(skill, 'assets/personas.json')).personas, 'persona profiles');
  check(available.length > 0 && available.every(p => idPattern.test(p.id) && text(p.label) && text(p.context) && Array.isArray(p.constraints) && p.constraints.every(text)), 'Invalid persona profile');
  unique(available.map(p => p.id), 'available persona IDs');
  const selected = options.cohort ? options.cohort.split(',') : available.map(p => p.id);
  unique(selected, 'persona IDs');
  check(selected.length && selected.every(id => available.some(p => p.id === id)), 'Unknown or empty cohort');
  const personas = selected.map(id => available.find(p => p.id === id));
  const runId = options['run-id'] ?? `${new Date().toISOString().replace(/[-:.]/g, '')}-${randomBytes(3).toString('hex')}`;
  check(/^[a-zA-Z0-9-]+$/.test(runId), 'Unsafe run ID');
  const root = path.join(path.resolve(options.workspace), 'output/spots-user-testing', runId);
  check(!fs.existsSync(root), 'Run already exists; never overwrite a study');
  let materialSources = [];
  if (options.packet) {
    materialSources = list(read(path.resolve(options.packet)).sources, 'packet sources');
    unique(materialSources.map(s => s.id), 'material IDs');
    check(materialSources.every(s => idPattern.test(s.id) && text(s.path) && fs.statSync(path.resolve(s.path)).isFile()), 'Invalid material source');
  }
  check(mode !== 'discussion' || materialSources.length > 0, 'Discussion-only needs --packet with source files');
  fs.mkdirSync(path.dirname(root), { recursive: true });
  fs.mkdirSync(root);
  for (const folder of ['briefs', 'trials', 'evidence', 'materials']) fs.mkdirSync(path.join(root, folder));
  const materials = materialSources.map((source, i) => {
    const relative = `materials/${i}-${source.id}${path.extname(source.path)}`;
    fs.copyFileSync(path.resolve(source.path), path.join(root, relative));
    return { id: source.id, path: relative, sha256: digestFile(path.join(root, relative)) };
  });
  const trials = mode === 'discussion' ? [] : personas.flatMap(persona => plan.tasks.map(task => {
    const id = `${persona.id}--${task.id}`;
    const relative = `trials/${id}.json`;
    write(path.join(root, relative), {
      synthetic: true, id, persona_id: persona.id, task_id: task.id,
      outcome: 'not-run', reason: '', method: 'not-run', actor: 'not-run', isolation: 'unverified',
      actions: [], evidence: [], observations: [], checks: [], interpretations: [], hypotheses: [], limitations: [],
    }, true);
    return { id, persona_id: persona.id, task_id: task.id, path: relative };
  }));
  for (const persona of personas) {
    const goals = mode === 'discussion'
      ? ['Review only the supplied materials. Give hypothetical perceptions, not claims of browsing or observed task success.', ...materials.map(m => `- material:${m.id}: ${m.path}`)]
      : plan.tasks.map(t => `- ${t.id}: ${t.goal} (maximum ${t.max_steps} observed steps)`);
    const brief = [
      '# Synthetic persona brief', '',
      'This is a simulated perspective, not a real person. Do not invent actions or observations.',
      'Do not inspect application source or other personas. Stop before submitting or changing data.',
      `Target: ${url.href}`, '', JSON.stringify(persona, null, 2), '',
      '## Goals', ...goals, '',
      'Record what actually happened, what you interpreted, and what remains unknown separately.',
      'If browser access is unavailable, report that; do not pretend to have used the app.', '',
    ].join('\n');
    fs.writeFileSync(path.join(root, `briefs/${persona.id}.md`), brief, { flag: 'wx' });
  }
  write(path.join(root, 'study.json'), {
    schema_version: 1, synthetic: true, id: runId, created_at: new Date().toISOString(),
    feature: options.feature, app_version: options.version, target_url: url.href,
    mode, model: options.model, driver: options.driver, plan, personas, trials, materials,
    execution_note: 'Prepared only. The helper does not execute agents or browsers.',
  }, true);
  write(path.join(root, 'cleanup.json'), { reviewed: false, owned_resources: [], limitations: [] }, true);
  if (mode !== 'usability') write(path.join(root, 'discussion.json'), { status: 'not-run', basis_sha256: null, responses: [], limitations: [] }, true);
  return { run: root, mode, personas: personas.length, trials: trials.length, status: 'prepared-not-executed' };
}

function imageValid(file) {
  const b = fs.readFileSync(file);
  return b.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) ||
    (b.length > 3 && b[0] === 255 && b[1] === 216 && b[2] === 255) ||
    (b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP');
}

function inspect(root, { terminal = false } = {}) {
  const study = read(path.join(root, 'study.json'));
  check(study.schema_version === 1 && study.synthetic === true, 'Unsupported or non-synthetic study');
  planValid(study.plan);
  check(['usability', 'discussion', 'hybrid'].includes(study.mode), 'Unknown study mode');
  safeUrl(study.target_url);
  check(list(study.personas, 'personas').length > 0 && study.personas.every(p => idPattern.test(p.id)), 'Invalid cohort');
  unique(study.personas.map(p => p.id), 'persona IDs');
  const expected = study.mode === 'discussion' ? [] : study.personas.flatMap(p => study.plan.tasks.map(t => `${p.id}--${t.id}`));
  check(JSON.stringify(list(study.trials, 'trials').map(t => t.id).sort()) === JSON.stringify(expected.sort()), 'Trial inventory no longer matches the cohort and plan');
  const counts = Object.fromEntries(outcomes.map(o => [o, 0]));
  const files = new Set(['study.json']);
  const references = new Set();
  const limitations = new Set();
  for (const material of study.materials) {
    const file = contained(root, material.path);
    check(digestFile(file) === material.sha256, 'Material changed');
    files.add(material.path);
    references.add(`material:${material.id}`);
  }
  for (const entry of study.trials) {
    const trial = read(contained(root, entry.path));
    files.add(entry.path);
    check(trial.synthetic === true && trial.id === entry.id && trial.persona_id === entry.persona_id && trial.task_id === entry.task_id, 'Trial identity changed');
    check(outcomes.includes(trial.outcome), 'Unknown trial outcome');
    counts[trial.outcome]++;
    if (terminal) check(trial.outcome !== 'not-run', `Unexecuted trial: ${entry.id}`);
    if (trial.outcome !== 'completed' && trial.outcome !== 'not-run') check(text(trial.reason), 'Terminal non-success needs a reason');
    check(['browser', 'artifact', 'not-run'].includes(trial.method), 'Invalid trial method');
    check(['independent-agent', 'coordinator-perspective', 'not-run'].includes(trial.actor), 'Invalid actor');
    check(['verified', 'shared', 'unverified'].includes(trial.isolation), 'Invalid isolation');
    if (trial.actor === 'independent-agent') check(trial.isolation === 'verified', 'Independent agents need verified storage isolation');
    list(trial.limitations, 'limitations').forEach(l => { check(text(l), 'Invalid limitation'); limitations.add(l); });
    if (trial.actor === 'coordinator-perspective') limitations.add('Sequential coordinator perspectives are not independent users.');
    if (trial.isolation !== 'verified') limitations.add('Some trials have shared or unverified storage isolation.');
    const evidence = list(trial.evidence, 'evidence');
    unique(evidence.map(e => e.id), 'evidence IDs');
    for (const e of evidence) {
      check(idPattern.test(e.id) && ['screenshot', 'trace', 'document'].includes(e.kind), 'Invalid evidence');
      const file = contained(root, e.path);
      check(fs.statSync(file).size > 0, 'Empty evidence file');
      if (e.kind === 'screenshot') check(imageValid(file), 'Screenshot is not a PNG/JPEG/WebP');
      files.add(e.path);
      references.add(`${entry.id}:${e.id}`);
    }
    const refsValid = (ids, needed = false) => {
      list(ids, 'evidence_ids');
      check(!needed || ids.length > 0, 'Evidence reference required');
      check(ids.every(id => evidence.some(e => e.id === id)), 'Unknown evidence reference');
    };
    for (const o of list(trial.observations, 'observations')) { check(text(o.text), 'Empty observation'); refsValid(o.evidence_ids, true); }
    for (const a of list(trial.actions, 'actions')) { check(text(a.action) && text(a.url), 'Invalid action'); safeUrl(a.url); refsValid(a.evidence_ids, true); }
    list(trial.interpretations, 'interpretations'); list(trial.hypotheses, 'hypotheses');
    const task = study.plan.tasks.find(t => t.id === entry.task_id);
    check(task, 'Unknown task');
    check(trial.actions.length <= task.max_steps, 'Observed steps exceed the recorded budget');
    const checks = list(trial.checks, 'checks');
    unique(checks.map(c => c.criterion_id), 'criterion verdicts');
    for (const c of checks) {
      check(task.criteria.some(t => t.id === c.criterion_id), 'Unknown criterion');
      check(['pass', 'fail', 'unknown'].includes(c.verdict) && text(c.note), 'Invalid criterion verdict');
      refsValid(c.evidence_ids, c.verdict !== 'unknown');
    }
    if (trial.outcome === 'completed') {
      check(trial.method === 'browser' && trial.actor !== 'not-run', 'Completed tasks require observed browser execution');
      check(trial.actions.length && trial.observations.length && evidence.some(e => e.kind === 'screenshot'), 'Completed task needs actions, observations and a screenshot');
      check(task.criteria.every(c => checks.some(v => v.criterion_id === c.id && v.verdict === 'pass')), 'Completed task has unverified criteria');
    }
  }
  return { study, counts, files, references, limitations };
}

function verifySeal(root) {
  const file = path.join(root, 'seal.json');
  check(fs.existsSync(file), 'Seal independent results before final reporting or discussion');
  const seal = read(file);
  check(seal.sha256 === hash(JSON.stringify(seal.files)), 'Invalid seal digest');
  for (const [relative, expected] of Object.entries(seal.files)) check(digestFile(contained(root, relative)) === expected, `Sealed evidence changed: ${relative}`);
  return seal;
}

export function validate(root, { final = false, terminal = false } = {}) {
  const info = inspect(root, { terminal: final || terminal });
  if (fs.existsSync(path.join(root, 'seal.json'))) verifySeal(root);
  if (final) {
    const seal = verifySeal(root);
    check(info.files.size === Object.keys(seal.files).length && [...info.files].every(f => f in seal.files), 'Seal does not cover current evidence');
    if (info.study.mode !== 'usability') {
      const discussion = read(path.join(root, 'discussion.json'));
      check(discussion.status === 'completed', 'Discussion has not been completed');
      check(discussion.basis_sha256 === seal.sha256, 'Discussion is not bound to the sealed evidence packet');
      const seen = new Set();
      for (const response of list(discussion.responses, 'discussion responses')) {
        check(info.study.personas.some(p => p.id === response.persona_id) && text(response.text), 'Invalid discussion response');
        check(Number.isInteger(response.round) && response.round >= 1 && response.round <= info.study.plan.discussion_round_limit, 'Invalid discussion round');
        const key = `${response.persona_id}:${response.round}`;
        check(!seen.has(key), 'Duplicate persona response in discussion round'); seen.add(key);
        check(list(response.evidence_refs, 'discussion references').length > 0 && response.evidence_refs.every(id => info.references.has(id)), 'Discussion must cite sealed evidence');
      }
      check(info.study.personas.every(p => discussion.responses.some(r => r.persona_id === p.id)), 'Missing discussion participant');
      list(discussion.limitations, 'discussion limitations').forEach(l => { check(text(l), 'Invalid discussion limitation'); info.limitations.add(l); });
    }
    const cleanup = read(path.join(root, 'cleanup.json'));
    check(cleanup.reviewed === true, 'Cleanup has not been reviewed');
    check(list(cleanup.owned_resources, 'owned resources').every(r => text(r.kind) && text(r.id) && r.status === 'closed'), 'An owned resource is not closed');
    list(cleanup.limitations, 'cleanup limitations').forEach(l => { check(text(l), 'Invalid cleanup limitation'); info.limitations.add(l); });
  }
  return info;
}

export function seal(root) {
  check(!fs.existsSync(path.join(root, 'seal.json')), 'Study is already sealed; create a new run for corrections');
  const info = validate(root, { terminal: true });
  const files = Object.fromEntries([...info.files].sort().map(f => [f, digestFile(contained(root, f))]));
  const result = { created_at: new Date().toISOString(), sha256: hash(JSON.stringify(files)), files };
  write(path.join(root, 'seal.json'), result, true);
  return { sealed: true, sha256: result.sha256, files: Object.keys(files).length };
}

export function report(root, { final = false } = {}) {
  const info = validate(root, { final });
  const result = { synthetic: true, status: final ? 'study-finished-not-human-validation' : 'partial-not-final', run_id: info.study.id, feature: info.study.feature, app_version: info.study.app_version, mode: info.study.mode, counts: info.counts, limitations: [...info.limitations] };
  const md = ['# Spots synthetic study', '', `Status: ${result.status}`, `Feature: ${result.feature}`, `Version: ${result.app_version}`, `Mode: ${result.mode}`, '', ...Object.entries(result.counts).map(([key, value]) => `- ${key}: ${value}`), '', '## Limits', 'Synthetic counts are not population estimates. Model latency is not human task time.', 'The helper checks records and file integrity; a human/coordinator must inspect support for each claim.', ...result.limitations.map(l => `- ${l}`), '', 'Detailed observations, interpretations and hypotheses remain separated in the trial records.', 'Discussion is hypothetical and cannot change observed task results.', ''].join('\n');
  write(path.join(root, 'summary.json'), result);
  fs.writeFileSync(path.join(root, 'summary.md'), md);
  return result;
}

export function compare(left, right) {
  const a = validate(left, { final: true }), b = validate(right, { final: true });
  const keys = ['feature', 'mode', 'model', 'driver', 'plan', 'personas'];
  check(keys.every(k => hash(JSON.stringify(a.study[k])) === hash(JSON.stringify(b.study[k]))), 'Incompatible feature, mode, model, driver, plan, environment or cohort');
  check(a.study.app_version !== b.study.app_version, 'Comparison requires distinct recorded UI versions');
  check(![a.study.model, a.study.driver, a.study.app_version, b.study.app_version].some(s => /^(unknown|unspecified|not-recorded)$/i.test(s)), 'Record model, driver and versions before comparing');
  return { synthetic: true, compatible: true, left_version: a.study.app_version, right_version: b.study.app_version, outcome_deltas: Object.fromEntries(outcomes.map(k => [k, b.counts[k] - a.counts[k]])), caveat: 'Synthetic descriptive comparison, not a causal or statistically representative conclusion.' };
}

export function main(argv) {
  const [command, ...args] = argv;
  const allowed = {
    init: ['workspace', 'url', 'feature', 'version', 'plan', 'model', 'driver', 'mode', 'cohort', 'profiles', 'packet', 'run-id'],
    validate: ['run', 'final'], report: ['run', 'final'], seal: ['run'], compare: ['left', 'right'],
  };
  check(Object.hasOwn(allowed, command), 'Commands: init, validate, seal, report, compare');
  const options = {};
  for (let i = 0; i < args.length; i++) {
    check(args[i].startsWith('--'), `Unexpected argument: ${args[i]}`);
    const key = args[i].slice(2);
    check(allowed[command].includes(key), `Unknown option --${key} for ${command}`);
    check(!Object.hasOwn(options, key), `Duplicate option --${key}`);
    if (key !== 'final') check(text(args[i + 1]) && !args[i + 1].startsWith('--'), `Missing value for --${key}`);
    options[key] = key === 'final' ? true : args[++i];
  }
  if (command === 'init') return initialize(options);
  if (command === 'compare') { check(options.left && options.right, 'Need --left and --right'); return compare(path.resolve(options.left), path.resolve(options.right)); }
  check(options.run, 'Need --run');
  const root = path.resolve(options.run);
  if (command === 'seal') return seal(root);
  if (command === 'report') return report(root, { final: options.final === true });
  if (command === 'validate') { const info = validate(root, { final: options.final === true }); return { valid: true, counts: info.counts, final: options.final === true }; }
  throw new Error('Unsupported command');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(main(process.argv.slice(2)), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
