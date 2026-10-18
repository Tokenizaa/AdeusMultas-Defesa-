import { useState, type FormEvent } from 'react';
import { authFetch } from '../lib/authFetch';
import {
  normalizeManualIntake,
  validateManualIntake,
  type ManualIntakeErrors,
  type ManualIntakeInput,
} from './manual-intake-validation';

const EMPTY_FORM: ManualIntakeInput = {
  aitNumber: '',
  infractionCode: '',
  autuadorBody: '',
  dateTime: '',
  location: '',
  plate: '',
  brandModel: '',
  serviceType: 'defesa_previa',
};

type CreatedCase = { id: string; claimToken?: string; status?: string };

function TextField({
  id,
  label,
  hint,
  value,
  onChange,
  error,
  required = false,
  maxLength,
  placeholder,
  type = 'text',
}: {
  id: keyof ManualIntakeInput;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-slate-800">
        {label}{required ? ' *' : ''}
      </label>
      <p id={`${id}-hint`} className="text-xs leading-5 text-slate-500">{hint}</p>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-hint ${id}-error` : `${id}-hint`}
        className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-200"
      />
      {error && <p id={`${id}-error`} role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}

export function ManualIntakePage() {
  const [form, setForm] = useState<ManualIntakeInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<ManualIntakeErrors>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [createdCase, setCreatedCase] = useState<CreatedCase>();

  function update<K extends keyof ManualIntakeInput>(key: K, value: ManualIntakeInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setError('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeManualIntake(form);
    const nextErrors = validateManualIntake(normalized);
    setErrors(nextErrors);
    setError('');
    if (Object.keys(nextErrors).length) return;

    setBusy(true);
    try {
      const response = await authFetch('/api/cases/anonymous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          infraction: {
            aitNumber: normalized.aitNumber,
            infractionCode: normalized.infractionCode,
            autuadorBody: normalized.autuadorBody,
            dateTime: normalized.dateTime || undefined,
            location: normalized.location,
          },
          vehicle: { plate: normalized.plate, brandModel: normalized.brandModel || undefined },
          serviceType: normalized.serviceType,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof body?.message === 'string' ? body.message : typeof body?.error === 'string' ? body.error : `Não foi possível salvar o caso (HTTP ${response.status}).`);
      }
      if (typeof body?.id !== 'string' || !body.id) throw new Error('A API não confirmou a criação do caso.');
      const result: CreatedCase = { id: body.id, claimToken: typeof body.claimToken === 'string' ? body.claimToken : undefined, status: typeof body.status === 'string' ? body.status : undefined };
      try {
        sessionStorage.setItem('defesai_manual_onboarding_case_id', result.id);
        if (result.claimToken) sessionStorage.setItem('defesai_manual_onboarding_claim_token', result.claimToken);
      } catch {
        // Persistência do caso é do backend; storage local serve somente à recuperação da sessão.
      }
      setCreatedCase(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ocorreu um erro inesperado ao salvar o caso.');
    } finally {
      setBusy(false);
    }
  }

  if (createdCase) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 sm:px-6">
        <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <p className="text-sm font-semibold text-emerald-800">Dados salvos</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Seu caso foi registrado</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Identificador do caso: <span className="font-mono">{createdCase.id}</span></p>
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            Esta etapa confirma apenas o registro dos dados. A análise jurídica e a geração do documento não são declaradas concluídas nesta versão de validação.
          </div>
          <button type="button" onClick={() => { setCreatedCase(undefined); setForm(EMPTY_FORM); }} className="mt-6 min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold">Iniciar outro caso</button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-7">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Adeus Multa · Novo fluxo</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Informe os dados da autuação</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Preencha os campos manualmente. Você encontra essas informações na notificação de autuação ou no documento enviado pelo órgão. Não envie arquivos nesta etapa.</p>
          <p className="mt-2 text-sm text-slate-500">* Campos obrigatórios. Não invente dados: se uma informação não estiver disponível, consulte o documento ou o órgão responsável antes de continuar.</p>
        </header>

        <form onSubmit={submit} noValidate className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField id="aitNumber" label="Número do auto de infração (AIT)" hint="Copie o número completo, preservando letras e zeros." value={form.aitNumber} onChange={(v) => update('aitNumber', v)} error={errors.aitNumber} required maxLength={80} placeholder="Ex.: A123456789" />
            <TextField id="infractionCode" label="Código da infração" hint="Informe o código que aparece na notificação." value={form.infractionCode} onChange={(v) => update('infractionCode', v)} error={errors.infractionCode} required maxLength={20} placeholder="Ex.: 745-5" />
            <TextField id="autuadorBody" label="Órgão autuador" hint="Ex.: DETRAN, prefeitura ou órgão rodoviário. Se não souber, deixe em branco." value={form.autuadorBody} onChange={(v) => update('autuadorBody', v)} error={errors.autuadorBody} maxLength={120} placeholder="Nome indicado na notificação" />
            <TextField id="dateTime" label="Data e hora da infração" hint="Use a data e o horário indicados no documento." value={form.dateTime} onChange={(v) => update('dateTime', v)} error={errors.dateTime} type="datetime-local" maxLength={40} />
            <div className="sm:col-span-2">
              <TextField id="location" label="Local da infração" hint="Informe rua/rodovia, número ou km, município e UF, conforme constar na notificação." value={form.location} onChange={(v) => update('location', v)} error={errors.location} required maxLength={240} placeholder="Ex.: Av. Brasil, km 12, Porto Alegre/RS" />
            </div>
            <TextField id="plate" label="Placa do veículo" hint="Digite a placa sem adivinhar caracteres ilegíveis." value={form.plate} onChange={(v) => update('plate', v.toUpperCase())} error={errors.plate} required maxLength={8} placeholder="ABC1D23" />
            <TextField id="brandModel" label="Marca e modelo" hint="Opcional nesta etapa. Consulte o documento do veículo se precisar confirmar." value={form.brandModel} onChange={(v) => update('brandModel', v)} error={errors.brandModel} maxLength={120} placeholder="Ex.: Fiat Argo" />
            <div className="sm:col-span-2 grid gap-2">
              <label htmlFor="serviceType" className="text-sm font-semibold text-slate-800">Etapa do processo</label>
              <p className="text-xs leading-5 text-slate-500">Escolha conforme o documento recebido. Se ainda não recebeu penalidade, normalmente está na fase de defesa da autuação; confira a notificação antes de selecionar.</p>
              <select id="serviceType" name="serviceType" value={form.serviceType} onChange={(event) => update('serviceType', event.target.value as ManualIntakeInput['serviceType'])} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-base">
                <option value="defesa_previa">Defesa prévia — notificação de autuação</option>
                <option value="recurso_jari">Recurso à JARI — notificação de penalidade</option>
              </select>
            </div>
          </div>

          {error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <div className="mt-7 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md text-xs leading-5 text-slate-500">Seus dados são enviados ao servidor para registrar o caso. Nenhum OCR ou extração automática de documentos é executado.</p>
            <button type="submit" disabled={busy} className="min-h-12 rounded-lg bg-slate-950 px-6 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60">{busy ? 'Salvando dados…' : 'Registrar dados'}</button>
          </div>
        </form>
      </div>
    </main>
  );
}
