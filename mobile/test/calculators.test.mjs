import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, initialCalculatorValues, visibleCalculatorFields, updateCalculatorValues } from '../../common/calculators.js';

const fertilizer = { area: '1', areaUnit: 'ha', nitrogen: '120', phosphorus: '60', potassium: '40' };
const spray = { area: '1', areaUnit: 'ha', basis: 'ml/L', dose: '2', water: '215', tank: '15' };
test('fertilizer blend meets N, P₂O₅ and K₂O requirements accounting for DAP nitrogen', () => {
  const { rows } = calculate('fertilizer', fertilizer);
  const [dap, urea, mop] = rows.map(row => row[1]);
  assert.ok(Math.abs(dap * .46 - 60) < 1e-10);
  assert.ok(Math.abs(dap * .18 + urea * .46 - 120) < 1e-10);
  assert.ok(Math.abs(mop * .6 - 40) < 1e-10);
  const acre = calculate('fertilizer', { ...fertilizer, areaUnit: 'acre' });
  assert.ok(Math.abs(acre.rows[0][1] / dap - .40468564224) < 1e-10);
  assert.deepEqual(calculate('fertilizer', { ...fertilizer, area: '10000', areaUnit: 'm²' }).rows, rows);
});
test('DAP excess is reported without negative urea', () => {
  const result = calculate('fertilizer', { ...fertilizer, nitrogen: '0' });
  assert.equal(result.rows[1][1], 0);
  assert.ok(result.rows[3][1] > 0);
  assert.ok(result.note);
});
test('spray product is allocated across full and partial tanks', () => {
  assert.deepEqual(calculate('pesticide', spray).rows.map(row => row[1]), [430, 215, 30, 14, 5, 10]);
  const result = calculate('pesticide', { ...spray, areaUnit: 'acre', basis: 'g/acre', dose: '250', water: '', tank: '' });
  assert.equal(result.rows[0][1], 250);
  assert.equal(result.rows[0][2], 'g');
  assert.equal(visibleCalculatorFields('pesticide', { ...spray, basis: 'g/ha' }).length, 5);
});
test('reject blank, negative, non-finite, unknown units and zero requirements', () => {
  for (const area of ['', '-1', 'Infinity', '1e999', 'abc', '0']) assert.throws(() => calculate('fertilizer', { ...fertilizer, area }));
  assert.throws(() => calculate('fertilizer', { ...fertilizer, areaUnit: 'unknown' }));
  assert.throws(() => calculate('fertilizer', initialCalculatorValues('fertilizer')));
  assert.throws(() => calculate('fertilizer', { ...fertilizer, nitrogen: '0', phosphorus: '0', potassium: '0' }));
  assert.throws(() => calculate('pesticide', { ...spray, tank: '0' }));
  assert.throws(() => calculate('pesticide', { ...spray, basis: 'unknown' }));
});

test('tree nutrient rates convert grams to kg without requiring farm area', () => {
  const values = { ...fertilizer, mode: 'Number of trees', trees: '100', area: '', areaUnit: '', nitrogen: '1200', phosphorus: '600', potassium: '400' };
  assert.deepEqual(calculate('fertilizer', values).rows, calculate('fertilizer', fertilizer).rows);
  const fields = visibleCalculatorFields('fertilizer', values);
  assert.ok(fields.some(([key, label]) => key === 'nitrogen' && label.endsWith('g/tree')));
  assert.ok(!fields.some(([key]) => key === 'area'));
  for (const trees of ['', '0', '-1', '2.5', '9007199254740992']) assert.throws(() => calculate('fertilizer', { ...values, trees }));
});
test('tree pesticide quantities support per-tree product and spray water rates', () => {
  const values = { ...spray, mode: 'Number of trees', trees: '10', area: '', basis: 'g/tree', dose: '5' };
  assert.deepEqual(calculate('pesticide', values).rows, [['Total product', 50, 'g']]);
  const dilution = calculate('pesticide', { ...values, basis: 'ml/L', dose: '2', water: '3.5', tank: '15' });
  assert.deepEqual(dilution.rows.map(row => row[1]), [70, 35, 30, 2, 5, 10]);
  assert.throws(() => calculate('pesticide', { ...values, basis: 'g/ha' }));
  assert.throws(() => calculate('pesticide', { ...values, mode: 'Farm size', area: '1' }));
});
test('changing calculation basis clears rates to avoid applying hectare rates to trees', () => {
  const values = updateCalculatorValues('fertilizer', { ...fertilizer, mode: 'Farm size' }, 'mode', 'Number of trees');
  assert.equal(values.nitrogen, '');
  assert.equal(values.phosphorus, '');
  assert.equal(values.potassium, '');
  const pesticide = updateCalculatorValues('pesticide', { ...spray, mode: 'Farm size' }, 'mode', 'Number of trees');
  assert.equal(pesticide.water, '');
  assert.equal(pesticide.dose, '');
  assert.equal(pesticide.basis, 'ml/L');
});
