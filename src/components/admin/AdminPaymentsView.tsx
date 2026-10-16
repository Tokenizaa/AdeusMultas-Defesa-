import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle2, Clock3, CreditCard, RefreshCw, Search, ShieldCheck, Users, Wallet } from 'lucide-react';
import { authFetch } from '../../lib/authFetch';

type Tab = 'payments' | 'affiliates' | 'commissions' | 'gateway';
type Payment = {
  id: string; case_id: string; user_id: string | null; gateway: string; amount: number;
  status: string; payment_method: string | null; gateway_transaction_id: string | null;
  reference_id: string | null; paid_at: string | null; created_at: string; is_test?: boolean;
};
type Affiliate = {
  userId: string; name: string; email: string; referrals: number; commissions: number;
  venopagUsername: string; splitPercent: number; active: boolean; configured: boolean;
};
type Commission = {
  id: string; beneficiary_id: string; buyer_user_id: string; level: number; base_amount: number;
  commission_amount: number; status: string; created_at: string; paid_at: string | null;
  beneficiaryName: string; buyerName: string;
};

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
const dateTime = (value?: string | null) => value ? new Date(value).toLocaleString('pt-BR') : '—';
const statusLabel = (status: string) => ({
  PAID: 'Pago', CONFIRMED: 'Confirmado', PENDING: 'Pendente', WAITING: 'Aguardando',
  DECLINED: 'Recusado', CANCELED: 'Cancelado', CANCELLED: 'Cancelado',
  REFUNDED: 'Estornado', CONTESTED: 'Contestado', CHARGEDBACK: 'Chargeback',
}[String(status || '').toUpperCase()] || status || 'Desconhecido');
const statusClass = (status: string) => ['PAID', 'CONFIRMED'].includes(String(status).toUpperCase())
  ? 'bg-emerald-50 text-emerald-700'
  : ['PENDING', 'WAITING'].includes(String(status).toUpperCase())
    ? 'bg-amber-50 text-amber-700'
    : ['REFUNDED', 'CONTESTED', 'CHARGEDBACK'].includes(String(status).toUpperCase())
      ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600';

