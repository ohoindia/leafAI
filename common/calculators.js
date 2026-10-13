export const areaUnits = { ha: 1, acre: 0.40468564224, 'm²': 0.0001 };
export const calculatorFields = {
  fertilizer: [
    ['mode', 'Calculate by', 'Farm size', ['Farm size', 'Number of trees']],
    ['area', 'Farm size', '1'],
    ['areaUnit', 'Area unit', 'acre', ['acre', 'ha', 'm²']],
    ['trees', 'Number of trees', ''],
    ['nitrogen', 'Nitrogen (N), kg/ha', ''],
    ['phosphorus', 'Phosphate (P₂O₅), kg/ha', ''],
    ['potassium', 'Potash (K₂O), kg/ha', ''],
  ],
  pesticide: [
    ['mode', 'Calculate by', 'Farm size', ['Farm size', 'Number of trees']],
    ['area', 'Farm size', '1'],
    ['areaUnit', 'Area unit', 'acre', ['acre', 'ha', 'm²']],
    ['trees', 'Number of trees', ''],
    ['basis', 'Label rate basis', 'ml/L', ['ml/L', 'g/L', 'ml/ha', 'g/ha', 'ml/acre', 'g/acre']],
    ['dose', 'Product rate on label', ''],
    ['water', 'Spray water volume, L/ha', ''],
    ['tank', 'Tank capacity, L', ''],
  ],
};
export function initialCalculatorValues(kind) {
  return Object.fromEntries(calculatorFields[kind].map(([key, , value]) => [key, value]));
}
export function visibleCalculatorFields(kind, values) {
  const treeMode = values.mode === 'Number of trees';
  return calculatorFields[kind].filter(([key]) => {
    if (key === 'trees') return treeMode;
    if (['area', 'areaUnit'].includes(key)) return !treeMode;
    return kind !== 'pesticide' || !['water', 'tank'].includes(key) || values.basis.endsWith('/L');
  }).map(field => {
    const [key, label, value, options] = field;
    if (treeMode && ['nitrogen', 'phosphorus', 'potassium'].includes(key)) return [key, label.replace('kg/ha', 'g/tree'), value, options];
    if (treeMode && key === 'water') return [key, 'Spray water per tree, L', value];
    if (treeMode && key === 'basis') return [key, label, value, ['ml/L', 'g/L', 'ml/tree', 'g/tree']];
    return field;
  });
}
export function updateCalculatorValues(kind, values, key, value) {
  const next = { ...values, [key]: value };
  if (key === 'mode' && values.mode !== value) {
    // A rate per hectare cannot be reused as a rate per tree.
    if (kind === 'fertilizer') Object.assign(next, { nitrogen: '', phosphorus: '', potassium: '' });
    else Object.assign(next, { basis: 'ml/L', dose: '', water: '' });
  }
  return next;
}
export function calculatorSections(kind, values) {
  const fields = visibleCalculatorFields(kind, values);
  return [
    { title: 'Farm details', fields: fields.filter(([key]) => ['mode', 'area', 'areaUnit', 'trees'].includes(key)) },
    { title: kind === 'fertilizer' ? 'Nutrient requirements' : 'Product label rate', fields: fields.filter(([key]) => ['nitrogen', 'phosphorus', 'potassium', 'basis', 'dose'].includes(key)) },
    { title: 'Spray setup', fields: fields.filter(([key]) => ['water', 'tank'].includes(key)) },
  ].filter(section => section.fields.length);
}
function number(value, label, allowZero = false) {
  const text = String(value ?? '').trim();
  const result = Number(text);
  if (!/^\d+(\.\d+)?$/.test(text) || !Number.isFinite(result) || (allowZero ? result < 0 : result <= 0)) {
    throw new Error(`${label}: enter a valid ${allowZero ? 'non-negative' : 'positive'} number.`);
  }
  return result;
}
export function calculate(kind, values) {
  if (values.mode !== undefined && !['Farm size', 'Number of trees'].includes(values.mode)) throw new Error('Choose a calculation basis.');
  const treeMode = values.mode === 'Number of trees';
  let hectares = 0;
  let trees = 0;
  if (treeMode) {
    trees = number(values.trees, 'Number of trees');
    if (!Number.isSafeInteger(trees)) throw new Error('Number of trees: enter a whole number.');
  } else {
    if (!Object.hasOwn(areaUnits, values.areaUnit)) throw new Error('Choose an area unit.');
    hectares = number(values.area, 'Farm size') * areaUnits[values.areaUnit];
  }
  let rows;
  let note = '';
  if (kind === 'fertilizer') {
    const multiplier = treeMode ? trees / 1000 : hectares;
    const n = number(values.nitrogen, 'Nitrogen', true) * multiplier;
    const p = number(values.phosphorus, 'Phosphate', true) * multiplier;
    const k = number(values.potassium, 'Potash', true) * multiplier;
    if (n + p + k === 0) throw new Error('Enter at least one nutrient requirement greater than zero.');
    const dap = p / 0.46;
    const excessN = Math.max(0, dap * 0.18 - n);
    rows = [
      ['DAP (18-46-0)', dap, 'kg'],
      ['Urea (46-0-0)', Math.max(0, n - dap * 0.18) / 0.46, 'kg'],
      ['MOP (0-0-60)', k / 0.6, 'kg'],
    ];
    if (excessN > 0) {
      rows.push(['Nitrogen above entered requirement', excessN, 'kg']);
      note = 'DAP supplies more nitrogen than requested. Ask your agronomist for an alternative phosphorus source before applying.';
    }
  } else if (kind === 'pesticide') {
    const allowedRates = treeMode ? ['ml/L', 'g/L', 'ml/tree', 'g/tree'] : ['ml/L', 'g/L', 'ml/ha', 'g/ha', 'ml/acre', 'g/acre'];
    if (!allowedRates.includes(values.basis)) throw new Error('Choose a label rate basis.');
    const dose = number(values.dose, 'Product rate');
    const [unit, basis] = values.basis.split('/');
    if (basis === 'L') {
      const water = number(values.water, treeMode ? 'Spray water per tree' : 'Spray water volume') * (treeMode ? trees : hectares);
      const tank = number(values.tank, 'Tank capacity');
      const fullTanks = Math.floor(water / tank);
      const remainder = water - fullTanks * tank;
      rows = [['Total product', dose * water, unit], ['Total spray water', water, 'L'], ['Product per full tank', dose * tank, unit], ['Full tanks', fullTanks, '']];
      if (remainder > 1e-8) rows.push(['Water in final partial tank', remainder, 'L'], ['Product in final partial tank', remainder * dose, unit]);
    } else {
      rows = [['Total product', basis === 'tree' ? dose * trees : dose * hectares / (basis === 'acre' ? areaUnits.acre : 1), unit]];
    }
  } else throw new Error('Unknown calculator.');
  if (!Number.isFinite(hectares) || rows.some(([, value]) => !Number.isFinite(value))) throw new Error('Values are too large. Enter smaller values.');
  return { rows, note };
}
export function formatQuantity(value) {
  return value > 0 && value < 0.01 ? value.toPrecision(3) : value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}
export const calculatorCopy = {
  fertilizer: { title: 'Fertilizer Calculator', description: 'Plan fertilizer quantities for your farm or orchard using your soil test or local nutrient recommendation.', guidance: 'Enter nutrient requirements in kg per hectare for farm size, or grams per tree for tree count. Results use DAP 18-46-0, urea 46-0-0 and MOP 0-0-60. Confirm grades and application timing with your agronomist.' },
  pesticide: { title: 'Pesticide Calculator', description: 'Plan product quantities for your farm, trees and spray tanks using the approved label rate.', guidance: 'Enter the formulated product rate, not active ingredient concentration. Use only products approved for your crop and pest; follow the label, protective equipment and harvest interval.' },
};
