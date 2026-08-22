import React from 'react';
import {
  Gauge,
  Wine,
  Smartphone,
  CircleDot,
  ParkingSquare,
  ShieldQuestion,
  FileCheck2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { InfractionCategory } from '../../../core/onboarding/rules-matrix';

interface InfractionCategoryStepProps {
  selectedCategory: InfractionCategory;
  onSelectCategory: (category: InfractionCategory) => void;
  onNext: () => void;
  onBack: () => void;
  isAdmin?: boolean;
}

interface CategoryCardItem {
  id: InfractionCategory;
  title: string;
  subtitle: string;
  badge: string;
  icon: React.ReactNode;
}

export const InfractionCategoryStep: React.FC<InfractionCategoryStepProps> = ({
  selectedCategory,
  onSelectCategory,
  onNext,
  onBack,
}) => {
  const categoriesList: CategoryCardItem[] = [
    {
      id: 'excesso_velocidade',
      title: 'Velocidade / Radar',
      subtitle: 'Resolução CONTRAN 798/20, margem de tolerância e aferição do medidor.',
      badge: 'Art. 218 CTB',
      icon: <Gauge className="w-5 h-5" />,
    },
    {
      id: 'lei_seca',
      title: 'Lei Seca / Bafômetro',
      subtitle: 'Abordagem com etilômetro ou recusa ao teste e termo de constatação.',
      badge: 'Art. 165 / 165-A',
      icon: <Wine className="w-5 h-5" />,
    },
    {
      id: 'celular',
      title: 'Celular ao Volante',
      subtitle: 'Manuseio, uso de GPS no suporte veicular ou veículo parado em semáforo.',
      badge: 'Art. 252 CTB',
      icon: <Smartphone className="w-5 h-5" />,
    },
    {
      id: 'vermelho',
      title: 'Sinal Vermelho',
      subtitle: 'Avanço semafórico, tempo de amarelo curto ou passagem de emergência.',
      badge: 'Art. 208 CTB',
      icon: <CircleDot className="w-5 h-5" />,
    },
    {
      id: 'estacionamento',
      title: 'Estacionamento',
      subtitle: 'Parada rápida, ausência de sinalização R-6a ou falha no app rotativo.',
      badge: 'Art. 181 CTB',
      icon: <ParkingSquare className="w-5 h-5" />,
    },
    {
      id: 'conversao_advertencia',
      title: 'Advertência — Art. 267',
      subtitle: 'Isenção de 100% do valor da multa e zero pontos na CNH (sem reincidência).',
      badge: 'Art. 267 CTB',
      icon: <FileCheck2 className="w-5 h-5" />,
    },
    {
      id: 'outro',
      title: 'Outra Infração',
      subtitle: 'Cinto, licenciamento, ultrapassagem e demais infrações do CTB.',
      badge: 'CTB Geral',
      icon: <ShieldQuestion className="w-5 h-5" />,
    },
  ];

  const handleCardClick = (catId: InfractionCategory) => {
    onSelectCategory(catId);
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-7 shadow-xs space-y-6">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-2.5">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-[#155BCB] border border-blue-200 font-mono">
          <Sparkles className="w-3.5 h-3.5 text-[#155BCB]" />
          Tipo da Infração
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Sobre o tipo da infração
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
          Selecione a categoria da sua autuação para direcionarmos as teses jurídicas e as perguntas essenciais.
        </p>
      </div>

      {/* Categories Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {categoriesList.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              id={`category-card-${cat.id}`}
              onClick={() => handleCardClick(cat.id)}
              className={`group flex flex-col justify-between p-4 border rounded-xl transition-all text-left cursor-pointer relative ${
                isSelected
                  ? 'border-[#155BCB] bg-blue-50/60 ring-2 ring-[#155BCB]/20 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs hover:bg-slate-50/40'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-[#155BCB] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
                    }`}
                  >
                    {cat.icon}
                  </div>

                  {isSelected ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#155BCB] bg-blue-100/80 px-2 py-0.5 rounded-md font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Selecionado
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {cat.badge}
                    </span>
                  )}
                </div>

                <div>
                  <h3
                    className={`text-sm font-bold leading-tight ${
                      isSelected ? 'text-[#155BCB]' : 'text-slate-900'
                    }`}
                  >
                    {cat.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-2">
                    {cat.subtitle}
                  </p>
                </div>
              </div>

              <div className="pt-2.5 mt-2.5 border-t border-slate-100/80 flex items-center justify-between text-[11px]">
                <span className="font-mono text-slate-500">{cat.badge}</span>
                <span
                  className={`font-semibold transition-colors ${
                    isSelected ? 'text-[#155BCB]' : 'text-slate-400 group-hover:text-slate-700'
                  }`}
                >
                  {isSelected ? 'Configurado' : 'Selecionar'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Navigation Controls */}
      <div className="pt-4 flex justify-between items-center border-t border-slate-100">
        <button
          type="button"
          id="btn-back-to-stage"
          onClick={onBack}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer py-2 px-3 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>

        <button
          type="button"
          id="btn-next-to-identification"
          onClick={onNext}
          className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#155BCB] hover:bg-blue-700 text-white cursor-pointer shadow-xs transition-all flex items-center gap-2"
        >
          <span>Continuar</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
