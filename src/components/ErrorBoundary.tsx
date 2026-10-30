import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Scale, RefreshCw, Home, AlertTriangle } from 'lucide-react';
import { Language } from '../i18n/translations';

interface Props {
  children: ReactNode;
  currentLang?: Language;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SEERAAI ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = window.location.origin + window.location.pathname + '?tab=home';
  };

  public render() {
    if (this.state.hasError) {
      const lang = this.props.currentLang || 'om';
      const isOm = lang === 'om';
      const isAm = lang === 'am';

      return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 my-8 text-center bg-slate-900/90 border border-amber-500/30 rounded-3xl max-w-2xl mx-auto shadow-2xl backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-5 shadow-inner">
            <AlertTriangle className="w-8 h-8 text-amber-400 animate-bounce" />
          </div>

          <div className="space-y-3 max-w-lg">
            <h2 className="text-xl sm:text-2xl font-bold font-serif-legal text-slate-100">
              {isOm
                ? 'Rakkoon Tursiisaa Uumameera (App View Error)'
                : isAm
                ? 'ጊዜያዊ ችግር አጋጥሟል (App View Error)'
                : 'Temporary View Loading Error'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {isOm
                ? 'Kutaan SeeraAI kun yeroof dogoggora uumeera. Maaloo button armaan gadii fayyadamuun irra deebi\'aanii fe\'aa ykn gara fuula duraatti deebi\'aa.'
                : isAm
                ? 'ይህ የሴራAI ክፍል በጊዜያዊነት አልተጫነም። እባክዎን ከታች ያለውን አዝራር በመጠቀም እንደገና ይጫኑ ወይም ወደ ዋናው ገጽ ይመለሱ።'
                : 'This SeeraAI module encountered a rendering error. Please try reloading the view or returning to the home screen.'}
            </p>
          </div>

          {this.state.error && (
            <div className="w-full my-5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-left text-xs font-mono text-rose-300 overflow-x-auto max-h-32">
              <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">Details:</span>
              {this.state.error.toString()}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 mt-4 w-full sm:w-auto">
            <button
              onClick={this.handleReset}
              className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg w-full sm:w-auto"
            >
              <RefreshCw className="w-4 h-4" />
              <span>
                {isOm
                  ? 'Irra Deebi\'ii Fe\'i (Retry View)'
                  : isAm
                  ? 'እንደገና ጫን (Retry)'
                  : 'Retry View'}
              </span>
            </button>

            <button
              onClick={this.handleGoHome}
              className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer w-full sm:w-auto"
            >
              <Home className="w-4 h-4 text-amber-400" />
              <span>
                {isOm
                  ? 'Gara Fuula Duraatti (Home)'
                  : isAm
                  ? 'ወደ ዋናው ገጽ (Home)'
                  : 'Back to Home'}
              </span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
