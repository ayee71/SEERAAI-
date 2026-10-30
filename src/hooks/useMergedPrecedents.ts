import { useState, useEffect, useMemo } from 'react';
import { CASSATION_PRECEDENTS_DATA, CassationPrecedent } from '../data/cassationPrecedents';
import { MASTER_FILES } from '../data/telegramMasterArchive';
import { retrieveStoredTelegramLegalDocs } from '../services/telegramLegalService';

export const useMergedPrecedents = () => {
  const [harvestedTelegramDocs, setHarvestedTelegramDocs] = useState<CassationPrecedent[]>([]);
  const [isLoadingTelegram, setIsLoadingTelegram] = useState(false);

  const mapTelegramCategory = (cat: string): CassationPrecedent['category'] => {
    const mapping: Record<string, CassationPrecedent['category']> = {
      'land': 'property',
      'property_land': 'property',
      'civil': 'civil',
      'civil_contract': 'civil',
      'criminal': 'criminal',
      'procedure': 'procedure',
      'procedure_evidence': 'procedure',
      'family': 'family',
      'labor': 'labor',
      'administrative': 'administrative',
      'constitutional_admin': 'administrative',
      'commercial': 'commercial',
      'commercial_tax': 'commercial',
      'contract': 'contract'
    };
    return mapping[cat] || 'other';
  };

  useEffect(() => {
    const fetchTelegramDocs = async () => {
      setIsLoadingTelegram(true);
      try {
        const docs = await retrieveStoredTelegramLegalDocs();
        const mappedDocs: CassationPrecedent[] = docs
          .filter(d => d.type === 'cassation_decision')
          .map(d => ({
            id: d.id,
            courtJurisdiction: d.jurisdiction,
            courtName: {
              om: d.channelTitle,
              am: d.channelTitle,
              en: d.channelTitle
            },
            volume: 0,
            fileNumber: d.referenceNumber.replace(/\D/g, '') || d.referenceNumber,
            yearEC: d.yearEC,
            yearGC: d.yearGC,
            category: mapTelegramCategory(d.category),
            parties: {
              om: d.title.om,
              am: d.title.am,
              en: d.title.en
            },
            legalIssue: {
              om: d.summary.om,
              am: d.summary.am,
              en: d.summary.en
            },
            bindingPrinciple: {
              om: d.keyPrinciples.om,
              am: d.keyPrinciples.am,
              en: d.keyPrinciples.en
            },
            statutoryProvisions: d.keyArticles
          }));
        setHarvestedTelegramDocs(mappedDocs);
      } catch (e) {
        console.error('Failed to load harvested telegram docs', e);
      } finally {
        setIsLoadingTelegram(false);
      }
    };

    fetchTelegramDocs();
  }, []);

  const mappedMasterFiles = useMemo<CassationPrecedent[]>(() => {
    return MASTER_FILES.map(f => ({
      id: f.id,
      courtJurisdiction: f.title.om.toLowerCase().includes('federaala') ? 'federal' : 'oromia',
      courtName: {
        om: 'Telegram Master Archive',
        am: 'የቴሌግራም ዋና መዝገብ',
        en: 'Telegram Master Archive'
      },
      volume: parseInt(f.volume.replace(/\D/g, '')) || 0,
      fileNumber: f.fileNumber,
      yearEC: 2016,
      yearGC: 2024,
      category: mapTelegramCategory(f.category),
      parties: {
        om: f.title.om,
        am: f.title.om,
        en: f.title.en
      },
      legalIssue: {
        om: f.summary.om,
        am: f.summary.om,
        en: f.summary.en
      },
      bindingPrinciple: {
        om: f.principle.om,
        am: f.principle.om,
        en: f.principle.en
      },
      statutoryProvisions: f.keyArticles ? [f.keyArticles.om] : []
    }));
  }, []);

  const allPrecedents = useMemo(() => {
    return [...CASSATION_PRECEDENTS_DATA, ...mappedMasterFiles, ...harvestedTelegramDocs];
  }, [mappedMasterFiles, harvestedTelegramDocs]);

  return { allPrecedents, isLoadingTelegram };
};
