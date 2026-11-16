SEERAAI — LEGAL RESEARCH ENGINE V2
Qajeelfama gabaabaa itti fayyadamaa

1. FAAYILOTA
- seeraai_legal_research_engine_v2.ts : koodii TypeScript isa ijoo.
- seeraai_legal_research_engine_v2.txt: qabiyyee koodii wal-fakkaataa, copy/paste gochuuf.

2. MAAL HOJJETA?
- Murtiiwwan Dhaddacha Ijibbaataa, seerota, keewwatawwan fi galmeewwan kuusaa barbaada.
- Keewwata seeraa tokko tokkoon madaala; seera guutuu qofa hin tarreessu.
- Himannaa, deebii himannaa, mormii, ijoo qabame fi ragaa walitti qindeessa.
- Ragaa tokko ijoo murtaa'e waliin qaamni galmeesseen walqabsiise yoo jiraate agarsiisa.
- Prompt qorannoo seeraa madaalawaa OpenAI ykn Gemini tti erguuf qopheessa.
- Citation key deebiin AI fayyadame kuusaa keessaa jiraachuu isaa mirkaneessa.
- Madda hin jirre akka dhugaa seeraatti akka hin dhiyaanne akeekkachiisa.

3. SEERAANIS, TEKNOOLOJIINIS DAANGAA QABA
Koodichi qindoomina maddaa fi barbaacha jechootaa irratti hundaa'a. Ofumaan hiika seeraa hin murteessu; ragaa fudhatama qabu ta'uu hin murteessu; murtii Ijibbaataa hundi aangoo dirqisiisaa qaba jedhee hin tilmaamu. Search relevance jechuun aangoo seeraa miti.

4. KUUSAA DURAA WALIIN WAL-SIMSIISUU
Dataset duraanii gara shape haaraatti fiduuf:

import { upgradeLegacyLegalRepository } from "./seeraai_legal_research_engine_v2";
const repository = upgradeLegacyLegalRepository({
  cassations: CASSATION_PRECEDENTS_DATA,
  legislation: LEGISLATION_DATA,
  archive: LEGAL_ARCHIVE_DATA,
});

Adapter kun galmee verification hin qabne "uploaded_unverified" godha. Field duraanii bindingStatusVerified=true ta'uun isaa ragummaan documentii mirkanaa'e ykn murtiin binding ta'e jechuu hin godhu.

5. FAKKEENYA WALITTI HIDHAMIINSAA
Koodii kana backend/server keessatti fayyadami. API key OpenAI/Gemini browser/client keessatti hin kaa'in.

import {
  runLegalResearch,
  upgradeLegacyLegalRepository,
  type LegalTextGenerator,
} from "./seeraai_legal_research_engine_v2";

const repository = upgradeLegacyLegalRepository({
  cassations: CASSATION_PRECEDENTS_DATA,
  legislation: LEGISLATION_DATA,
  archive: LEGAL_ARCHIVE_DATA,
});

// Existing SEERAAI server-side AI function keessan bakka kanaan waamaa.
const generator: LegalTextGenerator = {
  generateText: async ({ systemPrompt, userPrompt, temperature }) => {
    return await existingServerSideAiService({
      systemPrompt,
      userPrompt,
      temperature,
    });
  },
};

const result = await runLegalResearch(
  {
    question: "Himataan mirga qabiyyee lafaa qabaachuu isaa ragaan ni mirkaneessaa?",
    context: "As keessatti haala dhimmaa fi seenaa adeemsa falmii galchi.",
    caseDate: "2018-10-04",
    jurisdiction: "Oromia, Ethiopia",
    language: "om",
    partyPositions: [
      { side: "claimant", statement: "Himataan lafa kana qabachuu isaa ibse." },
      { side: "defendant", statement: "Himatamaan mirga himataa morme." },
    ],
    preliminaryIssues: [
      { id: "issue-1", question: "Eenyutu lafa kana qabatee ture?" },
    ],
    objections: ["Mormii sadarkaa duraa asitti galchi."],
    evidence: [
      {
        id: "evidence-1",
        description: "Ragaa namaa ykn galmee tokko asitti ibsi.",
        side: "claimant",
        relatedIssueIds: ["issue-1"],
        admitted: "not_determined",
      },
    ],
  },
  repository,
  generator,
);

console.log(result.answer);
console.log(result.citations);
console.log(result.warnings);

6. FIRESTORE
- Firestore irraa murtii, seera, archive backend irratti dubbisi.
- Documentootni dhugaa ta'anis shape TypeScript kanaan wal-simsiisi.
- Documentii sirrii, sourceReference, verifiedAt, verifiedBy guuti.
- Verification akka "official_verified" godhi kan madda jalqabaa nama aangoo qabuun sakatta'ame qofa.
- Collections public hin godhin; keessumaa galmee mana murtii iccitii qabu.

7. QORANNOO KOO
- TypeScript strict compile: PASS.
- Built-in smoke test: PASS (3 checks).
- Adapter legacy-data: PASS (test galmee duraanii).

8. OSA PRODUCTION DURAA
- Dataset dhugaa Murtii Ijibbaataa fi seerota irratti search quality test godhi.
- Seerota fooyya'an/haqamanii fi yeroo hojiirra oolan mirkaneessi.
- Maddoota keessatti duplicate ID, article duplicate, fi missing holding sirreessi.
- OpenAI/Gemini adapter keessan server-side irratti walitti hidhi.
- Abbootiin seeraa citations fi bu'aa qorannoo madda jalqabaa irraa mirkaneessuu qabu.

Hubachiisa: Kun module qorannoo fi gargaarsa murtii ti; murtii mana murtii ofumaan hin kennu.