export const AdminPaymentsView: React.FC = () => {
  const [tab, setTab] = useState<Tab>('payments');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState({ revenue: 0, paid: 0, pending: 0, total: 0, refunded: 0 });
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [gateway, setGateway] = useState<{ gateway: string; configured: boolean; environment: string } | null>(null);
  const [edits, setEdits] = useState<Record<string, { venopagUsername: string; splitPercent: string; active: boolean }>>({});
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [paymentRes, affiliateRes, commissionRes, gatewayRes] = await Promise.all([
        authFetch('/api/admin/payments'),
        authFetch('/api/admin/payments/affiliates'),
        authFetch('/api/admin/payments/commissions'),
        authFetch('/api/admin/payments/gateway'),
      ]);
      const responses = await Promise.all([paymentRes, affiliateRes, commissionRes, gatewayRes].map(async (res) => ({
        ok: res.ok, body: await res.json().catch(() => ({})),
      })));
      const [paymentResult, affiliateResult, commissionResult, gatewayResult] = responses;
      if (!paymentResult.ok) throw new Error(paymentResult.body?.error?.message || paymentResult.body?.message || 'Não foi possível carregar pagamentos.');
      setPayments(paymentResult.body.orders || []);
      setSummary(paymentResult.body.summary || { revenue: 0, paid: 0, pending: 0, total: 0, refunded: 0 });
      if (affiliateResult.ok) {
        const nextAffiliates: Affiliate[] = affiliateResult.body.affiliates || [];
        setAffiliates(nextAffiliates);
        setEdits(Object.fromEntries(nextAffiliates.map((a) => [a.userId, {
          venopagUsername: a.venopagUsername || '',
          splitPercent: String(a.splitPercent ?? 0),
          active: Boolean(a.active),
        }])));
      } else {
        setAffiliates([]);
        setError('A gestão de afiliados precisa da migration affiliate_gateway_profiles aplicada no Supabase.');
      }
      if (commissionResult.ok) setCommissions(commissionResult.body.commissions || []);
      else setError((previous) => previous || 'Não foi possível carregar o livro de comissões.');
      if (gatewayResult.ok) setGateway(gatewayResult.body);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados financeiros.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filteredPayments = useMemo(() => payments.filter((p) => {
    const term = search.trim().toLowerCase();
    const matchesTerm = !term || [p.id, p.case_id, p.user_id, p.gateway_transaction_id, p.reference_id, p.gateway]
      .some((v) => String(v || '').toLowerCase().includes(term));
    const normalized = String(p.status || '').toUpperCase();
    const matchesStatus = status === 'all' || (status === 'paid' && ['PAID', 'CONFIRMED'].includes(normalized))
      || (status === 'pending' && ['PENDING', 'WAITING'].includes(normalized))
      || (status === 'reversed' && ['REFUNDED', 'CONTESTED', 'CHARGEDBACK'].includes(normalized));
    return matchesTerm && matchesStatus;
  }), [payments, search, status]);

  const saveAffiliate = async (affiliate: Affiliate) => {
    const edit = edits[affiliate.userId];
    const percent = Number(edit?.splitPercent);
    if (!edit?.venopagUsername.trim()) {
      setError('Informe o username da conta beneficiária na VenoPag.');
      return;
    }
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      setError('O percentual do split precisa estar entre 0 e 100.');
      return;
    }
    setSavingId(affiliate.userId);
    setError('');
    setNotice('');
    try {
      const res = await authFetch(`/api/admin/payments/affiliates/${encodeURIComponent(affiliate.userId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venopagUsername: edit.venopagUsername.trim(), splitPercent: percent, active: edit.active }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error?.message || body?.message || 'Não foi possível salvar o afiliado.');
      setNotice('Configuração do afiliado salva. Ela será usada nas novas cobranças elegíveis.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar afiliado.');
    } finally {
      setSavingId('');
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'payments', label: 'Pagamentos', icon: CreditCard },
    { id: 'affiliates', label: 'Afiliados', icon: Users },
    { id: 'commissions', label: 'Comissões', icon: Wallet },
    { id: 'gateway', label: 'VenoPag', icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6 text-slate-900">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700"><Activity size={16} /> Módulo financeiro</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Pagamentos e afiliados</h1>
          <p className="mt-1 text-sm text-slate-500">Conciliação de transações, comissões e divisão de recebíveis via VenoPag.</p>
        </div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Atualizar dados
        </button>
      </header>

      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

      <nav className="flex flex-wrap gap-1 border-b border-slate-200" aria-label="Seções financeiras">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${tab === id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </nav>

      {tab === 'payments' && <>
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            ['Receita aprovada', money(summary.revenue)],
            ['Pagamentos aprovados', String(summary.paid)],
            ['Aguardando pagamento', String(summary.pending)],
            ['Total de ordens', String(summary.total)],
            ['Estornos/reversões', String(summary.refunded)],
          ].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-2 text-xl font-semibold tracking-tight">{value}</p>
          </div>)}
        </section>
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-sm"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input aria-label="Buscar transações" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar pedido, caso ou transação…" className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-600" />
            </div>
            <div className="flex flex-wrap gap-1">
              {[['all', 'Todas'], ['paid', 'Aprovadas'], ['pending', 'Pendentes'], ['reversed', 'Estornos']].map(([id, label]) =>
                <button key={id} onClick={() => setStatus(id)} className={`rounded-lg px-3 py-2 text-sm ${status === id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{label}</button>)}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>
                <th className="px-4 py-3 font-medium">Pedido / transação</th><th className="px-4 py-3 font-medium">Gateway</th><th className="px-4 py-3 font-medium">Valor</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Criado / pago</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">Carregando transações…</td></tr>
                  : filteredPayments.length === 0 ? <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">Nenhuma transação para os filtros selecionados.</td></tr>
                  : filteredPayments.map((p) => <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3"><div className="flex items-center gap-2 font-medium text-slate-900">{p.reference_id || p.case_id || p.id}{p.is_test && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800">Teste E2E</span>}</div><div className="mt-1 max-w-xs truncate font-mono text-xs text-slate-500">{p.gateway_transaction_id || p.id}</div></td>
                    <td className="px-4 py-3"><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium">{String(p.gateway || '—').toUpperCase()}</span><div className="mt-1 text-xs text-slate-500">{p.payment_method || '—'}</div></td>
                    <td className="px-4 py-3 font-medium tabular-nums">{money(p.amount)}</td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(p.status)}`}>{['PAID', 'CONFIRMED'].includes(String(p.status).toUpperCase()) ? <CheckCircle2 size={13} /> : <Clock3 size={13} />}{statusLabel(p.status)}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-500"><div>{dateTime(p.created_at)}</div><div className="mt-1">{p.paid_at ? `Pago: ${dateTime(p.paid_at)}` : 'Sem liquidação registrada'}</div></td>
                  </tr>)}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">A listagem mostra as ordens retornadas pela API; os indicadores usam os registros disponíveis no backend. Estornos e chargebacks não contam como receita aprovada.</div>
        </section>
      </>}

      {tab === 'affiliates' && <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4"><h2 className="font-semibold">Afiliados e splits VenoPag</h2><p className="mt-1 text-sm text-slate-500">Associe o usuário do programa ao username cadastrado na VenoPag. O split vale para novas cobranças que tenham indicação ativa.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 font-medium">Afiliado</th><th className="px-4 py-3 font-medium">Indicações</th><th className="px-4 py-3 font-medium">Comissões registradas</th><th className="px-4 py-3 font-medium">Username VenoPag</th><th className="px-4 py-3 font-medium">Split %</th><th className="px-4 py-3 font-medium">Ativo</th><th className="px-4 py-3"></th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">Carregando afiliados…</td></tr>
              : affiliates.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">Nenhum afiliado encontrado nas relações de indicação existentes.</td></tr>
              : affiliates.map((a) => { const edit = edits[a.userId] || { venopagUsername: '', splitPercent: '0', active: false }; return <tr key={a.userId}>
                <td className="px-4 py-3"><div className="font-medium">{a.name || 'Usuário sem nome'}</div><div className="text-xs text-slate-500">{a.email || a.userId}</div></td>
                <td className="px-4 py-3 tabular-nums">{a.referrals}</td><td className="px-4 py-3 tabular-nums">{money(a.commissions)}</td>
                <td className="px-4 py-3"><input value={edit.venopagUsername} onChange={(e) => setEdits((prev) => ({ ...prev, [a.userId]: { ...edit, venopagUsername: e.target.value } }))} placeholder="username VenoPag" className="w-44 rounded-md border border-slate-200 px-2.5 py-2 text-sm outline-none focus:border-emerald-600" /></td>
                <td className="px-4 py-3"><input type="number" min="0" max="100" step="0.1" value={edit.splitPercent} onChange={(e) => setEdits((prev) => ({ ...prev, [a.userId]: { ...edit, splitPercent: e.target.value } }))} className="w-20 rounded-md border border-slate-200 px-2.5 py-2 text-sm outline-none focus:border-emerald-600" /></td>
                <td className="px-4 py-3"><input type="checkbox" checked={edit.active} onChange={(e) => setEdits((prev) => ({ ...prev, [a.userId]: { ...edit, active: e.target.checked } }))} aria-label={`Ativar split de ${a.name}`} /></td>
                <td className="px-4 py-3"><button disabled={savingId === a.userId} onClick={() => void saveAffiliate(a)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50">{savingId === a.userId ? 'Salvando…' : 'Salvar'}</button></td>
              </tr>; })}
          </tbody>
        </table></div>
        <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">A VenoPag valida se o username existe e se a soma dos splits cabe no saldo líquido da cobrança. Configurar um afiliado não altera pagamentos já emitidos.</p>
      </section>}

      {tab === 'commissions' && <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4"><h2 className="font-semibold">Livro de comissões</h2><p className="mt-1 text-sm text-slate-500">Registros existentes de comissão; esta tela não marca repasses como pagos sem confirmação financeira.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 font-medium">Beneficiário</th><th className="px-4 py-3 font-medium">Comprador</th><th className="px-4 py-3 font-medium">Nível</th><th className="px-4 py-3 font-medium">Base</th><th className="px-4 py-3 font-medium">Comissão</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Data</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">Carregando comissões…</td></tr>
              : commissions.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">Nenhuma comissão registrada.</td></tr>
              : commissions.map((c) => <tr key={c.id}><td className="px-4 py-3"><div className="font-medium">{c.beneficiaryName}</div><div className="text-xs text-slate-500">{c.beneficiary_id}</div></td><td className="px-4 py-3">{c.buyerName}</td><td className="px-4 py-3">Nível {c.level}</td><td className="px-4 py-3 tabular-nums">{money(c.base_amount)}</td><td className="px-4 py-3 font-medium tabular-nums">{money(c.commission_amount)}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(c.status)}`}>{statusLabel(c.status)}</span></td><td className="px-4 py-3 text-xs text-slate-500">{dateTime(c.paid_at || c.created_at)}</td></tr>)}
          </tbody>
        </table></div>
      </section>}

      {tab === 'gateway' && <section className="max-w-3xl rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3"><div className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><ShieldCheck size={20} /></div><div><h2 className="font-semibold">Gateway VenoPag</h2><p className="mt-1 text-sm text-slate-500">Integração PIX server-to-server; as credenciais nunca são exibidas nesta interface.</p></div></div>
        <dl className="mt-6 divide-y divide-slate-100 border-y border-slate-100">
          <div className="flex items-center justify-between gap-4 py-3"><dt className="text-sm text-slate-500">Gateway principal</dt><dd className="font-medium">{gateway?.gateway || 'VenoPag'}</dd></div>
          <div className="flex items-center justify-between gap-4 py-3"><dt className="text-sm text-slate-500">Ambiente</dt><dd className="font-medium">{gateway?.environment || 'produção'}</dd></div>
          <div className="flex items-center justify-between gap-4 py-3"><dt className="text-sm text-slate-500">Credenciais configuradas</dt><dd className={`rounded-full px-2.5 py-1 text-xs font-semibold ${gateway?.configured ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{gateway?.configured ? 'Configuradas' : 'Incompletas'}</dd></div>
          <div className="flex items-center justify-between gap-4 py-3"><dt className="text-sm text-slate-500">Splits de afiliados</dt><dd className="font-medium">Aplicados a novas cobranças elegíveis</dd></div>
        </dl>
        <p className="mt-4 text-sm leading-6 text-slate-600">O webhook valida a assinatura, consulta o status no provedor e aceita reversões posteriores (estorno, contestação e chargeback). Não existe sandbox na API VenoPag; testes de ponta a ponta movimentam dinheiro real.</p>
        <a className="mt-4 inline-flex text-sm font-medium text-emerald-700 underline underline-offset-4" href="https://venopagments.com/docs/" target="_blank" rel="noreferrer">Documentação oficial da API VenoPag</a>
      </section>}
    </div>
  );
};

export default AdminPaymentsView;
