import React, { useState, useEffect, useCallback } from 'react';
import {
  Folder,
  FileText,
  Upload,
  Trash2,
  ExternalLink,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  HardDrive,
  LogOut,
  Sparkles,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import {
  googleSignIn,
  googleLogout,
  getAccessToken,
  getCurrentGoogleUser,
  initAuth,
} from '../../lib/google-auth';
import {
  googleDriveService,
  DriveFileItem,
  DriveQuotaInfo,
} from '../../core/integrations/google-drive-service';
import { User } from 'firebase/auth';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Optional content to export immediately
  documentToExport?: {
    title: string;
    content: string;
    aitNumber?: string;
    plate?: string;
  };
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  documentToExport,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [appFolder, setAppFolder] = useState<DriveFileItem | null>(null);
  const [quota, setQuota] = useState<DriveQuotaInfo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // Export action state
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);
  const [exportedFileLink, setExportedFileLink] = useState<string | null>(null);

  // Delete confirmation modal state (Required by workspace skill)
  const [fileToDelete, setFileToDelete] = useState<DriveFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check auth state on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        if (user && token) {
          setCurrentUser(user);
          setIsAuthenticated(true);
        }
      },
      () => {
        setCurrentUser(null);
        setIsAuthenticated(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const loadDriveData = useCallback(async () => {
    try {
      setIsLoadingFiles(true);
      setAuthError(null);

      // 1. Get or create app folder
      const folder = await googleDriveService.findOrCreateAppFolder();
      setAppFolder(folder);

      // 2. List files in app folder
      const driveFiles = await googleDriveService.listFiles(folder.id, searchTerm);
      setFiles(driveFiles);

      // 3. Get storage info
      const about = await googleDriveService.getAbout();
      setQuota(about.storageQuota);
    } catch (err: any) {
      console.error('Failed to load drive files:', err);
      setAuthError(err.message || 'Erro ao carregar dados do Google Drive');
    } finally {
      setIsLoadingFiles(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadDriveData();
    }
  }, [isOpen, isAuthenticated, loadDriveData]);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    try {
      setIsAuthenticating(true);
      setAuthError(null);
      const result = await googleSignIn();
      if (result) {
        setCurrentUser(result.user);
        setIsAuthenticated(true);
        loadDriveData();
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      setAuthError(err.message || 'Falha ao conectar com o Google');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await googleLogout();
      setCurrentUser(null);
      setIsAuthenticated(false);
      setFiles([]);
      setAppFolder(null);
      setExportSuccessMessage(null);
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  const handleExportCurrentDocument = async () => {
    if (!documentToExport) return;
    try {
      setIsExporting(true);
      setAuthError(null);
      setExportSuccessMessage(null);

      const targetFolder = appFolder || (await googleDriveService.findOrCreateAppFolder());
      setAppFolder(targetFolder);

      const fileName = `Recurso_${documentToExport.aitNumber || 'Multa'}_${documentToExport.plate || 'Defesa'}.txt`;
      const result = await googleDriveService.uploadTextFile(
        fileName,
        documentToExport.content,
        targetFolder.id,
        'text/plain'
      );

      setExportSuccessMessage(`Petição salva com sucesso na pasta "${targetFolder.name}"!`);
      setExportedFileLink(result.webViewLink || null);
      loadDriveData();
    } catch (err: any) {
      console.error('Export error:', err);
      setAuthError(err.message || 'Falha ao exportar documento para o Google Drive');
    } finally {
      setIsExporting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    try {
      setIsDeleting(true);
      await googleDriveService.deleteFile(fileToDelete.id);
      setFileToDelete(null);
      loadDriveData();
    } catch (err: any) {
      console.error('Delete error:', err);
      setAuthError(err.message || 'Falha ao remover arquivo do Google Drive');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatBytes = (bytesStr?: string) => {
    if (!bytesStr) return '0 MB';
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes)) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Google Drive
                <span className="text-sm px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-semibold">
                  Google Workspace
                </span>
              </h2>
              <p className="text-sm text-slate-500">
                Sincronize recursos, autos de infração e minutas com permissão da sua conta
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Auth State Not Connected */}
          {!isAuthenticated ? (
            <div className="py-8 px-4 text-center max-w-md mx-auto space-y-5">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <HardDrive className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900">
                  Conecte seu Google Drive
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Salve e acesse todas as suas petições, recursos e anexos diretamente no Google Drive com segurança total e permissão explícita.
                </p>
              </div>

              {authError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-sm text-left">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              {/* Official Google Sign-in Button */}
              <button
                onClick={handleSignIn}
                disabled={isAuthenticating}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-300 rounded-xl shadow-xs transition-all cursor-pointer hover:border-slate-400 disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>{isAuthenticating ? 'Conectando com o Google...' : 'Entrar com o Google'}</span>
              </button>

              <div className="flex items-center justify-center gap-1.5 text-sm text-slate-400 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Autenticação direta via Google Identity Services</span>
              </div>
            </div>
          ) : (
            <>
              {/* Connected User Bar */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {currentUser?.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'Google User'}
                      className="w-9 h-9 rounded-full border border-slate-200"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-sm">
                      {currentUser?.displayName?.charAt(0) || 'G'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {currentUser?.displayName || 'Conta Google'}
                    </p>
                    <p className="text-sm text-slate-500 truncate font-mono">
                      {currentUser?.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {quota && (
                    <span className="hidden sm:inline-block text-sm text-slate-500 font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      Uso: {formatBytes(quota.usageInDrive || quota.usage)}
                    </span>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="Desconectar conta Google"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 1-Click Export Callout if Document Passed */}
              {documentToExport && (
                <div className="p-4 bg-orange-50/80 border border-orange-200 rounded-2xl space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-orange-600" />
                      <h4 className="text-sm font-bold text-slate-900 font-mono uppercase">
                        Exportação Rápida da Petição
                      </h4>
                    </div>
                    <span className="text-sm font-mono font-bold bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
                      {documentToExport.aitNumber || 'Auto de Infração'}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600">
                    Salvar a minuta <strong>{documentToExport.title}</strong> diretamente na pasta do Google Drive:
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleExportCurrentDocument}
                      disabled={isExporting}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isExporting ? 'Salvando no Drive...' : 'Salvar no Google Drive'}</span>
                    </button>

                    {exportSuccessMessage && (
                      <div className="flex items-center gap-1.5 text-sm text-emerald-700 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{exportSuccessMessage}</span>
                        {exportedFileLink && (
                          <a
                            href={exportedFileLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-600 hover:underline flex items-center gap-0.5 ml-1 font-bold"
                          >
                            <span>Abrir</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Drive Folder & Files Browser */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-bold text-slate-800">
                      {appFolder?.name || 'Pasta Adeus Multa'}
                    </span>
                    {appFolder?.webViewLink && (
                      <a
                        href={appFolder.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-slate-600"
                        title="Abrir pasta no Google Drive"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <button
                    onClick={loadDriveData}
                    disabled={isLoadingFiles}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Atualizar lista"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Pesquisar arquivos salvos no Drive..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>

                {/* Files List */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {isLoadingFiles ? (
                    <div className="p-6 text-center text-sm text-slate-400">
                      <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-slate-400" />
                      Carregando arquivos do Google Drive...
                    </div>
                  ) : files.length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-400 space-y-1">
                      <FileText className="w-6 h-6 mx-auto text-slate-300 mb-1" />
                      <p>Nenhum documento encontrado nesta pasta.</p>
                      <p className="text-sm text-slate-400">
                        Clique em "Salvar no Google Drive" para sincronizar sua primeira petição.
                      </p>
                    </div>
                  ) : (
                    files.map((file) => (
                      <div
                        key={file.id}
                        className="p-3 hover:bg-slate-50/80 flex items-center justify-between gap-3 transition-colors text-sm"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-4 h-4 text-orange-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 truncate">{file.name}</p>
                            <p className="text-sm text-slate-400 font-mono">
                              {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString('pt-BR') : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold flex items-center gap-1 transition-colors"
                            >
                              <span>Visualizar</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          <button
                            onClick={() => setFileToDelete(file)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Excluir arquivo do Drive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-bold rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal (Workspace Skill Requirement) */}
      {fileToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Excluir do Google Drive?</h4>
                <p className="text-sm text-slate-500">Confirmação obrigatória</p>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              Tem certeza que deseja remover o arquivo{' '}
              <strong className="text-slate-800">{fileToDelete.name}</strong> do seu Google Drive?
              Esta ação enviará o arquivo para a lixeira do seu Drive.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 text-sm font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
