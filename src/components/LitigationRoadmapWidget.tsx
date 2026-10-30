import React, { useState, useEffect } from 'react';
import { Compass, CheckCircle2, Circle, Clock, ArrowRight } from 'lucide-react';
import { Language } from '../i18n/translations';

interface LitigationRoadmapWidgetProps {
  documentTitle: string;
  documentContent: string;
  currentLang: Language;
  taskType?: string;
}

export type LitigationStage = 'filing' | 'preliminary' | 'evidence' | 'judgment' | 'execution';

interface StageInfo {
  id: LitigationStage;
  title: { om: string; am: string; en: string };
  description: { om: string; am: string; en: string };
  sdfhhReference: string;
}

const STAGES: StageInfo[] = [
  {
    id: 'filing',
    title: { om: '1. Dhiyeessa Himannaa', am: '1. የክስ ማቅረቢያ', en: '1. Filing & Plaint' },
    description: {
      om: 'Himannaa dhiyeessuu, kaffaltii abbaa seerummaa fi waamicha (SDFHH Kwt. 80-110).',
      am: 'ክስ ማቅረብ፣ የፍርድ ቤት ከፍያ እና መጥሪያ ማድረስ (ፍት/ሥ/ሥ/ሕግ አንቀጽ 80-110)።',
      en: 'Filing of Statement of Claim, court fee payment and process service (Civ. Pro. Arts. 80-110).'
    },
    sdfhhReference: 'SDFHH Kwt. 80 - 110'
  },
  {
    id: 'preliminary',
    title: { om: '2. Mormii & Qabxii Dubbii', am: '2. የቅድመ ወክ ክርክርና የጉዳይ ነጥብ', en: '2. Preliminary & Issues' },
    description: {
      om: 'Deebii ittisaa, mormii duraa fi qabxii dubbii hundeessuu (SDFHH Kwt. 222-247).',
      am: 'የመከላከያ መልስ፣ የቅድመ ዝግጅት ክርክር እና የፍሬ ነገር ነጥቦች (ፍት/ሥ/ሥ/ሕግ አንቀጽ 222-247)።',
      en: 'Statement of defense, preliminary objections and issue framing (Civ. Pro. Arts. 222-247).'
    },
    sdfhhReference: 'SDFHH Kwt. 222 - 247'
  },
  {
    id: 'evidence',
    title: { om: '3. Qorannoo Ragaa', am: '3. የማስረጃ ምረቃና ምርመራ', en: '3. Evidence & Hearing' },
    description: {
      om: 'Sanadoota dhiyeessuu, ragaalee dhagahuu fi qorannoo naqaashotaa (SDFHH Kwt. 137, 258).',
      am: 'ሰነዶችን ማቅረብ፣ ምስክሮችን መስማት እና ምርመራ ማድረግ (ፍት/ሥ/ሥ/ሕግ አንቀጽ 137፣ 258)።',
      en: 'Documentary evidence submission, witness testimony and hearing (Civ. Pro. Arts. 137, 258).'
    },
    sdfhhReference: 'SDFHH Kwt. 137 & 258'
  },
  {
    id: 'judgment',
    title: { om: '4. Murtii Kennuu', am: '4. የውሳኔ አሰጣጥ', en: '4. Judgment & Verdict' },
    description: {
      om: 'Murtii dhumaa kennuu, sababaa fi qajeeltoo seeraa madaaluu (SDFHH Kwt. 180-183).',
      am: 'የፍርድ ውሳኔ መስጠት፣ ምክንያትንና የሕግ መርሆዎችን መተንተን (ፍት/ሥ/ሥ/ሕግ አንቀጽ 180-183)።',
      en: 'Rendering final judgment, ratio decidendi and statutory reasoning (Civ. Pro. Arts. 180-183).'
    },
    sdfhhReference: 'SDFHH Kwt. 180 - 183'
  },
  {
    id: 'execution',
    title: { om: '5. Raawwii & Ol\'iyyannoo', am: '5. የውሳኔ አፈፃፀም እና ሰበር', en: '5. Execution & Appeal' },
    description: {
      om: 'Murtii raawwachiisuu, ol\'iyyannoo ykn ijibbaata dhiyeessuu (SDFHH Kwt. 320-384).',
      am: 'ፍርድን ማስፈጸም፣ ይግባኝ ወይም ሰበር ማመልከት (ፍት/ሥ/ሥ/ሕግ አንቀጽ 320-384)።',
      en: 'Execution of decree, appeal or cassation review (Civ. Pro. Arts. 320-384).'
    },
    sdfhhReference: 'SDFHH Kwt. 320 - 384'
  }
];

