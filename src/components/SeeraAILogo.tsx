import { Language } from '../i18n/translations';
import ethiopianJusticeLogo from '../assets/images/seeraai_authoritative_logo_1792935506374.jpg';

interface SeeraAILogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  currentLang?: Language;
  onClick?: () => void;
}

export const SeeraAILogo: React.FC<SeeraAILogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  currentLang = 'om',
  onClick,
}) => {
  const dimensions = {
    sm: { box: 'w-8 h-8', text: 'text-base', sub: 'text-[9px]', icon: 'w-4 h-4' },
    md: { box: 'w-10 h-10', text: 'text-lg sm:text-xl', sub: 'text-[10px]', icon: 'w-5 h-5' },
    lg: { box: 'w-14 h-14', text: 'text-2xl sm:text-3xl', sub: 'text-xs', icon: 'w-7 h-7' },
    xl: { box: 'w-20 h-20', text: 'text-4xl', sub: 'text-sm', icon: 'w-10 h-10' },
  }[size];

  return (
    <div 
      className={`flex items-center gap-3 ${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {/* New Authoritative Brand Logo Container */}
      <div className={`${dimensions.box} rounded-xl bg-slate-900 flex items-center justify-center shadow-xl shadow-amber-500/10 border border-amber-500/30 shrink-0 relative overflow-hidden group`}>
        {/* Subtle Brand Ambient Glow */}
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <img
          src={ethiopianJusticeLogo}
          alt="SeeraAI Authoritative Brand Logo"
          className="w-full h-full object-contain p-0.5 rounded-lg transition-all duration-500 group-hover:scale-110"
        />
      </div>

      {/* Modern Professional Typography */}
      {showText && (
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-2">
            <h2 className={`font-serif-legal font-bold tracking-tight text-amber-500 ${dimensions.text}`}>
              SEERAAI
            </h2>
            <div className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[9px] font-mono font-black uppercase tracking-widest shadow-sm">
              PRO
            </div>
          </div>
          <p className={`text-slate-500 font-bold uppercase tracking-widest ${dimensions.sub} opacity-80`}>
            {currentLang === 'om' ? 'Qorannoo Seeraa' : currentLang === 'am' ? 'የሕግ ትንተና' : 'Legal Intelligence'}
          </p>
        </div>
      )}
    </div>
  );
};
