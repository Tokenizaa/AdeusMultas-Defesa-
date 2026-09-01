import * as XLSX from 'xlsx';
import { Lead } from '../types';

export interface XlsxExportOptions {
  collectionRunId?: string;
  searchTerm?: string;
  location?: string;
  totalFound?: number;
  totalProcessed?: number;
  duplicates?: number;
  errors?: number;
}

export async function generateLeadsXlsx(
  leads: Lead[],
  options: XlsxExportOptions = {},
): Promise<Buffer> {
  const resultados = (leads || []).map((l) => ({
    Nome: l.name || null,
    Categoria: l.category || null,
    Endereço: l.address || null,
    Telefone: l.phone || null,
    Website: l.website || null,
    'Google Maps URL': l.googleMapsUrl || l.sourceUrl || null,
    'Place ID': l.placeId || null,
    Avaliação: l.rating ?? null,
    'Número de Avaliações': l.reviewCount ?? null,
    'Nível de Preço': l.priceLevel ?? null,
    Horários: l.openingHours || null,
    Status: l.currentStatus || null,
    Descrição: l.description || null,
    Latitude: l.latitude ?? null,
    Longitude: l.longitude ?? null,
    'Plus Code': l.plusCode || null,
    'Data da Coleta': l.scraped_at ? new Date(l.scraped_at).toISOString() : null,
    'Termo de Busca': l.searchTerm || null,
    'Localização da Busca': l.searchLocation || null,
    'Links Sociais': l.socialLinks ? l.socialLinks.join('; ') : null,
  }));

  const wsResultados = XLSX.utils.json_to_sheet(resultados);

  const metadados = [
    { Campo: 'Pesquisa', Valor: options.searchTerm || null },
    { Campo: 'Localização', Valor: options.location || null },
    { Campo: 'Data', Valor: options.collectionRunId ? new Date().toISOString() : new Date().toISOString() },
    { Campo: 'Total Encontrado', Valor: options.totalFound ?? leads.length },
    { Campo: 'Total Processado', Valor: options.totalProcessed ?? leads.length },
    { Campo: 'Duplicados', Valor: options.duplicates ?? 0 },
    { Campo: 'Erros', Valor: options.errors ?? 0 },
  ];
  const wsMetadados = XLSX.utils.json_to_sheet(metadados);

  // Aba RAW_DATA com dados brutos para debugging/reprocessamento
  const rawData = (leads || []).map((l) => ({
    Nome: l.name || null,
    'Raw Data': l.rawData ? JSON.stringify(l.rawData, null, 2) : null,
  }));
  const wsRawData = XLSX.utils.json_to_sheet(rawData);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsResultados, 'Resultados');
  XLSX.utils.book_append_sheet(wb, wsMetadados, 'Metadados');
  XLSX.utils.book_append_sheet(wb, wsRawData, 'RAW_DATA');

  const buffer = Buffer.from(XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }));
  return buffer;
}