export const LitigationRoadmapWidget: React.FC<LitigationRoadmapWidgetProps> = ({
  documentTitle,
  documentContent,
  currentLang,
  taskType,
}) => {
  const detectStage = (): LitigationStage => {
    const combined = `${documentTitle} ${documentContent} ${taskType || ''}`.toLowerCase();
    if (combined.includes('himannaa') || combined.includes('plaint') || combined.includes('claim') || combined.includes('waamicha') || combined.includes('ክስ')) {
      return 'filing';
    }
    if (combined.includes('mormii') || combined.includes('objection') || combined.includes('deebii ittisaa') || combined.includes('defence') || combined.includes('qabxii') || combined.includes('issues')) {
      return 'preliminary';
    }
    if (combined.includes('ragaa') || combined.includes('witness') || combined.includes('evidence') || combined.includes('naqaasha') || combined.includes('testimony')) {
      return 'evidence';
    }
    if (combined.includes('murtii') || combined.includes('judgment') || combined.includes('verdict') || combined.includes('ruling') || combined.includes('decision')) {
      return 'judgment';
    }
    if (combined.includes('raawwii') || combined.includes('execution') || combined.includes('ol\'iyyannoo') || combined.includes('appeal') || combined.includes('ijibbaata') || combined.includes('cassation')) {
      return 'execution';
    }
    return 'evidence';
  };

  const [activeStage, setActiveStage] = useState<LitigationStage>(detectStage());
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    setActiveStage(detectStage());
  }, [documentTitle, documentContent, taskType]);

  const activeIndex = STAGES.findIndex((s) => s.id === activeStage);

  return (
    <div className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-4 mb-4 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-100 text-xs sm:text-sm tracking-wide">
              {currentLang === 'om' ? 'Karaan Adeemsa Falmii (Litigation Roadmap)' : currentLang === 'am' ? 'የክርክር ሂደታዊ ካርታ (Litigation Roadmap)' : 'Litigation Roadmap & Stage Mapping'}
            </h4>
            <p className="text-[11px] text-slate-400">
              {currentLang === 'om' ? 'Sanadni kun sadarkaa falmii kamiin akka walqabatu agarsiisa' : currentLang === 'am' ? 'ይህ ሰነድ ከየትኛው የክርክር ደረጃ ጋር እንደሚስማማ ያሳያል' : 'Mapping current document to its exact legal litigation phase'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          {isExpanded ? (currentLang === 'om' ? 'Dhoksi' : 'Hide') : (currentLang === 'om' ? 'Agarsiisi' : 'Expand')}
        </button>
      </div>

      {isExpanded && (
        <div className="pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {STAGES.map((stage, idx) => {
              const isSelected = stage.id === activeStage;
              const isCompleted = idx < activeIndex;

              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setActiveStage(stage.id)}
                  className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500/80 ring-1 ring-amber-500/50 shadow-lg'
                      : isCompleted
                      ? 'bg-slate-900/90 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                      : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1.5">
                    <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-md ${
                      isSelected ? 'bg-amber-500 text-slate-950 font-black' : isCompleted ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {stage.sdfhhReference}
                    </span>
                    <span>
                      {isSelected ? (
                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      ) : isCompleted ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-slate-600" />
                      )}
                    </span>
                  </div>

                  <div>
                    <h5 className={`font-bold text-xs line-clamp-1 ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                      {stage.title[currentLang] || stage.title.om}
                    </h5>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {stage.description[currentLang] || stage.description.om}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {STAGES.find((s) => s.id === activeStage) && (
            <div className="p-3.5 rounded-xl bg-slate-900 border border-amber-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-amber-400 text-base">📌</span>
                <div className="text-xs">
                  <span className="font-bold text-amber-300">
                    {STAGES.find((s) => s.id === activeStage)?.title[currentLang] || ''}:
                  </span>
                  <span className="text-slate-300 ml-1.5">
                    {STAGES.find((s) => s.id === activeStage)?.description[currentLang] || ''}
                  </span>
                </div>
              </div>
              <div className="text-[10px] font-mono px-2 py-1 rounded bg-slate-950 text-amber-400 border border-amber-500/20 shrink-0">
                {STAGES.find((s) => s.id === activeStage)?.sdfhhReference}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
