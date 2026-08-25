import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  Printer,
  X,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Scale,
  Car,
} from 'lucide-react';
import { useRouter } from '../../core/router/RouterContext';

interface DocumentRecord {
  id: string;
  caseId: string;
  title: string;
  clientName: string;
  clientCpf: string;
  aitNumber: string;
  infractionCode: string;
  infractionDescription: string;
  organ: string;
  procedureType: string;
  procedureLabel: string;
  status: string;
  version: string;
  thesesCount: number;
  engine: string;
  generatedAt: string;
  draftText: string;
  vehiclePlate: string;
}

export const AdminDocumentsView: React.FC = () => {
  const { navigate } = useRouter();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/documents');
      if (!res.ok) throw new Error('Falha ao carregar documentos');
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err: any) {
      console.error('Error fetching documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.aitNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.caseId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      typeFilter === 'all' ? true : doc.procedureType === typeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-400" />
            <h1 className="text-lg font-bold text-white font-mono">
              Repositório de Petições & Minutas Administrativas
            </h1>
          </div>
          <p className="text-sm text-slate-400 font-mono mt-0.5">
            Inspeção de peças geradas pelo motor determinístico CTB e modelos RAG
          </p>
        </div>

        <button
          onClick={fetchDocuments}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
          title="Recarregar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
          <span className="text-sm text-slate-400 uppercase font-bold">Total de Peças Geradas</span>
          <p className="text-xl font-bold text-white">{documents.length}</p>
          <p className="text-sm text-slate-500">Minutas ABNT estruturadas</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
          <span className="text-sm text-slate-400 uppercase font-bold">Liberadas (Pagas)</span>
          <p className="text-xl font-bold text-emerald-400">
            {documents.filter((d) => d.status === 'LIBERADO_PAGO').length}
          </p>
          <p className="text-sm text-slate-500">Prontas para protocolo e envio</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
          <span className="text-sm text-slate-400 uppercase font-bold">Em Análise / Preview</span>
          <p className="text-xl font-bold text-amber-400">
            {documents.filter((d) => d.status !== 'LIBERADO_PAGO').length}
          </p>
          <p className="text-sm text-slate-500">Aguardando confirmação do motorista</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por placa, AIT, cliente ou caso..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-orange-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto font-mono text-sm overflow-x-auto">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-xl cursor-pointer transition-colors whitespace-nowrap ${
              typeFilter === 'all'
                ? 'bg-orange-500 text-white font-bold'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Todas as Peças
          </button>
          <button
            onClick={() => setTypeFilter('defesa_previa')}
            className={`px-3 py-1.5 rounded-xl cursor-pointer transition-colors whitespace-nowrap ${
              typeFilter === 'defesa_previa'
                ? 'bg-orange-500 text-white font-bold'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Defesa Prévia
          </button>
          <button
            onClick={() => setTypeFilter('conversao_advertencia')}
            className={`px-3 py-1.5 rounded-xl cursor-pointer transition-colors whitespace-nowrap ${
              typeFilter === 'conversao_advertencia'
                ? 'bg-orange-500 text-white font-bold'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Conversão (Art. 267)
          </button>
          <button
            onClick={() => setTypeFilter('recurso_jari')}
            className={`px-3 py-1.5 rounded-xl cursor-pointer transition-colors whitespace-nowrap ${
              typeFilter === 'recurso_jari'
                ? 'bg-orange-500 text-white font-bold'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            JARI (1ª Instância)
          </button>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase text-sm">
                <th className="p-3.5">Petição / Caso</th>
                <th className="p-3.5">Cliente & Veículo</th>
                <th className="p-3.5">Tipo de Procedimento</th>
                <th className="p-3.5">Órgão Destinatário</th>
                <th className="p-3.5">Teses</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-orange-500 mb-2" />
                    Carregando repositório de petições...
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Nenhum documento encontrado.
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-white">{doc.title}</div>
                      <div
                        onClick={() => navigate(`/admin/cases/${doc.caseId}`)}
                        className="text-sm text-orange-400 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <span>Caso #{doc.caseId} • AIT {doc.aitNumber}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="text-white font-medium">{doc.clientName}</div>
                      <div className="text-sm text-slate-500">Placa: {doc.vehiclePlate}</div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-sm font-bold bg-slate-800 text-slate-200 border border-slate-700">
                        {doc.procedureLabel}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-300">
                      {doc.organ}
                    </td>
                    <td className="p-3.5">
                      <span className="text-emerald-400 font-bold">{doc.thesesCount} teses</span>
                    </td>
                    <td className="p-3.5">
                      {doc.status === 'LIBERADO_PAGO' ? (
                        <span className="px-2 py-0.5 rounded text-sm font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          LIBERADO (PAGO)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-sm font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          PREVIEW
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Inspecionar Minuta A4"
                        >
                          <Eye className="w-3.5 h-3.5 text-orange-400" />
                          <span>Inspecionar</span>
                        </button>
                        <button
                          onClick={() => navigate(`/admin/cases/${doc.caseId}`)}
                          className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                          title="Ver caso completo"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Inspection Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-mono">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-orange-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">{previewDoc.title}</h3>
                  <p className="text-sm text-slate-400">
                    Cliente: {previewDoc.clientName} • Auto: {previewDoc.aitNumber} • {previewDoc.procedureLabel}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                  title="Imprimir"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                  title="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto bg-slate-950 flex-1 text-slate-200 text-sm leading-relaxed space-y-4 whitespace-pre-wrap selection:bg-orange-500 selection:text-white">
              {previewDoc.draftText}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between text-sm">
              <span className="text-sm text-slate-500">
                Motor: {previewDoc.engine} • Versão {previewDoc.version}
              </span>
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold cursor-pointer transition-colors"
              >
                Concluir Leitura
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
