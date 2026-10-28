import React from 'react';

interface OnboardingStartScreenProps {
  hasSavedProgress: boolean;
  savedStep?: number;
  onStart: () => void;
  onContinue: () => void;
  onStartFresh: () => void;
}

export const OnboardingStartScreen: React.FC<OnboardingStartScreenProps> = ({
  hasSavedProgress,
  savedStep,
  onStart,
  onContinue,
  onStartFresh,
}) => {
  const continueLabel = savedStep && savedStep > 1
    ? 'Continuar de onde parei'
    : 'Continuar preenchimento';

  return (
  <section
    aria-labelledby="onboarding-start-title"
    className="max-w-3xl mx-auto rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm"
  >
    <div className="mx-auto max-w-xl text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#155BCB]">
        <span aria-hidden="true" className="text-2xl">✓</span>
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#155BCB]">
        AdeusMultas • Assistente de análise
      </p>
      <h1 id="onboarding-start-title" className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Vamos começar pelo seu caso
      </h1>
      <p className="mt-3 text-base leading-7 text-slate-600">
        Você controla o início do preenchimento. Se precisar sair, poderá voltar e escolher continuar ou começar novamente.
      </p>

      {hasSavedProgress ? (
        <div className="mt-7 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-left">
          <p className="font-semibold text-slate-900">Encontramos um preenchimento anterior.</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {savedStep && savedStep > 1
              ? `Você parou na etapa ${savedStep}. Você pode continuar de onde parou ou apagar somente o rascunho deste onboarding.`
              : 'Você pode continuar o preenchimento salvo ou apagar somente o rascunho deste onboarding.'}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onContinue}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#155BCB] px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {continueLabel}
            </button>
            <button
              type="button"
              onClick={onStartFresh}
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Começar do zero
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onStart}
          className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#155BCB] px-6 py-3 text-base font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto sm:min-w-64"
        >
          Começar
          <span aria-hidden="true">→</span>
        </button>
      )}

      <p className="mt-5 text-xs leading-5 text-slate-500">
        “Começar do zero” limpa apenas o rascunho local deste preenchimento. Não exclui sua conta nem outros casos salvos.
      </p>
    </div>
  </section>
  );
};
