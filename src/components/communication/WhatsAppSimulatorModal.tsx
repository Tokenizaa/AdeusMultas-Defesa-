import React, { useState } from 'react';
import { MessageSquare, Send, CheckCheck, X, Bot, Shield } from 'lucide-react';

interface WhatsAppSimulatorModalProps {
  caseId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppSimulatorModal: React.FC<WhatsAppSimulatorModalProps> = ({
  caseId,
  isOpen,
  onClose,
}) => {
  const [phoneNumber, setPhoneNumber] = useState<string>('+55 (11) 98765-4321');
  const [notificationType, setNotificationType] = useState<string>('status_update');
  const [messagePreview, setMessagePreview] = useState<string>(
    `🚗 *Adeus Multa — Alerta Processual*\n\nOlá Carlos! O seu recurso referente ao Auto *1B892014* foi protocolado com sucesso perante a JARI do DETRAN-SP.\n\n📄 *Status:* Em Julgamento Ordinário\n⏱ *Prazo Estimado de Decisão:* 30 a 45 dias.\n\nVocê receberá um novo alerta assim que o parecer for publicado.`
  );
  const [isSent, setIsSent] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/communication/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneNumber,
          message: messagePreview,
          caseId,
          notificationType,
        }),
      });
      setIsSent(true);
      setTimeout(() => {
        setIsSent(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error sending WhatsApp message:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-5 shadow-xl border border-slate-200 text-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-emerald-600 text-white flex items-center justify-center">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Notificação WhatsApp Automatizada</h3>
              <p className="text-sm text-slate-500 font-mono">Evolution API • Webhook Seguro</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSend} className="space-y-3 mt-3">
          <div>
            <label className="font-bold text-slate-700 uppercase block text-sm font-mono">
              Número do Destinatário
            </label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 text-sm outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 uppercase block text-sm font-mono">
              Tipo de Evento do Processo
            </label>
            <select
              value={notificationType}
              onChange={(e) => setNotificationType(e.target.value)}
              className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="status_update">Atualização de Julgamento (JARI)</option>
              <option value="defense_ready">Minuta Pronta para Protocolo</option>
              <option value="deadline_reminder">Lembrete de Prazo Fatal</option>
              <option value="deferimento">Vitória / Cancelamento Confirmado</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 uppercase block text-sm font-mono">
              Mensagem Formatada (WhatsApp Markdown)
            </label>
            <textarea
              rows={5}
              value={messagePreview}
              onChange={(e) => setMessagePreview(e.target.value)}
              className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-slate-500 hover:text-slate-800 font-semibold"
            >
              Fechar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs font-mono text-sm uppercase"
            >
              {isSent ? <CheckCheck className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
              <span>{isSent ? 'Mensagem Enviada!' : 'Enviar WhatsApp'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
