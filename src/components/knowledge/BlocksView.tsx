import React from 'react';
import { DocumentBlocksView } from './DocumentBlocksView';

export const BlocksView: React.FC<{
  searchQuery?: string;
  categoryFilter?: string | null;
}> = () => {
  return <DocumentBlocksView />;
};
