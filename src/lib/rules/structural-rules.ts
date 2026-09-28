// Structural rules: pattern families recognised by the shape of a request
// rather than by an exact phrase.
//
// The keyword layer matches literal substrings, which is precise but brittle:
// "recois l'argent sur mon compte" and "recevoir des transferts sur mon
// compte" are the same scam and only one of them is in a trigger list. These
// detectors look for the components of a scheme instead, so paraphrases,
// rewordings and mixed FR/EN phrasings all land.

import type { ScamPatternMatch } from "./keyword-rules";

interface StructuralRule {
  key: string;
  category: ScamPatternMatch["category"];
  riskLevel: ScamPatternMatch["riskLevel"];
  // All clauses must hold for the rule to fire.
  all: readonly RegExp[];
  evidenceBulletEn: string;
  evidenceBulletFr: string;
}

// Receiving other people's money through your own account, whether or not the
// cut is spelled the same way every time. These two are alternatives, not
// requirements, so they are one clause.
const MULE_RECEIVE =
  /\bre(?:ç|c)(?:evoir|o)[a-z]{0,5}\b[^.!?]{0,80}\b(sur|to|through|on|via)\b[^.!?]{0,20}\b(mon|ma|notre|your|the)\b[^.!?]{0,20}\b(compte|account|wallet|portefeuille)\b|\breceive[sd]?\b[^.!?]{0,80}\b(sur|to|through|on|via)\b[^.!?]{0,20}\b(mon|ma|notre|your|the)\b[^.!?]{0,20}\b(compte|account|wallet|portefeuille)\b/i;

// "Keep a percentage" and "pass the rest on" are both halves of the offer, so
// unlike the others these are genuinely conjunctive.
const MULE_COMMISSION: readonly RegExp[] = [
  /\b(gard(?:e|ez|er)|conserve[rz]?|keep|retain(?:s|ed)?)\b[^.!?]{0,40}\b\d{1,2}\s*(?:%|pour\s*cent|percent)\b/i,
  /\b(envoi(?:e|ez|er)?|transf(?:e|ère|érez|er)|transmett(?:ez|re|s)?|pass(?:ez|er)?|forward|send|remit)\b[^.!?]{0,60}\b(reste|rest|suite|onward|passer|autres|others|argent|funds|money|fonds|montant|amount)\b/i,
];

// A charge demanded before the thing is released. True of scholarships, jobs,
// prizes and customs releases alike, so the category stays generic and the
// topical keyword groups do the naming.
const FEE_BEFORE_RELEASE =
  /\b(frais|fee|charges?|processing|handling|inscription|registration)\b[^.!?]{0,60}\b(lib(?:é|e)r(?:er|ez)?|release|receive|recevoir|obtenir|r[ée]cup(?:é|e)rer|encaisse[rz]?|d[ée]livr[ée]?)\b|\b(pay(?:ez|er|ment)?|vers(?:ez|er)|send|envoy(?:ez|er)?|transfert|transfer)\b[^.!?]{0,50}\b(avant de recevoir|before (?:you )?receive|pour lib(?:é|e)rer|to release|pour obtenir|to claim|pour d[ée]livrer)\b/i;

