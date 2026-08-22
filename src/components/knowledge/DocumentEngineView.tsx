import React from 'react';
import { DocumentEngineSimulator } from './DocumentEngineSimulator';

export const DocumentEngineView: React.FC<{
  searchQuery?: string;
  categoryFilter?: string | null;
}> = () => {
  return <DocumentEngineSimulator />;
};
