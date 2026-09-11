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
const { getHolidayScheduleRow, getScheduleDayRows, getTodayScheduleLabel } = loaded.exports;
const zorro = 'Lun-Mar 17:00-00:00 · Mie-Vie 17:00-02:30 · Sab-Dom 17:00-00:00';
assert.equal(getScheduleDayRows(zorro, new Date('2026-09-04T02:00:00')).find(row => row.isToday).code, 'Jue');
assert.equal(getScheduleDayRows(zorro, new Date('2026-09-04T02:30:00')).find(row => row.isToday).code, 'Vie');
assert.equal(getScheduleDayRows(schedule, new Date('2026-09-04T01:53:00')).find(row => row.isToday).code, 'Vie');
const differentHours = 'Jue 17:00-02:30 · Vie 18:00-03:00';
assert.equal(getTodayScheduleLabel(differentHours, new Date('2026-09-04T02:00:00')), '5:00 p. m.-2:30 a. m.');
const groupedHoliday = 'Dom-Jue y festivos 11:00-22:00 · Vie-Sáb 11:00-23:00';
assert.equal(getHolidayScheduleRow(groupedHoliday).value, '11:00 a. m.-10:00 p. m.');
assert.equal(getTodayScheduleLabel(groupedHoliday, new Date('2026-01-01T12:00:00')), 'Festivo · 11:00 a. m.-10:00 p. m.');
console.log('21 schedule regression checks passed');

const alma = 'Lun-Mar Cerrado · Mie-Vie 17:00-22:00 · Sab 14:00-22:00 · Dom 13:00-21:00 · Festivos 13:00-21:00 · Si el lunes es festivo, descanso Mar-Mie';
const almaCases = [
  ['2026-09-09T18:00:00', 'open'],
  ['2026-08-17T12:59:00', 'closed'],
  ['2026-08-17T13:00:00', 'open'],
  ['2026-08-17T21:00:00', 'closed'],
  ['2026-08-18T18:00:00', 'closed'],
  ['2026-08-19T18:00:00', 'closed'],
  ['2026-08-20T18:00:00', 'open'],
  ['2026-08-26T18:00:00', 'open'],
  ['2026-01-14T18:00:00', 'closed'],
  ['2026-08-12T18:00:00', 'open'], // A Friday holiday does not trigger a Monday-only rule.
];
for (const [date, expected] of almaCases) assert.equal(getOpenStatusFromSchedule(alma, new Date(date))?.tone, expected, date);
assert.equal(getTodayScheduleLabel(alma, new Date('2026-08-19T18:00:00')), 'Cerrado · Descanso por lunes festivo');
assert.equal(getScheduleDayRows(alma, new Date('2026-08-17T18:00:00')).find(row => row.code === 'Mie').value, 'Cerrado');
assert.equal(getScheduleDayRows(alma, new Date('2026-09-09T18:00:00')).find(row => row.code === 'Mie').value, '5:00 p. m.-10:00 p. m.');
assert.equal(getHolidayScheduleRow(alma).value, '1:00 p. m.-9:00 p. m.');
assert.equal(matchesScheduleForDayTime(alma, 'Mie', 18 * 60, new Date('2026-08-19T12:00:00')), false);
assert.equal(loaded.exports.hasScheduleAvailabilityForDay(alma, 'Mie', new Date('2026-08-19T12:00:00')), false);
assert.equal(loaded.exports.hasScheduleAvailabilityForDay(alma, 'Mie', new Date('2026-09-09T12:00:00')), true);
assert.deepEqual(loaded.exports.getScheduleExceptionSegments(alma), ['Si el lunes es festivo, descanso Mar-Mie']);
assert.equal(getOpenStatusFromSchedule('Mie 17:00-02:00 · Jue 18:00-22:00 · Si el lunes es festivo, descanso Mar-Mie', new Date('2026-08-20T01:00:00'))?.tone, 'closed');
assert.equal(getOpenStatusFromSchedule(alma.replace(' · Si el lunes es festivo, descanso Mar-Mie', ''), new Date('2026-08-19T18:00:00'))?.tone, 'open');
console.log('20 Monday-holiday exception checks passed');
