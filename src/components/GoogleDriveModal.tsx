import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
  uploadCardInfoFolderToDrive,
  SyncProgress,
  DriveFileInfo
} from '../services/authAndDrive';
import { getDriveAssetUrls, LOCAL_ASSETS } from '../utils/driveAssetUrls';
import { HardDrive, CloudUpload, CheckCircle, AlertCircle, LogOut, ExternalLink, RefreshCw, X, Shield } from 'lucide-react';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({ isOpen, onClose }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [syncedFiles, setSyncedFiles] = useState<DriveFileInfo[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeAssetUrls, setActiveAssetUrls] = useState<Record<string, string>>(() => getDriveAssetUrls());

  useEffect(() => {
    const unsubscribe = initAuth(
      (u, t) => {
        setUser(u);
        setToken(t);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );

    const handleAssetsUpdated = () => {
      setActiveAssetUrls(getDriveAssetUrls());
    };
    window.addEventListener('drive_assets_updated', handleAssetsUpdated);

    return () => {
      unsubscribe();
      window.removeEventListener('drive_assets_updated', handleAssetsUpdated);
    };
  }, []);

  if (!isOpen) return null;

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        setSuccessMsg('Conectado ao Google Drive com sucesso!');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao conectar com o Google Drive.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleStartSync = async () => {
    let currentToken = token;
    if (!user || !currentToken) {
      try {
        const res = await googleSignIn();
        if (res) {
          setUser(res.user);
          setToken(res.accessToken);
          currentToken = res.accessToken;
        } else {
          return;
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Autenticação necessária para mover os arquivos.');
        return;
      }
    }

    setIsSyncing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const results = await uploadCardInfoFolderToDrive(currentToken, (p) => {
        setProgress(p);
      });

      setSyncedFiles(results);
      setSuccessMsg(`🚀 Todos os ${results.length} arquivos da pasta 'assets/card_info' foram movidos/sincronizados no Google Drive e as referências foram atualizadas para as novas URLs!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocorreu um erro durante o upload para o Google Drive.');
    } finally {
      setIsSyncing(false);
      setProgress(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setSuccessMsg('Desconectado do Google Drive.');
  };

  const isUsingDriveUrls = Object.values(activeAssetUrls).some(url => typeof url === 'string' && (url.includes('googleusercontent.com') || url.includes('drive.google.com')));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-cyan-500/50 rounded-2xl p-6 text-white shadow-[0_0_50px_rgba(6,182,212,0.3)] max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/30 text-cyan-400">
              <HardDrive className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Integração Google Drive — <span className="text-cyan-400">assets/card_info</span>
              </h2>
              <p className="text-xs text-slate-400">
                Gerencie e substitua referências de imagens pelas URLs do Google Drive
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Status Bar */}
        <div className="my-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between flex-wrap gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center font-bold text-cyan-300">
                {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
              </div>
              <div className="text-xs">
                <p className="font-semibold text-slate-200">{user.displayName || 'Usuário Conectado'}</p>
                <p className="text-slate-400">{user.email}</p>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Conecte sua conta do Google Drive para fazer upload dos arquivos da pasta <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">assets/card_info</code>.</span>
            </div>
          )}

          {user ? (
            <button
              onClick={handleLogout}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 bg-rose-500/10 px-2.5 py-1.5 rounded-lg border border-rose-500/20 hover:bg-rose-500/20 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" /> Sair
            </button>
          ) : (
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs px-3 py-2 rounded-lg flex items-center gap-2 shadow-md transition-all hover:scale-105"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              {isLoggingIn ? 'Conectando...' : 'Entrar com Google'}
            </button>
          )}
        </div>

        {/* Current Reference Status */}
        <div className="mb-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-slate-300">Status Atual das Referências:</span>
            {isUsingDriveUrls ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Usando URLs do Google Drive
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Usando Arquivos Locais (Fallback)
              </span>
            )}
          </div>
          <p className="text-slate-400">
            Clique no botão abaixo para mover os arquivos da pasta <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">assets/card_info</code> para a pasta <strong>card_info</strong> do Google Drive. Todas as cartas do jogo serão atualizadas instantaneamente para usar as URLs publicamente visíveis do Drive!
          </p>
        </div>

        {/* Action Button */}
        <div className="mb-6">
          <button
            onClick={handleStartSync}
            disabled={isSyncing}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin text-cyan-200" />
                Movendo arquivos para o Google Drive ({progress?.index || 0}/{progress?.total || 7})...
              </>
            ) : (
              <>
                <CloudUpload className="w-5 h-5 text-cyan-200" />
                Mover 'assets/card_info' para o Google Drive e Substituir Referências
              </>
            )}
          </button>
        </div>

        {/* Progress Bar */}
        {isSyncing && progress && (
          <div className="mb-4 p-3 bg-slate-950/90 rounded-xl border border-cyan-500/40">
            <div className="flex justify-between text-xs text-slate-300 mb-1.5 font-semibold">
              <span>Enviando: <span className="text-cyan-300">{progress.fileName}</span></span>
              <span>{progress.index} de {progress.total}</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-cyan-400 h-full transition-all duration-300 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                style={{ width: `${(progress.index / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Notifications */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* File URLs List */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Mapeamento de URLs dos Arquivos ({Object.keys(LOCAL_ASSETS).length})</span>
            <span className="text-[10px] text-slate-500">Google Drive & Fallbacks</span>
          </h3>

          <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
            {Object.keys(LOCAL_ASSETS).map((fileName) => {
              const url = activeAssetUrls[fileName] || LOCAL_ASSETS[fileName];
              const isDrive = url.includes('googleusercontent.com') || url.includes('drive.google.com');

              return (
                <div
                  key={fileName}
                  className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-200 truncate">{fileName}</span>
                      {isDrive ? (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                          Google Drive
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-400">
                          Local
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 truncate font-mono mt-0.5">{url}</p>
                  </div>

                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors shrink-0 flex items-center gap-1 text-[11px]"
                    title="Abrir URL"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
