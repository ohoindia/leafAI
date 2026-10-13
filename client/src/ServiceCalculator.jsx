import { useState } from 'react';
import { useLocale } from './locale';
import { calculate, calculatorCopy, calculatorSections, initialCalculatorValues, updateCalculatorValues, formatQuantity } from '../../common/calculators.js';

export function ServiceCalculator({ kind, onBack }) {
  const t = useLocale();
  const [values, setValues] = useState(() => initialCalculatorValues(kind));
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const copy = calculatorCopy[kind];
  function update(key, value) {
    setValues(current => updateCalculatorValues(kind, current, key, value));
    setResult(null); setError('');
  }
  return <section className="service-calculator">
    <button className="calculator-back" type="button" onClick={onBack}>← {t('Back to Services')}</button>
    <header className="calculator-header">
      <h2>{t(copy.title)}</h2>
      <p>{t(copy.description)}</p>
    </header>
    <form onSubmit={event => {
      event.preventDefault();
      try { setResult(calculate(kind, values)); setError(''); }
      catch (caught) { setResult(null); setError(caught.message); }
    }}>
      {calculatorSections(kind, values).map((section, index) => <fieldset className="calculator-section" key={section.title}>
        <legend><span>{String(index + 1).padStart(2, '0')}</span> {t(section.title)}</legend>
        {section.fields.map(([key, label, , options]) => options && options.length <= 3 ? <fieldset className="calculator-choice-field" key={key}>
          <legend>{t(label)}</legend>
          <div className="calculator-segments">
            {options.map(option => <label className="calculator-segment" key={option}>
              <input type="radio" name={`${kind}-${key}`} value={option} checked={values[key] === option} onChange={() => update(key, option)} />
              <span>{t(option)}</span>
            </label>)}
          </div>
        </fieldset> : <label key={key}>
        {t(label)}
        {options ? <select value={values[key]} onChange={event => update(key, event.target.value)}>{options.map(option => <option key={option} value={option}>{t(option)}</option>)}</select>
          : <input type="text" inputMode={key === 'trees' ? 'numeric' : 'decimal'} value={values[key]} onChange={event => update(key, event.target.value)} placeholder="0" />}
      </label>)}
      </fieldset>)}
      <aside className="calculator-guidance"><h3>{t('Application guidance')}</h3><p>{t(copy.guidance)}</p></aside>
      <div className="calculator-actions"><button className="primary" type="submit">{t('Calculate')}</button><button type="button" onClick={() => { setValues(initialCalculatorValues(kind)); setResult(null); setError(''); }}>{t('Reset')}</button></div>
      {!!error && <p role="alert">{t(error)}</p>}
      {result && <div className="calculator-result" aria-live="polite">
        <h3>{t('Calculated quantities')}</h3>
        <dl>{result.rows.map(([label, value, unit]) => <div key={label}><dt>{t(label)}</dt><dd>{formatQuantity(value)} {t(unit)}</dd></div>)}</dl>
        {!!result.note && <p>{t(result.note)}</p>}
      </div>}
    </form>
  </section>;
}
