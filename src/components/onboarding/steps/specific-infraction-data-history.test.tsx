import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { InfractionData } from '../../../types';
import { SpecificInfractionDataStep } from './SpecificInfractionDataStep';
import { buildCoherentTestInfraction } from '../testFillData';

const baseInfraction = buildCoherentTestInfraction('excesso_velocidade', {} as InfractionData);

function renderStep(severity: InfractionData['severity'], hasPreviousInfractionsLast12Months?: boolean) {
  const infractionData = {
    ...baseInfraction,
    severity,
    hasPreviousInfractionsLast12Months,
  } as InfractionData;

  return renderToString(
    <SpecificInfractionDataStep
      category="excesso_velocidade"
      infractionData={infractionData}
      onUpdateInfraction={() => undefined}
      onNext={() => undefined}
      onBack={() => undefined}
    />
  );
}

describe('SpecificInfractionDataStep — previous infractions history field', () => {
  it('renders the field for medium speed infractions', () => {
    expect(renderStep('media')).toContain('id="select-previous-infractions-12-months"');
  });

  it('renders the field for light speed infractions', () => {
    expect(renderStep('leve')).toContain('id="select-previous-infractions-12-months"');
  });

  it('does not render the field for serious speed infractions', () => {
    expect(renderStep('grave')).not.toContain('id="select-previous-infractions-12-months"');
  });

  it('does not render the field for very serious speed infractions', () => {
    expect(renderStep('gravissima')).not.toContain('id="select-previous-infractions-12-months"');
  });

  it('selects “sim” when the stored value is true', () => {
    expect(renderStep('media', true)).toContain('<option value="sim" selected');
  });

  it('selects “nao” when the stored value is false', () => {
    expect(renderStep('media', false)).toContain('<option value="nao" selected');
  });

  it('selects “nao_informado” when the stored value is undefined', () => {
    expect(renderStep('media', undefined)).toContain('<option value="nao_informado" selected');
  });

  it('keeps all three tri-state options available', () => {
    const html = renderStep('media');
    expect(html).toContain('<option value="sim"');
    expect(html).toContain('<option value="nao"');
    expect(html).toContain('<option value="nao_informado"');
  });

  it('does not silently render an absent value as false', () => {
    const html = renderStep('media', undefined);
    expect(html).not.toContain('<option value="nao" selected');
  });
});
