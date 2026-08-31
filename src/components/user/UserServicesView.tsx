import React, { useState, useEffect } from 'react';
import { useAuthFetch } from '../../hooks/useAuthFetch';
import { useRouter } from '../../core/router/RouterContext';
import { useAuth } from '../../core/auth/AuthContext';

interface ServicePricing {
  id: string;
  serviceType: string;
  serviceName: string;
  description: string;
  standardPrice: number;
  promotionalPrice?: number;
  isActive: boolean;
  // ... other fields
}

export const UserServicesView: React.FC = () => {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const authFetch = useAuthFetch();

  const [pricings, setPricings] = useState<ServicePricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPricings = async () => {
      try {
        setLoading(true);
        const response = await authFetch('/api/commercial/prices');
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
        const data: ServicePricing[] = await response.json();
        // Filter to active services only
        const active = data.filter((p) => p.isActive);
        setPricings(active);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching service pricings:', err);
        setError('Não foi possível carregar os valores dos serviços.');
        setPricings([]);
      } finally {
        setLoading(false);
      }
    };

    if (user?.isAuthenticated) {
      fetchPricings();
    }
  }, [user, authFetch]);

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block animate-spin rounded-full border-4 border-b-[#155BCB] w-12 h-12"></div>
        <p className="mt-4 text-sm text-slate-500">Carregando valores dos serviços...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 text-red-600 rounded-xl">
        <p className="font-medium">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="border-b border-[#CCCCCC] pb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#071D41]">Valores dos Serviços</h2>
          <p className="text-sm text-slate-600">
            Consulte os valores padrão e promocionais de cada serviço oferecido.
          </p>
        </div>
      </div>

      {pricings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500">Nenhum serviço ativo encontrado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pricings.map((service) => (
            <div
              key={service.id}
              className="border border-[#CCCCCC] rounded-xl p-4 bg-white shadow-xs hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center justify-between space-x-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#071D41]">{service.serviceName}</h3>
                  <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                    {service.description}
                  </p>
                  <p className="mt-2 text-xs font-mono text-slate-400">
                    Tipo: {service.serviceType}
                  </p>
                </div>
                <div className="text-right space-y-2">
                  <div className="text-sm font-medium text-[#071D41]">
                    De:{' '}
                    <span className="line-through text-slate-400">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(service.standardPrice)}
                    </span>
                  </div>
                  {service.promotionalPrice ? (
                    <>
                      <div className="text-lg font-bold text-[#168821]">
                        Por:{' '}
                        <span className="block">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(service.promotionalPrice)}
                        </span>
                      </div>
                      <div className="text-xs text-green-600">
                        Economia de:{' '}
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(
                          service.standardPrice - service.promotionalPrice
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-lg font-bold text-[#071D41]">
                      Preço:{' '}
                      <span className="block">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(service.standardPrice)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-center text-xs text-slate-500">
        <p>
          Os valores acima são em reais (BRL) e podem incluir descontos promocionais
          aplicáveis ao momento da contratação.
        </p>
      </div>
    </div>
  );
};