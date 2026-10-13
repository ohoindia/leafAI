import assert from 'node:assert/strict';
import test from 'node:test';
import { translate } from '../../common/locale.js';
import { calculate, calculatorCopy, calculatorSections, initialCalculatorValues } from '../../common/calculators.js';

test('both calculators localize dynamic fields, guidance, units, results and validation in every language', () => {
  const labels = new Set(Object.values(calculatorCopy).flatMap(Object.values));
  for (const kind of ['fertilizer', 'pesticide']) {
    for (const mode of ['Farm size', 'Number of trees']) {
      const values = { ...initialCalculatorValues(kind), mode, trees: '10', nitrogen: '0', phosphorus: '10', potassium: '10', dose: '2', water: '100', tank: '15' };
      const sections = calculatorSections(kind, values);
      for (const section of sections) {
        labels.add(section.title);
        for (const [, label, , options] of section.fields) {
          labels.add(label);
          for (const option of options ?? []) labels.add(option);
        }
      }
      const result = calculate(kind, values);
      for (const [label, , unit] of result.rows) { labels.add(label); if (unit) labels.add(unit); }
      if (result.note) labels.add(result.note);
      for (const [key, , , options] of sections.flatMap(section => section.fields)) {
        if (options) continue;
        assert.throws(() => calculate(kind, { ...values, [key]: '' }), error => {
          labels.add(error.message); return true;
        });
      }
    }
  }
  for (const key of ['Choose a calculation basis.', 'Choose an area unit.', 'Choose a label rate basis.', 'Number of trees: enter a whole number.', 'Enter at least one nutrient requirement greater than zero.', 'Values are too large. Enter smaller values.']) labels.add(key);
  for (const label of labels) for (const language of ['te', 'hi', 'kn', 'ta']) {
    assert.notEqual(translate(language, label), label, `${language}: ${label}`);
  }
});
