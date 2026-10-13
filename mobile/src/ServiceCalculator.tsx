import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Card, Button, Page, s } from './ui';
import { useLocale } from './locale';
import { calculate, calculatorCopy, calculatorSections, initialCalculatorValues, updateCalculatorValues, formatQuantity, type CalculatorKind, type CalculatorResult } from '../../common/calculators.js';

export function ServiceCalculator({ kind }: { kind: CalculatorKind }) {
  const t = useLocale();
  const [values, setValues] = useState(() => initialCalculatorValues(kind));
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [error, setError] = useState('');
  const copy = calculatorCopy[kind];
  function update(key: string, value: string) {
    setValues(current => updateCalculatorValues(kind, current, key, value));
    setResult(null);
    setError('');
  }
  return <>
    <View style={{ backgroundColor: '#e8f3ed', borderRadius: 20, padding: 24, gap: 16, borderWidth: 1, borderColor: '#cfe3d6', alignItems: 'stretch' }}>
      <Text style={[s.heading, { fontSize: 24, lineHeight: 34, flexShrink: 1 }]}>{t(copy.title)}</Text>
      <Text style={[s.body, { lineHeight: 26, flexShrink: 1 }]}>{t(copy.description)}</Text>
    </View>
    {calculatorSections(kind, values).map((section, index) => <Card key={section.title}>
      <Text style={[s.heading, { color: '#17673f' }]}>{String(index + 1).padStart(2, '0')} · {t(section.title)}</Text>
      {section.fields.map(([key, label, , options]) => <View key={key} style={{ gap: 10, marginTop: 8 }}>
        <Text style={[s.body, { fontWeight: '600' }]}>{t(label)}</Text>
        {options ? <View accessibilityRole="radiogroup" accessibilityLabel={t(label)} style={{ gap: 8, flexDirection: options.length <= 3 ? 'row' : 'column', ...(options.length <= 3 ? { backgroundColor: '#f0f4f1', padding: 5, borderRadius: 14 } : {}) }}>
          {options.map(option => <Pressable key={option} accessibilityRole="radio" accessibilityLabel={`${t(label)}: ${t(option)}`} accessibilityState={{ checked: values[key] === option }} onPress={() => update(key, option)} style={({ pressed }) => ({ paddingVertical: 14, paddingHorizontal: options.length <= 3 ? 8 : 14, minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: values[key] === option ? '#218653' : options.length <= 3 ? 'transparent' : '#d5e1d8', backgroundColor: values[key] === option ? '#218653' : options.length <= 3 ? 'transparent' : '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, ...(options.length <= 3 ? { flex: 1 } : {}), opacity: pressed ? 0.75 : 1 })}>
            {options.length > 3 && <Text accessible={false} style={{ color: values[key] === option ? '#fff' : '#218653', fontSize: 18 }}>{values[key] === option ? '●' : '○'}</Text>}
            <Text style={{ color: values[key] === option ? '#fff' : '#243c30', fontWeight: values[key] === option ? '600' : '400', flex: 1, textAlign: options.length <= 3 ? 'center' : 'left' }}>{t(option)}</Text>
          </Pressable>)}
        </View> : <TextInput accessibilityLabel={t(label)} style={s.input} keyboardType={key === 'trees' ? 'number-pad' : 'decimal-pad'} value={values[key]} onChangeText={value => update(key, value)} placeholder="0" placeholderTextColor="#697b70" />}
      </View>)}
    </Card>)}
    <Card>
      <Text style={s.heading}>{t('Application guidance')}</Text>
      <Text style={s.muted}>{t(copy.guidance)}</Text>
      <Button title={t('Calculate')} onPress={() => {
        try { setResult(calculate(kind, values)); setError(''); }
        catch (caught) { setResult(null); setError((caught as Error).message); }
      }} />
      <Button secondary title={t('Reset')} onPress={() => { setValues(initialCalculatorValues(kind)); setResult(null); setError(''); }} />
      {!!error && <Text accessibilityRole="alert" style={s.body}>{t(error)}</Text>}
    </Card>
      {result && <View accessibilityLiveRegion="polite" style={{ backgroundColor: '#edf7f0', borderRadius: 16, padding: 16, gap: 12 }}>
        <Text style={s.heading}>{t('Calculated quantities')}</Text>
        {result.rows.map(([label, value, unit]) => <View key={label}>
          <Text style={s.body}>{t(label)}</Text>
          <Text style={s.heading}>{formatQuantity(value)} {t(unit)}</Text>
        </View>)}
        {!!result.note && <Text style={s.body}>{t(result.note)}</Text>}
      </View>}
  </>;
}

export function ServiceCalculatorScreen({ kind }: { kind: CalculatorKind }) {
  const t = useLocale();
  return <Page title={t(calculatorCopy[kind].title)} backToServices>
    <ServiceCalculator kind={kind} />
  </Page>;
}
