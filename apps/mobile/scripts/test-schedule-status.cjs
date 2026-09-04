const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = fs.readFileSync(require('node:path').join(__dirname, '../lib/schedule-status.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const loaded = { exports: {} };
new Function('exports', 'require', 'module', compiled)(loaded.exports, require, loaded);
const { getOpenStatusFromSchedule, matchesScheduleForDayTime } = loaded.exports;
const schedule = 'Lun-Jue 17:00-22:00 · Vie-Sab 17:00-02:00 · Dom 15:00-21:00';
const cases = [
  ['2026-09-03T21:59:00', 'open'],
  ['2026-09-03T22:00:00', 'closed'],
  ['2026-09-04T01:53:00', 'closed'],
  ['2026-09-04T16:59:00', 'closed'],
  ['2026-09-04T17:00:00', 'open'],
  ['2026-09-04T23:59:00', 'open'],
  ['2026-09-05T00:00:00', 'open'],
  ['2026-09-05T01:53:00', 'open'],
  ['2026-09-05T02:00:00', 'closed'],
  ['2026-09-05T16:59:00', 'closed'],
  ['2026-09-06T01:53:00', 'open'],
  ['2026-09-06T02:00:00', 'closed'],
];
for (const [date, expected] of cases) {
  assert.equal(getOpenStatusFromSchedule(schedule, new Date(date))?.tone, expected, date);
}
assert.equal(matchesScheduleForDayTime(schedule, 'Vie', 113), false);
assert.equal(matchesScheduleForDayTime(schedule, 'Sab', 113), true);
assert.equal(getOpenStatusFromSchedule('Vie 17:00-02:00 · Sab Cerrado', new Date('2026-09-05T01:53:00'))?.tone, 'open');
const { getScheduleDayRows, getTodayScheduleLabel } = loaded.exports;
const zorro = 'Lun-Mar 17:00-00:00 · Mie-Vie 17:00-02:30 · Sab-Dom 17:00-00:00';
assert.equal(getScheduleDayRows(zorro, new Date('2026-09-04T02:00:00')).find(row => row.isToday).code, 'Jue');
assert.equal(getScheduleDayRows(zorro, new Date('2026-09-04T02:30:00')).find(row => row.isToday).code, 'Vie');
assert.equal(getScheduleDayRows(schedule, new Date('2026-09-04T01:53:00')).find(row => row.isToday).code, 'Vie');
const differentHours = 'Jue 17:00-02:30 · Vie 18:00-03:00';
assert.equal(getTodayScheduleLabel(differentHours, new Date('2026-09-04T02:00:00')), '5:00 p. m.-2:30 a. m.');
console.log('19 schedule regression checks passed');