// Speaking for an institution the reader is meant to fear or obey. The second
// clause is the common case on its own.
const IMPERSONATED_AUTHORITY: readonly RegExp[] = [
  /\b(au nom de|agissant au nom de|de la part de|acting on behalf of|on behalf of)\s+(l['’]?antic|antic|la banque|the bank|la police|the police|le ministre|the minister|le commissioner|le gouverneur)\b/i,
  /\b(je suis|this is|i am|i'm)\s+(le|la|the)\s+(ministre|minister|commissaire|inspecteur|gouverneur|governor|directeur g[ée]n[ée]ral)\b/i,
];

// Asking for the one thing that hands over the account: a code, a pin, an OTP.
const CREDENTIAL_REQUEST =
  /\b(envoy(?:ez|er)?|send|donne[rz]?|share|partag(?:ez|er)|transmettez|give)\b[^.!?]{0,40}\b(otp|code de validation|verification code|code de securite|pin|secret code|code\s*otp)\b/i;

// Coercive threats. Kept separate from the scam families because the right
// response is different: the reader must not be told to negotiate or to expect
// the demand to disappear once paid.
const EXPOSURE_THREAT: readonly RegExp[] = [
  // French verbs need their inflections or "je publie" misses "publier".
  /\b(publi(?:er|e|es|ant)|diffus(?:er|e|ant)|divulg(?:uer|ue|uant)|r[eé]v[ée]l(?:er|ant)|expos(?:er|e|ant)|partag(?:er|e)|montr(?:er|e)|envoi(?:e|es|ez|er)?)\b[^.!?]{0,60}\b(tout le monde|to everyone|everyone|à tous|aux gens|au monde|public|tes proches|your family|ta famille|vos proches)\b/i,
  /\b(je (?:vais )?(?:te |vous )?(?:publi(?:er|e|es)|diffus(?:er|e)|divulg(?:uer|ue)|r[eé]v[ée]l(?:er)|expos(?:er|e)|d[ée]nonc(?:er|e)|porter plainte|porter plainte|traqu(?:er|e)|embrass(?:er|e))|i will (?:publish|release|expose|share|leak|report you)|we will (?:publish|release|expose))\b/i,
  /\b(videos?|photos?|images?|sextapes?|pictures?)\b[^.!?]{0,60}\b(publi(?:er|e|es)|publish|diffus(?:er|e)|partag(?:er|e)|share|sortir|r[eé]v[ée]l(?:er)|expos(?:er|e)|montr(?:er|e))\b/i,
];

const SEXUAL_COERCION: readonly RegExp[] = [
  /\b(envoy(?:e|ez|er)?|send|photograph(?:ie|ies|iez)|photo|prends? une photo|selfie|video)\b[^.!?]{0,60}\b(nue|nues|intime|intimes|sexe|sexuel|sexual|naked|explicit|pornograph)\w*/i,
  /\b(nue|nudes|intimate photo|photo intime|sextape)\b[^.!?]{0,60}\b(sinon|otherwise|ou alors|pour sinon)\b[^.!?]{0,40}\b(publier|publish|diffuser|share|expose|cauchemar|ruiner)\b/i,
  /\b(menace|menaces|menacing|threat)\b[^.!?]{0,60}\b(publier|publish|diffuser|share|expose)\b/i,
];

// A demand plus a deadline plus a consequence, which is the shape of every
// blackmail and of most advance-fee intimidation.
const DEADLINE_WITH_THREAT: readonly RegExp[] = [
  /\b(dans \d+ ?(?:heure|jour|minute)s?|within \d+ (?:hours?|days?|minutes?)|sous \d+\s*(?:h\b|heure|heures|hrs?|jours?)|\b\d+\s*(?:h|hr|hrs)\b|24\s*h|48\s*h|72\s*h)\b/i,
  /\b(sinon|otherwise|publier|publish|diffuser|exposer|prison|vousclesi|arr[eê]t|police|licenci|exposed|scandale|ruiner|honn?eur)\b/i,
];

// Link and credential harvesting dressed as a bank, an operator or an employer.
const CREDENTIAL_PAGE: readonly RegExp[] = [
  /\b(cliquez|click|tapez|suivez|clique|visit|visitez|connectez-vous|connectez vous|log ?in|connect)\b[^.!?]{0,60}\b(ici|here|below|ce lien|this link|le lien|page)\b/i,
  /\b(banque|bank|orange|mtn|vodacom|mobile money|op[eé]rateur|antc|antic|minist[eè]re)\b[^.!?]{0,80}\b(mot de passe|password|identifiants|credentials|code|pin|otp|carte|carte bancaire|card details)\b/i,
  /\b(votre (?:compte|carte) (?:sera|sera) (?:bloqu[eé]|suspendu)|your (?:account|card) (?:will be|has been) (?:blocked|suspended|frozen))\b/i,
];

const RULES: StructuralRule[] = [
  {
    key: "mule-receive",
    category: "MONEY_LAUNDERING",
    riskLevel: "HIGH_RISK",
    all: [MULE_RECEIVE],
    evidenceBulletEn:
      "This asks you to receive money through your own account and pass it on to someone else. You would be holding the money and the liability, and if it was stolen, the account that gets frozen is yours. A percentage for the trouble is not a salary.",
    evidenceBulletFr:
      "Ce message vous demande de recevoir de l'argent sur votre propre compte et de le transmettre à un tiers. Vous détiendriez l'argent et la responsabilité, et si les fonds sont volés, c'est votre compte qui sera bloqué. Une commission pour ce service n'est pas un salaire.",
  },
  {
    key: "mule-commission",
    category: "MONEY_LAUNDERING",
    riskLevel: "HIGH_RISK",
    all: MULE_COMMISSION,
    evidenceBulletEn:
      "This offers to pay you a percentage for moving other people's money through your account. It is money laundering, and the risk lands on you rather than on whoever recruited you.",
    evidenceBulletFr:
      "Ce message propose de vous verser un pourcentage pour faire transiter l'argent d'autres personnes via votre compte. Il s'agit de blanchiment d'argent, et le risque retombe sur vous plutôt que sur celui qui vous a recruté.",
  },
  {
    key: "fee-before-release",
    category: "OTHER",
    riskLevel: "HIGH_RISK",
    all: [FEE_BEFORE_RELEASE],
    evidenceBulletEn:
      "It asks you to pay before you receive anything. A scholarship, a job, a prize or a customs release is never unlocked by a fee you send first, whatever the offer claims to be.",
    evidenceBulletFr:
      "Il vous demande de payer avant de recevoir quoi que ce soit. Une bourse, un emploi, un prix ou une mainlevée douanière ne se débloque jamais par des frais envoyés à l'avance, quelle que soit l'annonce.",
  },
  {
    key: "impersonated-authority",
    category: "IMPERSONATION",
    riskLevel: "CAUTION",
    all: IMPERSONATED_AUTHORITY,
    evidenceBulletEn:
      "The sender claims to speak for an institution or a named official. Cameroon ministries, ANTIC and banks do not introduce themselves over SMS or WhatsApp, and they never ask for an OTP, a pin, or a Mobile Money transfer.",
    evidenceBulletFr:
      "L'expéditeur prétend parler au nom d'une institution ou d'une personnalité officielle. Les ministères, l'ANTIC et les banques ne se présentent jamais par SMS ou WhatsApp, et ne demandent jamais un OTP, un code ni un transfert Mobile Money.",
  },
  {
    key: "credential-request",
    category: "MOBILE_MONEY",
    riskLevel: "HIGH_RISK",
    all: [CREDENTIAL_REQUEST],
    evidenceBulletEn:
      "It asks for a one-time code or a pin. Whoever has it can move money from your account, and no bank, ministry, operator or employer will ever ask you to share one. Anyone who does already has access to your account.",
    evidenceBulletFr:
      "Il demande un code à usage unique ou un code secret. Quiconque l'obtient peut déplacer de l'argent depuis votre compte, et aucune banque, aucun ministère, aucun opérateur ni employeur ne vous le demandera. Celui qui le demande a déjà accès à votre compte.",
  },
  // Sextortion is checked before plain extortion: the response for a minor or
  // for someone being asked for intimate images needs a different route, so the
  // category has to be the one that reaches the safety copy.
  {
    key: "sextortion",
    category: "SEXTORTION",
    riskLevel: "HIGH_RISK",
    all: SEXUAL_COERCION.slice(0, 1),
    evidenceBulletEn:
      "This is a sexual demand backed by a threat of exposure. Paying does not end this, it usually escalates, and the material is often already held. Do not send anything. Do not meet anyone. Screenshot the whole conversation, the profile and the number, then report it to the police and to the ANTIC hotline on 8202.",
    evidenceBulletFr:
      "Il s'agit d'une demande sexuelle assortie d'une menace de diffusion. Payer n'arrête pas la situation, cela l'aggrave le plus souvent, et les contenus sont souvent déjà en possession de la personne. N'envoyez rien. Ne rencontrez personne. Faites des captures d'écran de toute la conversation, du profil et du numéro, puis signalez à la police et au numéro de l'ANTIC, le 8202.",
  },
  {
    key: "sextortion-implicit",
    category: "SEXTORTION",
    riskLevel: "HIGH_RISK",
    all: SEXUAL_COERCION.slice(2, 3).concat(EXPOSURE_THREAT.slice(0, 1)),
    evidenceBulletEn:
      "This threatens to publish private material in exchange for something. Do not send anything, and do not pay. Keep the evidence: screenshot everything including the profile, the phone number and the threats, then report it to the police and to the ANTIC hotline on 8202.",
    evidenceBulletFr:
      "Il menace de diffuser du contenu privé en échange de quelque chose. N'envoyez rien et ne payez pas. Conservez les preuves : capturez toute la conversation, le profil, le numéro et les menaces, puis signalez à la police et au numéro de l'ANTIC, le 8202.",
  },
  {
    key: "extortion",
    category: "EXTORTION",
    riskLevel: "HIGH_RISK",
    all: EXPOSURE_THREAT.slice(1, 2).concat(DEADLINE_WITH_THREAT.slice(0, 1)),
    evidenceBulletEn:
      "This is blackmail: a demand, a deadline, and a threat of exposure or of consequences. Paying is what these schemes run on and it rarely stops them. Do not pay and do not reply. Keep every screenshot, then report it to the police and to the ANTIC hotline on 8202.",
    evidenceBulletFr:
      "Il s'agit d'un chantage : une demande, un délai, et une menace de diffusion ou de conséquences. Le paiement est précisément ce qui nourrit ce mécanisme, et cela s'arrête rarement. Ne payez pas et ne répondez pas. Conservez toutes les captures d'écran, puis signalez à la police et au numéro de l'ANTIC, le 8202.",
  },
  {
    key: "credential-page",
    category: "PHISHING",
    riskLevel: "HIGH_RISK",
    all: CREDENTIAL_PAGE.slice(0, 1),
    evidenceBulletEn:
      "This sends you to a page to enter a password, a code or card details. Your bank, your operator and the government reach you first; they never arrive as a link in a message. Open the app or type the address yourself, and report the sender on 8202.",
    evidenceBulletFr:
      "Il vous envoie vers une page pour saisir un mot de passe, un code ou des informations de carte. Votre banque, votre opérateur et l'État vous contactent en premier ; ils ne passent jamais par un lien dans un message. Ouvrez l'application ou saisissez l'adresse vous-même, et signalez l'expéditeur au 8202.",
  },
];

export function evaluateStructuralPatterns(text: string): ScamPatternMatch | null {
  for (const rule of RULES) {
    if (rule.all.every((clause) => clause.test(text))) {
      return {
        category: rule.category,
        riskLevel: rule.riskLevel,
        matchedPhrases: [rule.key],
        evidenceBulletEn: rule.evidenceBulletEn,
        evidenceBulletFr: rule.evidenceBulletFr,
      };
    }
  }
  return null;
}
