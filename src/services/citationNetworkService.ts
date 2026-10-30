import { CassationPrecedent, CASSATION_PRECEDENTS_DATA } from '../data/cassationPrecedents';

export type CitationRelationType =
  | 'selected'
  | 'cites' // Selected ruling cites this case
  | 'cited_by' // This case cites selected ruling
  | 'affirms' // Explicitly affirms precedent
  | 'distinguishes' // Distinguishes factual / statutory scope
  | 'shared_statute' // Shares interpreted statutory articles
  | 'category_peer' // Belongs to same legal doctrine lineage
  | 'statute'; // Statutory provision node

export interface CitationNode {
  id: string;
  type: CitationRelationType;
  fileNumber?: string;
  title: string;
  subtitle: string;
  court?: 'federal' | 'oromia';
  volume?: number;
  yearEC?: number;
  category?: string;
  precedent?: CassationPrecedent;
  statuteName?: string;
  radius: number;
  color: string;
  strokeColor: string;
  textColor: string;
  emoji: string;
  // D3 simulation coordinates
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface CitationLink {
  source: string | CitationNode;
  target: string | CitationNode;
  relation: CitationRelationType;
  label: string;
  color: string;
  dashed?: boolean;
  strength?: number;
}

export interface CitationGraphData {
  nodes: CitationNode[];
  links: CitationLink[];
  selectedRuling: CassationPrecedent;
  stats: {
    citedCount: number;
    citingCount: number;
    sharedStatutesCount: number;
    totalConnectedCases: number;
  };
}

export interface CitationGraphOptions {
  includeSharedStatutes?: boolean;
  includeStatuteNodes?: boolean;
  includeCategoryPeers?: boolean;
  maxPeers?: number;
}

/**
 * Curated citation relationships between Ethiopian and Oromia Cassation rulings.
 * Maps file numbers to the file numbers they cite or are cited by.
 */
export const KNOWN_CITATION_LINKS: Record<
  string,
  {
    cites?: { fileNumber: string; relation: 'cites' | 'affirms' | 'distinguishes'; note?: string }[];
  }
> = {
  // Volume 1
  '16568': {
    // Estate liquidation before partition
    cites: [],
  },
  '18274': {
    // Contract loan over 500 Birr oral witness inadmissibility
    cites: [],
  },
  // Volume 2
  '20295': {
    // Unlawful dismissal reinstatement vs severance
    cites: [],
  },
  // Volume 3
  '21919': {
    // Court jurisdiction void ab initio
    cites: [],
  },
  // Volume 4
  '24851': {
    // Unauthorized building on another's land
    cites: [{ fileNumber: '16568', relation: 'cites', note: 'Property title foundation' }],
  },
  // Volume 5
  '32049': {
    // Equal rights of children born out of wedlock
    cites: [],
  },
  // Volume 6
  '36744': {
    // Probation termination without notice
    cites: [{ fileNumber: '20295', relation: 'distinguishes', note: 'Distinguishes probation vs regular contract' }],
  },
  // Volume 7
  '39688': {
    // Commercial lease survives property sale
    cites: [{ fileNumber: '24851', relation: 'cites', note: 'Real property leasehold succession' }],
  },
  // Volume 8
  '42398': {
    // Contractor force majeure and liquidated damages
    cites: [{ fileNumber: '18274', relation: 'cites', note: 'Contract proof requirements' }],
  },
  // Volume 9
  '44520': {
    // Setting aside default judgment / commercial bank
    cites: [{ fileNumber: '21919', relation: 'cites', note: 'Judicial procedural fairness' }],
  },
  // Volume 10
  '47580': {
    // Matrimonial property division
    cites: [{ fileNumber: '32049', relation: 'cites', note: 'Family protection principles' }],
  },
  // Volume 11
  '51230': {
    // Reivindicatio / Action for recovery of land
    cites: [
      { fileNumber: '16568', relation: 'cites', note: 'Estate possession' },
      { fileNumber: '24851', relation: 'affirms', note: 'Affirms unauthorized improver removal' },
    ],
  },
  // Volume 12
  '58914': {
    // Overtime and benefits
    cites: [{ fileNumber: '20295', relation: 'affirms', note: 'Labor welfare protection' }],
  },
  // Volume 13
  '63890': {
    // Statute of limitations in contracts
    cites: [{ fileNumber: '18274', relation: 'cites', note: 'Obligations under Civil Code' }],
  },
  // Volume 14
  '71200': {
    // Urban Land Lease Proclamation 721/2011
    cites: [
      { fileNumber: '39688', relation: 'cites', note: 'Commercial lease duration' },
      { fileNumber: '51230', relation: 'cites', note: 'Land recovery' },
    ],
  },
  // Volume 15
  '78210': {
    // Personal property vs joint matrimonial property
    cites: [{ fileNumber: '47580', relation: 'affirms', note: 'Presumption of common property' }],
  },
  // Volume 16
  '84920': {
    // Summary dismissal without warning
    cites: [
      { fileNumber: '20295', relation: 'affirms', note: 'Affirms reinstatement remedy' },
      { fileNumber: '36744', relation: 'distinguishes', note: 'Distinguishes probation from confirmed post' },
    ],
  },
  // Volume 17
  '95112': {
    // Contract formation & consent
    cites: [
      { fileNumber: '18274', relation: 'cites', note: 'Formalities of contract' },
      { fileNumber: '42398', relation: 'cites', note: 'Contractual liability' },
    ],
  },
  // Volume 18
  '101230': {
    // Joint and several liability of bank loan guarantors
    cites: [{ fileNumber: '18274', relation: 'cites', note: 'Loan proof' }],
  },
  // Volume 19
  '120455': {
    // Tenant vs Landlord rent increase & eviction limits
    cites: [
      { fileNumber: '39688', relation: 'affirms', note: 'Lease security and tenant rights' },
      { fileNumber: '71200', relation: 'cites', note: 'Urban lease provisions' },
    ],
  },
  // Volume 20
  '125600': {
    // Child custody and best interests of the child
    cites: [
      { fileNumber: '32049', relation: 'affirms', note: 'Constitutional priority of the child' },
      { fileNumber: '47580', relation: 'cites', note: 'Post-divorce arrangements' },
    ],
  },
  // Volume 21
  '134091': {
    // Property acquired before marriage with major improvements
    cites: [
      { fileNumber: '47580', relation: 'distinguishes', note: 'Distinguishes purely separate vs improved property' },
      { fileNumber: '78210', relation: 'cites', note: 'Assessment of matrimonial shares' },
    ],
  },
  // Volume 22
  '142100': {
    // Overtime work calculation
    cites: [
      { fileNumber: '20295', relation: 'cites', note: 'Labor Proclamation principles' },
      { fileNumber: '58914', relation: 'affirms', note: 'Affirms overtime payment formulas' },
    ],
  },
  // Volume 22 (Property)
  '148900': {
    // Rural land holding vs subleasing
    cites: [
      { fileNumber: '16568', relation: 'cites', note: 'Estate land transmission' },
      { fileNumber: '51230', relation: 'cites', note: 'Action for recovery' },
    ],
  },
  // Volume 23
  '154211': {
    // Unlawful absence and warning requirement
    cites: [
      { fileNumber: '20295', relation: 'cites', note: 'Unlawful termination remedies' },
      { fileNumber: '84920', relation: 'affirms', note: 'Requirement of prior written warning' },
    ],
  },
  // Volume 24
  '178422': {
    // Civil procedure appellate review and fundamental error of law
    cites: [
      { fileNumber: '21919', relation: 'affirms', note: 'Jurisdiction and legality' },
      { fileNumber: '44520', relation: 'cites', note: 'Right to be heard' },
    ],
  },
  '182410': {
    // Non-judicial foreclosure and bank collateral sale
    cites: [
      { fileNumber: '101230', relation: 'affirms', note: 'Enforcement against collateral guarantors' },
      { fileNumber: '18274', relation: 'cites', note: 'Commercial loan proof' },
    ],
  },
  '192300': {
    // Electronic signature and e-commerce contracts
    cites: [
      { fileNumber: '18274', relation: 'distinguishes', note: 'Modern electronic writing vs classical parchment' },
      { fileNumber: '95112', relation: 'affirms', note: 'Consent via electronic communication' },
    ],
  },
  // Volume 25
  '210450': {
    // Criminal corruption evidence and burden of proof
    cites: [{ fileNumber: '21919', relation: 'cites', note: 'Statutory competence of tribunal' }],
  },

  // ================= OROMIA CASSATION DECISIONS =================
  '10293': {
    // Oromia Rural Land transfer invalidity
    cites: [
      { fileNumber: '16568', relation: 'cites', note: 'Land inheritance limits' },
      { fileNumber: '51230', relation: 'affirms', note: 'Recovery of unalienable rural land' },
    ],
  },
  '23491': {
    // Oromia Customary Marriage recognition
    cites: [
      { fileNumber: '32049', relation: 'cites', note: 'Protection of family and children' },
      { fileNumber: '47580', relation: 'affirms', note: 'Matrimonial property liquidation' },
      { fileNumber: '78210', relation: 'cites', note: 'Presumption of joint property' },
    ],
  },
  '34190': {
    // Oromia Cooperative bylaws vs Labor Proclamation
    cites: [
      { fileNumber: '20295', relation: 'affirms', note: 'Mandatory nature of labor protections' },
      { fileNumber: '84920', relation: 'cites', note: 'Due process before dismissal' },
    ],
  },
  '45812': {
    // Commercial sales period of limitation
    cites: [
      { fileNumber: '18274', relation: 'cites', note: 'Commercial contracts proof' },
      { fileNumber: '63890', relation: 'affirms', note: 'Enforcement of statutory limitation periods' },
    ],
  },
  '56711': {
    // Oromia Arbitral Award judicial review
    cites: [
      { fileNumber: '21919', relation: 'cites', note: 'Tribunal jurisdiction limits' },
      { fileNumber: '178422', relation: 'affirms', note: 'Grounds of fundamental error of law' },
    ],
  },
  '79124': {
    // Expropriation of urban land and prompt compensation
    cites: [
      { fileNumber: '51230', relation: 'cites', note: 'Action for recovery of possession' },
      { fileNumber: '71200', relation: 'affirms', note: 'Substantive rights under urban land laws' },
    ],
  },
};

/**
 * Extract clean statute label (e.g. "Civil Code Art. 2472", "Labor Proc. 1156/2019")
 */
export function extractKeyStatutoryArticles(provisions: string[]): string[] {
  const result: string[] = [];
  provisions.forEach((prov) => {
    // Match common Ethiopian legal codes and proclamations
    const parts = prov.split(/,|;/);
    parts.forEach((p) => {
      const trimmed = p.trim();
      if (trimmed.length > 3) {
        result.push(trimmed);
      }
    });
  });
  return Array.from(new Set(result)).slice(0, 3);
}

/**
 * Build graph data structure for D3 simulation
 */
export function buildCitationGraph(
  selectedRuling: CassationPrecedent,
  allPrecedents: CassationPrecedent[] = CASSATION_PRECEDENTS_DATA,
  options: CitationGraphOptions = {}
): CitationGraphData {
  const {
    includeSharedStatutes = true,
    includeStatuteNodes = true,
    includeCategoryPeers = true,
    maxPeers = 3,
  } = options;

  const nodesMap = new Map<string, CitationNode>();
  const links: CitationLink[] = [];
  const precedentByFile = new Map<string, CassationPrecedent>();

  allPrecedents.forEach((p) => {
    precedentByFile.set(p.fileNumber, p);
  });

  const selectedFile = selectedRuling.fileNumber;
  const isSelectedOromia =
    selectedRuling.courtJurisdiction === 'oromia' || selectedRuling.id.startsWith('oromia_');

  // 1. Central Selected Node
  const centralNodeId = `case-${selectedFile}`;
  nodesMap.set(centralNodeId, {
    id: centralNodeId,
    type: 'selected',
    fileNumber: selectedFile,
    title: `Lakk. ${selectedFile}`,
    subtitle: `Jildii ${selectedRuling.volume} • ${isSelectedOromia ? 'Oromiyaa' : 'Federaalaa'}`,
    court: isSelectedOromia ? 'oromia' : 'federal',
    volume: selectedRuling.volume,
    yearEC: selectedRuling.yearEC,
    category: selectedRuling.category,
    precedent: selectedRuling,
    radius: 34,
    color: '#f59e0b', // Solid Amber
    strokeColor: '#fbbf24',
    textColor: '#0f172a',
    emoji: isSelectedOromia ? '🔴' : '🟢',
  });

  let citedCount = 0;
  let citingCount = 0;
  let sharedStatutesCount = 0;

  // 2. Cases Cited BY Selected Ruling (Outgoing Citations)
  const directCites = KNOWN_CITATION_LINKS[selectedFile]?.cites || [];
  directCites.forEach((c) => {
    const targetCase = precedentByFile.get(c.fileNumber);
    const targetId = `case-${c.fileNumber}`;
    citedCount++;

    if (!nodesMap.has(targetId)) {
      const isOromia =
        targetCase?.courtJurisdiction === 'oromia' || targetCase?.id.startsWith('oromia_');
      nodesMap.set(targetId, {
        id: targetId,
        type: 'cites',
        fileNumber: c.fileNumber,
        title: `Lakk. ${c.fileNumber}`,
        subtitle: targetCase
          ? `Jildii ${targetCase.volume} • ${isOromia ? 'Oromiyaa' : 'Federaalaa'}`
          : 'Murtii Waraabame',
        court: isOromia ? 'oromia' : 'federal',
        volume: targetCase?.volume,
        yearEC: targetCase?.yearEC,
        category: targetCase?.category,
        precedent: targetCase,
        radius: 24,
        color: '#0284c7', // Solid Sky Blue
        strokeColor: '#38bdf8',
        textColor: '#ffffff',
        emoji: '📚',
      });
    }

    links.push({
      source: centralNodeId,
      target: targetId,
      relation: c.relation,
      label:
        c.relation === 'affirms'
          ? 'Mirkanneesse (Affirms)'
          : c.relation === 'distinguishes'
          ? 'Adda Baase (Distinguishes)'
          : 'Waraabe (Cites)',
      color: c.relation === 'affirms' ? '#10b981' : '#38bdf8',
      strength: 1.0,
    });
  });

  // 3. Cases that CITE the Selected Ruling (Incoming Citations)
  Object.entries(KNOWN_CITATION_LINKS).forEach(([srcFile, data]) => {
    if (srcFile === selectedFile) return;
    const matched = data.cites?.find((c) => c.fileNumber === selectedFile);
    if (matched) {
      citingCount++;
      const sourceCase = precedentByFile.get(srcFile);
      const srcId = `case-${srcFile}`;

      if (!nodesMap.has(srcId)) {
        const isOromia =
          sourceCase?.courtJurisdiction === 'oromia' || sourceCase?.id.startsWith('oromia_');
        nodesMap.set(srcId, {
          id: srcId,
          type: 'cited_by',
          fileNumber: srcFile,
          title: `Lakk. ${srcFile}`,
          subtitle: sourceCase
            ? `Jildii ${sourceCase.volume} • ${isOromia ? 'Oromiyaa' : 'Federaalaa'}`
            : 'Murtii Dabalataa',
          court: isOromia ? 'oromia' : 'federal',
          volume: sourceCase?.volume,
          yearEC: sourceCase?.yearEC,
          category: sourceCase?.category,
          precedent: sourceCase,
          radius: 25,
          color: '#10b981', // Solid Emerald
          strokeColor: '#34d399',
          textColor: '#ffffff',
          emoji: '📜',
        });
      }

      links.push({
        source: srcId,
        target: centralNodeId,
        relation: 'cited_by',
        label:
          matched.relation === 'affirms'
            ? 'Kana Mirkaneesse (Affirmed By)'
            : 'Murtii Kana Waraabe (Cited By)',
        color: '#10b981',
        strength: 1.0,
      });
    }
  });

  // 4. Shared Statutory Provisions & Law Nodes
  if (includeSharedStatutes) {
    const selectedProvisions = extractKeyStatutoryArticles(selectedRuling.statutoryProvisions);

    selectedProvisions.forEach((statuteText) => {
      // Find other cases sharing this exact statute / article
      const statuteClean = statuteText.toLowerCase();
      const sharedCases = allPrecedents.filter(
        (p) =>
          p.fileNumber !== selectedFile &&
          p.statutoryProvisions.some((sp) => sp.toLowerCase().includes(statuteClean))
      );

      if (sharedCases.length > 0) {
        sharedStatutesCount += sharedCases.length;

        let connectorNodeId = centralNodeId;

        // If statute nodes are enabled, create an intermediate statute badge node
        if (includeStatuteNodes) {
          const statuteNodeId = `statute-${statuteClean.replace(/[^a-z0-9]/g, '_')}`;
          if (!nodesMap.has(statuteNodeId)) {
            nodesMap.set(statuteNodeId, {
              id: statuteNodeId,
              type: 'statute',
              title: statuteText.length > 25 ? statuteText.substring(0, 22) + '...' : statuteText,
              subtitle: 'Tumoota Seeraa (Statute)',
              statuteName: statuteText,
              radius: 18,
              color: '#8b5cf6', // Solid Violet
              strokeColor: '#a78bfa',
              textColor: '#ffffff',
              emoji: '⚖️',
            });

            links.push({
              source: centralNodeId,
              target: statuteNodeId,
              relation: 'shared_statute',
              label: 'Tumoota Seeraa',
              color: '#a78bfa',
              dashed: true,
              strength: 0.6,
            });
          }
          connectorNodeId = statuteNodeId;
        }

        // Connect up to 2 closest shared cases per statutory provision
        sharedCases.slice(0, 2).forEach((sc) => {
          const scId = `case-${sc.fileNumber}`;
          if (!nodesMap.has(scId)) {
            const isOromia = sc.courtJurisdiction === 'oromia' || sc.id.startsWith('oromia_');
            nodesMap.set(scId, {
              id: scId,
              type: 'shared_statute',
              fileNumber: sc.fileNumber,
              title: `Lakk. ${sc.fileNumber}`,
              subtitle: `Jildii ${sc.volume} • Seera Waliinii`,
              court: isOromia ? 'oromia' : 'federal',
              volume: sc.volume,
              yearEC: sc.yearEC,
              category: sc.category,
              precedent: sc,
              radius: 20,
              color: '#475569', // Solid Slate
              strokeColor: '#94a3b8',
              textColor: '#f8fafc',
              emoji: '🔗',
            });
          }

          links.push({
            source: connectorNodeId,
            target: scId,
            relation: 'shared_statute',
            label: 'Seera Wal-fakkaataa',
            color: '#94a3b8',
            dashed: true,
            strength: 0.4,
          });
        });
      }
    });
  }

  // 5. Category Peers (if network is sparse)
  if (includeCategoryPeers && nodesMap.size < 4) {
    const peers = allPrecedents
      .filter((p) => p.fileNumber !== selectedFile && p.category === selectedRuling.category)
      .slice(0, maxPeers);

    peers.forEach((peer) => {
      const peerId = `case-${peer.fileNumber}`;
      if (!nodesMap.has(peerId)) {
        const isOromia = peer.courtJurisdiction === 'oromia' || peer.id.startsWith('oromia_');
        nodesMap.set(peerId, {
          id: peerId,
          type: 'category_peer',
          fileNumber: peer.fileNumber,
          title: `Lakk. ${peer.fileNumber}`,
          subtitle: `Jildii ${peer.volume} • Gosa Wal-fakkaataa`,
          court: isOromia ? 'oromia' : 'federal',
          volume: peer.volume,
          yearEC: peer.yearEC,
          category: peer.category,
          precedent: peer,
          radius: 19,
          color: '#334155',
          strokeColor: '#64748b',
          textColor: '#f1f5f9',
          emoji: '🏷️',
        });

        links.push({
          source: centralNodeId,
          target: peerId,
          relation: 'category_peer',
          label: 'Dhimma Seeraa Tokko',
          color: '#64748b',
          dashed: true,
          strength: 0.3,
        });
      }
    });
  }

  const nodes = Array.from(nodesMap.values());
  const totalConnectedCases = nodes.filter((n) => n.type !== 'statute' && n.type !== 'selected').length;

  return {
    nodes,
    links,
    selectedRuling,
    stats: {
      citedCount,
      citingCount,
      sharedStatutesCount,
      totalConnectedCases,
    },
  };
}
