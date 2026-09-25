export type Language = "en" | "fr";

export const translations = {
  en: {
    // Brand & Header
    siteTitle: "CheckAm",
    tagline: "Verify before you pay",
    heroHeading: "Stop Cameroon Scams Before You Send Money",
    heroSubheading:
      "Paste a suspicious message, upload a recruitment flyer or search any phone number/email. Get an instant, evidence-backed verdict and a ready-to-forward WhatsApp alert.",
    anticBanner: "Official National Cyber Security Hotline: Call 8202 (Free / ANTIC)",
    navHome: "Verify",
    navChat: "Chat",
    navDirectory: "Scam Registry",
    navReport: "Report a Scam",
    navWhatsApp: "WhatsApp Bot",
    navAdmin: "Moderation",

    // Intake Hub
    intakeTabPaste: "Paste Text / SMS",
    intakeTabUpload: "Upload Flyer / PDF",
    intakeTabLookup: "Search Phone / Email",
    pastePlaceholder:
      "Paste the suspicious WhatsApp message, SMS, recruitment announcement, or job offer here...",
    pasteActionBtn: "Analyze Message Now",
    uploadTitle: "Drop a flyer, screenshot or PDF here",
    uploadSubtitle: "Supports PNG, JPG, WebP & PDF up to 10MB",
    uploadBtn: "Select File",
    uploadActionBtn: "Scan Flyer with CheckAm Engine",
    lookupPlaceholder: "Enter phone (+237 6XXXXXXXX) or email...",
    lookupBtn: "Search Registry & Verify",
    analyzing: "Analyzing against Cameroon official registry & rules...",
    orTryDemo: "Or test with real Cameroon scam cases:",
    demoCase1Title: "🛑 Fake MINESEC 325 Teachers Flyer",
    demoCase2Title: "🛑 75,000 FCFA Orange Money Reversal SMS",
    demoCase3Title: "🛑 Express Canada Work Visa Flyer",

    // Verdict Card & Receipts
    verdictHighRisk: "HIGH RISK — SCAM DETECTED",
    verdictCaution: "CAUTION — SUSPICIOUS NOTICE",
    verdictOfficial: "AUTHENTIC — OFFICIAL NOTICE",
    riskScoreLabel: "Risk Assessment Score",
    evidenceTitle: "Key Evidence Points (Receipts)",
    officialContactsTitle: "Official Verification Channel & Hotline",
    anticCallout: "National Cyber Security Agency (ANTIC): Call 8202 free of charge.",
    forwardAlertTitle: "Forward This Warning on WhatsApp",
    forwardAlertDesc:
      "Copy and paste this verified alert to protect family, friends, and community WhatsApp groups.",
    copyAlertBtn: "Copy WhatsApp Warning",
    copiedAlertBtn: "Copied to Clipboard!",
    shareOnWhatsAppBtn: "Share Directly to WhatsApp",
    verifiedWebsiteLabel: "Official Portal:",
    checkAnotherBtn: "Verify Another Message",

    // Public Directory
    directoryTitle: "Cameroon Scam Registry",
    directorySubtitle:
      "Search confirmed and verified scam cases, blacklisted phone numbers, and fraudulent campaigns reported across Cameroon.",
    searchDirectoryPlaceholder: "Search by phone number, email, acronym, or keywords...",
    categoryAll: "All Categories",
    categoryCivilService: "Civil Service & Concours",
    categoryVisa: "Visas & Foreign Travel",
    categoryMoMo: "Mobile Money & Telecom",
    categoryInvestment: "Crypto & Fake Investments",
    categoryEcommerce: "Customs & Fake Sales",
    filterBtn: "Filter",
    noResultsFound: "No scam cases matched your search query.",
    viewDossier: "View Case Dossier",

    // Report Scam Flow
    reportTitle: "Report a Scam Attempt",
    reportSubtitle:
      "Help protect other Cameroonians by reporting fraudulent phone numbers, fake recruitment notices, or illicit money demands. All submissions are moderated before publishing.",
    reportFormTitleLabel: "Report Title / Summary",
    reportFormTitlePlaceholder: "e.g. Fake Douala Port Customs Car Auction on Facebook",
    reportCategoryLabel: "Category",
    reportEntityLabel: "Target Entity Impersonated (Optional)",
    reportEntityPlaceholder: "e.g. MINFOPRA, Orange Money, Canadian Embassy",
    reportPhoneLabel: "Suspect Phone Number(s)",
    reportPhonePlaceholder: "+237 6XXXXXXXX",
    reportEmailLabel: "Suspect Email Address(es)",
    reportEmailPlaceholder: "scammer@gmail.com",
    reportAmountLabel: "Amount Demanded or Extorted",
    reportAmountPlaceholder: "e.g. 50 000 FCFA",
    reportDescLabel: "Detailed Description of the Scam",
    reportDescPlaceholder:
      "Explain what they offered, how they asked for money, and what payment instructions they gave...",
    reportSubmitBtn: "Submit Scam Report for Review",
    reportSuccessMessage:
      "Thank you! Your report has been submitted to the CheckAm moderation team. It will be reviewed swiftly to protect the public.",

    // Threat Feed
    threatFeedTitle: "Public Threat Intelligence Feed",
    threatFeedSubtitle:
      "Automated API feed for Cameroonian telcos, fintechs, and banks to sync newly flagged scam numbers.",
    downloadJsonBtn: "Download JSON Feed",
    downloadCsvBtn: "Download CSV Feed",

    // Footer
    footerDisclaimer:
      "CheckAm is an independent public-utility scam verification service for Cameroon. Official communications are cross-referenced with the Presidency, Government Ministries, and ANTIC (National Agency for ICT).",
    footerHotline: "ANTIC Cybercrime Hotline: 8202 (Toll-Free in Cameroon)",
    footerRights: "CheckAm Cameroon. All rights reserved.",

    // Case dossier (/scam/[slug])
    dossierBack: "Back to scam registry",
    dossierBadge: "CONFIRMED & REPORTED SCAM",
    dossierPublished: "Published on",
    dossierEntityImpersonated: "Impersonated entity:",
    dossierFactsTitle: "Facts & Modus Operandi",
    dossierSuspectNumber: "Suspect Number / Orange / MTN MoMo",
    dossierFakeEmail: "Fake Email Used",
    dossierAmountDemanded: "Amount Demanded / Extorted",
    dossierEvidenceTitle: "CheckAm Evidence & Legal Analysis",
    dossierAnticTitle: "Report this number to ANTIC",
    dossierAnticDesc: "Call 8202 toll-free so authorities can block this contact.",
    dossierHotlineBadge: "Hotline 8202 (Free)",
    dossierAlertTitle: "Warn Your Loved Ones on WhatsApp",
    dossierAlertDesc:
      "Forward this certified alert to your WhatsApp groups to stop your contacts from sending money.",
    dossierForwardBtn: "Forward on WhatsApp",

    // Admin moderation
    adminBadge: "Administration & Moderation Portal",
    adminTitle: "CheckAm Moderation Queue",
    adminSubtitle: "Review citizen submissions before publication to avoid false accusations.",
    adminPending: "Pending Review",
    adminPendingHint: "New reports to verify",
    adminApproved: "Published Scams",
    adminApprovedHint: "Visible in the public registry",
    adminFlagged: "Blacklisted Numbers",
    adminFlaggedHint: "Active in the telco/bank feed",
    adminVerifs: "Total Verifications",
    adminVerifsHint: "Checks run by citizens",
    adminTabPending: "Pending",
    adminTabApproved: "Approved",
    adminTabRejected: "Rejected",
    adminTabAll: "All",
    adminRefresh: "Refresh",
    adminEmpty: "No reports in this category.",
    adminEmptyHint: "The moderation queue is up to date.",
    adminApprove: "Approve & Publish",
    adminReject: "Reject",
    adminUnpublish: "Unlist / Remove",
    adminRestore: "Restore & Approve",
    adminViewPublic: "View public page",
    adminReceivedOn: "Received",
    adminReportedBy: "Reported by:",
    adminLoadFail: "Failed to load moderation queue",
    adminApproveOk: "Report approved and published to the public registry!",
    adminRejectOk: "Report rejected.",
    adminActionFail: "Failed to moderate report",

    // Directory extras
    resetFilters: "Reset filters",
    categoryOther: "Other",

    // WhatsApp page extras
    waBotName: "Official Anti-Scam Bot",
    waTestScenario: "Test scenario:",
    waDevSpecTitle: "WhatsApp Webhook Technical Spec (Stage 2)",
    waDevSpecDesc:
      "The public webhook endpoint implements Meta HMAC-SHA256 signature verification, an idempotent event inbox, and async Inngest queue processing with circuit breaker.",

    // Errors, toasts, misc
    verifyRateLimit: "Too many checks — wait a minute and try again.",
    verifyDenied: "Blocked by security shield. Try again shortly.",
    verifyFailed: "Verification failed. Please try again.",
    reportRateLimit: "Too many reports — please wait before submitting another.",
    reportFailed: "Failed to submit report. Please try again.",
    copyFailed: "Failed to copy to clipboard",
    toggleMenu: "Toggle menu",

    // Landing — bulletin ticker
    bulletinLive: "Live registry",
    bulletinVerified: "messages verified",
    bulletinBlacklisted: "numbers blacklisted",
    bulletinCases: "confirmed cases",
    bulletinFlaggedPrefix: "Flagged",

    // Landing — hero
    heroKicker: "Independent anti-scam bureau — Cameroon",
    heroHeadingA: "Before you send the money,",
    heroHeadingB: "send us the message.",
    heroLede:
      "Paste the SMS, upload the flyer, search the number. CheckAm interrogates it against Cameroon's official rules and the confirmed scam registry — and hands you receipts you can forward.",
    heroCtaVerify: "Verify a message",
    heroCtaRegistry: "Browse the registry",
    heroNoteFree: "Free",
    heroNoteNoAccount: "No account needed",
    heroNoteBilingual: "EN / FR",
    heroReceiptTitle: "Specimen — verification receipt",
    heroTrustLabel: "Cross-checked with",

    // Landing — verification desk
    deskKicker: "The verification desk",
    deskTitle: "Drop it here. Verdict in seconds.",
    deskSub: "Three ways in, one clear answer out: high risk, caution, or verified official.",

    // Landing — how it works
    howKicker: "How a verdict is built",
    howTitle: "Rules first. AI second. Receipts always.",
    howSub:
      "No black box. Every verdict cites the exact rule it broke — and the official channel that proves it.",
    howStep1Title: "You bring the evidence",
    howStep1Desc:
      "A WhatsApp forward, a concours flyer, a strange MoMo SMS, a phone number from a stranger. Paste it, snap it, or search it.",
    howStep2Title: "The rules interrogate it",
    howStep2Desc:
      "Treasury-only payments, .gov.cm domains, ANTIC records, flagged numbers. Deterministic checks run before any AI is consulted.",
    howStep3Title: "You get receipts to forward",
    howStep3Desc:
      "Badge, three evidence bullets, official contacts, and a WhatsApp warning ready to protect your family groups.",

    // Landing — anatomy of a scam
    anatomyKicker: "Anatomy of a scam",
    anatomyTitle: "Learn the tells. Every flag is a rule.",
    anatomySub:
      "Real patterns from confirmed Cameroonian cases. Open a case, then tap each flag to see where it hides in the message.",
    anatomyTabMinesec: "MINESEC 325",
    anatomyTabMomo: "MoMo reversal",
    anatomyTabVisa: "Canada visa",
    anatomyRuleLabel: "Rule",

    // Landing — registry preview
    regKicker: "From the public registry",
    regTitle: "Recently confirmed cases",
    regSub: "Every entry below was reviewed by a moderator before publication.",
    regCta: "Open the full registry",
    regViewDossier: "Dossier",

    // Landing — FAQ
    faqKicker: "Questions, answered",
    faqTitle: "Before you ask",
    faqQ1: "Is CheckAm really free?",
    faqA1:
      "Yes. Verification, the registry, and the WhatsApp bot are free. If anyone asks you to pay for a 'CheckAm clearance', that itself is a scam — report it.",
    faqQ2: "What should I never do?",
    faqA2:
      "Never send Mobile Money to a personal number for an official fee — concours and stamp duties are paid against a Public Treasury receipt. Never share OTP codes. When in doubt, call ANTIC at 8202 first.",
    faqQ3: "I already sent money. What now?",
    faqA3:
      "Act fast: call your operator (MTN 8788, Orange 950), then report to ANTIC at 8202, then file a report here so the number gets flagged for others.",
    faqQ4: "Who runs CheckAm?",
    faqA4:
      "An independent civic utility for Cameroon. Official facts are cross-checked with the Presidency, government ministries, and ANTIC — never with the sender.",

    // Landing — final CTA
    ctaTitle: "Got a suspicious message right now?",
    ctaSub: "Thirty seconds of verification beats months of regret.",
    ctaBtn: "Verify it now",
    continueBarText: "Welcome back — your checks wait in chat.",
    continueBarBtn: "Continue to chat",

    // Settings
    settingsTitle: "Settings",
    settingsSub: "Your profile, language, and password in one quiet place.",
    settingsProfile: "Profile",
    settingsNameLabel: "Display name",
    settingsSave: "Save changes",
    settingsSaved: "Saved.",
    settingsLanguage: "Language",
    settingsPassword: "Password",
    settingsCurrentPw: "Current password",
    settingsNewPw: "New password",
    settingsChangePw: "Change password",
    settingsPwChanged: "Password changed. Other sessions signed out.",
    settingsSignOut: "Sign out everywhere",
    settingsNeedSignIn: "Sign in to open settings.",

    // WhatsApp guide trials
    guideNumberTitle: "Save the number, start trying",
    guideNumberDesc: "Save CheckAm in your contacts, then forward a suspect message. Samples below open a trial in one tap.",
    guideSaveBtn: "Save number",
    guideSaved: "Saved — find CheckAm in your contacts.",
    guideOpenWa: "Open WhatsApp chat",
    guideUseWebChat: "Try in web chat instead",
    guideTrialText: "Try a suspect text",
    guideTrialImage: "Try a flyer check",
    guideTrialPhone: "Try a number lookup",

    // Gate (signin permit)
    gateKicker: "CheckAm permit",
    gateTitle: "Sign in to your checks",
    gateSub: "One gate for everything. Your history waits on the other side.",
    gateGoogleBtn: "Continue with Google",
    gateOrDivider: "or with password",
    gateEmailLabel: "Email",
    gateEmailPlaceholder: "you@example.com",
    gatePasswordLabel: "Password",
    gatePasswordPlaceholder: "8 characters or more",
    gatePasswordHintWeak: "Weak — longer is stronger",
    gatePasswordHintFair: "Fair — add variety",
    gatePasswordHintStrong: "Strong — good to go",
    gateSignInBtn: "Sign in",
    gateSignUpBtn: "Create account",
    gateHaveAccount: "Already have an account?",
    gateNoAccount: "New to CheckAm?",
    gateForgotBtn: "Forgot password?",
    gateVerifyTitle: "Check your mailbox",
    gateVerifyDesc: "We sent a verify link. It lives 24 hours.",
    gateResendBtn: "Resend link",
    gateResendOk: "Link sent. Check your mailbox.",
    gateResetTitle: "Reset your password",
    gateResetDesc: "We sent a link plus a code. The link lives 1 hour, the code 10 minutes.",
    gateOtpLabel: "Code from the mail",
    gateOtpPlaceholder: "6 digit code",
    gateOtpBtn: "Confirm code",
    gateBackBtn: "Back to sign in",
    gateExpiredTitle: "This link expired",
    gateExpiredDesc: "Links die for real reasons like delay. Request a fresh one.",
    gateReissueBtn: "Send a fresh link",
    gateDelayedTitle: "Mail is delayed",
    gateDelayedDesc: "The queue is slow. Your link is coming — retry if nothing lands.",
    gateRetryBtn: "Retry",
    gateUnverifiedTitle: "Verify first",
    gateUnverifiedDesc: "Chat needs a proved mailbox. Verify, then come back.",
    gateGoogleKept: "Google step cancelled. Your mail form is kept — continue here.",
    gateRateLimited: "Too many tries. Wait a little, then retry.",
    gateFailed: "Something failed. Check the field and retry.",
    gateUserMenuSettings: "Settings",
    gateUserMenuSignOut: "Sign out",
    gateSignedInAs: "Signed in as",

    // Chat atelier
    chatNewChat: "New check",
    chatFolders: "Folders",
    chatNewFolder: "New folder",
    chatSearchPh: "Search checks...",
    chatEmptyTitle: "What should we verify?",
    chatEmptySub: "Try one tap, or write your own.",
    chatSampleText: "Check a suspect message",
    chatSampleFlyer: "Scan a flyer",
    chatSamplePhone: "Look up a number",
    chatComposerPh: "Paste a message, or attach a flyer...",
    chatSend: "Send",
    chatStop: "Stop",
    chatRetry: "Retry",
    chatDossierTitle: "Evidence dossier",
    chatSealStamped: "Verdict sealed",
    chatWallTitle: "Daily tries used",
    chatWallDesc: "Sign in to keep checking. Your draft is kept.",
    chatWallSignIn: "Sign in",
    chatOfflineTitle: "You are offline",
    chatOfflineDesc: "Your message waits and sends on reconnect.",
    chatTurnFailed: "This turn failed. Retry from your kept draft.",
    chatDeleted: "Deleted.",
    chatUndo: "Undo",
    chatRestored: "Restored.",
    chatDeleteSession: "Delete this check?",
    chatDeleteFolder: "Delete this folder and its checks?",
    chatConfirmDelete: "Delete",
    chatCancel: "Cancel",
    chatRename: "Rename",
    chatPin: "Pin",
    chatUnpin: "Unpin",
    chatTriesLeft: "tries left today",

    // Mail templates (rich HTML + plaintext twins)
    mailVerifySubject: "Verify your CheckAm account",
    mailVerifyHeadline: "One tap and your checks are yours",
    mailVerifyBody: "Confirm this mailbox so your history and checks stay with you. The link lives 24 hours.",
    mailVerifyCta: "Verify my mailbox",
    mailResetSubject: "Reset your CheckAm password",
    mailResetHeadline: "Get back into your checks",
    mailResetBody: "Use the link within 1 hour, or type the code within 10 minutes. Never share either.",
    mailResetCta: "Reset my password",
    mailWelcomeSubject: "Welcome to CheckAm — verify before you pay",
    mailWelcomeHeadline: "Your first check takes thirty seconds",
    mailWelcomeBody: "Paste a suspect message, drop a flyer, or look up a phone. If anyone asks you to pay for a CheckAm validation, it is a scam in itself.",
    mailWelcomeCta: "Run your first check",
    mailClosing: "The CheckAm team — verify before you pay. ANTIC hotline 8202, free.",
  },
  fr: {
    // Brand & Header
    siteTitle: "CheckAm",
    tagline: "Vérifiez avant de payer",
    heroHeading: "Bloquez les arnaques au Cameroun avant d'envoyer votre argent",
    heroSubheading:
      "Collez un message suspect, déposez un flyer de concours ou cherchez un numéro/email. Obtenez un verdict immédiat avec preuves irréfutables et une alerte WhatsApp prête à transférer.",
    anticBanner: "Numéro vert national de cybersécurité : Appelez le 8202 (Gratuit / ANTIC)",
    navHome: "Vérifier",
    navChat: "Chat",
    navDirectory: "Registre des Arnaques",
    navReport: "Signaler une Arnaque",
    navWhatsApp: "Bot WhatsApp",
    navAdmin: "Modération",

    // Intake Hub
    intakeTabPaste: "Coller Texte / SMS",
    intakeTabUpload: "Déposer Flyer / PDF",
    intakeTabLookup: "Vérifier Numéro / Email",
    pastePlaceholder:
      "Collez le message WhatsApp suspect, le SMS, l'avis de recrutement ou l'offre d'emploi ici...",
    pasteActionBtn: "Analyser le Message Maintenant",
    uploadTitle: "Déposez un flyer, une capture ou un PDF ici",
    uploadSubtitle: "Prend en charge PNG, JPG, WebP et PDF jusqu'à 10 Mo",
    uploadBtn: "Choisir un fichier",
    uploadActionBtn: "Scanner le Flyer avec le Moteur CheckAm",
    lookupPlaceholder: "Entrez un numéro (+237 6XXXXXXXX) ou un email...",
    lookupBtn: "Vérifier dans le Registre",
    analyzing: "Analyse en cours selon les règles officielles camerounaises...",
    orTryDemo: "Ou testez avec des cas réels au Cameroun :",
    demoCase1Title: "🛑 Faux avis MINESEC des 325 instituteurs",
    demoCase2Title: "🛑 Faux SMS virement Orange Money 75 000 FCFA",
    demoCase3Title: "🛑 Faux visa Canada express 14 jours",

    // Verdict Card & Receipts
    verdictHighRisk: "RISQUE ÉLEVÉ — ARNAQUE CONFIRMÉE",
    verdictCaution: "ATTENTION — AVIS SUSPECT / PRUDENCE",
    verdictOfficial: "AUTHENTIQUE — DOCUMENT OFFICIEL VÉRIFIÉ",
    riskScoreLabel: "Score d'évaluation du risque",
    evidenceTitle: "Preuves & Faits Relevés (Les Reçus)",
    officialContactsTitle: "Canaux Officiels & Assistance",
    anticCallout: "Agence Nationale des TIC (ANTIC) : Appelez gratuitement le 8202.",
    forwardAlertTitle: "Transférer Cette Alerte sur WhatsApp",
    forwardAlertDesc:
      "Copiez et partagez cette alerte vérifiée pour protéger vos groupes WhatsApp familiaux et professionnels.",
    copyAlertBtn: "Copier l'Alerte WhatsApp",
    copiedAlertBtn: "Alerte Copiée !",
    shareOnWhatsAppBtn: "Partager Directement sur WhatsApp",
    verifiedWebsiteLabel: "Portail Officiel :",
    checkAnotherBtn: "Vérifier un Autre Message",

    // Public Directory
    directoryTitle: "Registre National des Arnaques",
    directorySubtitle:
      "Consultez les arnaques confirmées, numéros blacklistés et faux avis signalés à travers le Cameroun.",
    searchDirectoryPlaceholder: "Rechercher par numéro, email, ministère ou mot-clé...",
    categoryAll: "Toutes les catégories",
    categoryCivilService: "Fonction Publique & Concours",
    categoryVisa: "Visas & Voyages à l'étranger",
    categoryMoMo: "Mobile Money & Télécoms",
    categoryInvestment: "Crypto & Faux Investissements",
    categoryEcommerce: "Douanes & Fausses Ventes",
    filterBtn: "Filtrer",
    noResultsFound: "Aucune arnaque ne correspond à votre recherche.",
    viewDossier: "Consulter le Dossier",

    // Report Scam Flow
    reportTitle: "Signaler une Tentative d'Arnaque",
    reportSubtitle:
      "Protégez vos concitoyens en signalant un numéro frauduleux, un faux avis de recrutement ou une demande d'argent illicite. Toutes les soumissions sont vérifiées avant publication.",
    reportFormTitleLabel: "Titre / Résumé du signalement",
    reportFormTitlePlaceholder:
      "Ex. Fausse vente aux enchères des véhicules des Douanes sur Facebook",
    reportCategoryLabel: "Catégorie",
    reportEntityLabel: "Entité ou Ministère usurpé (Optionnel)",
    reportEntityPlaceholder: "Ex. MINFOPRA, Orange Money, Ambassade du Canada",
    reportPhoneLabel: "Numéro(s) de téléphone suspect(s)",
    reportPhonePlaceholder: "+237 6XXXXXXXX",
    reportEmailLabel: "Adresse(s) email suspecte(s)",
    reportEmailPlaceholder: "escroc@gmail.com",
    reportAmountLabel: "Montant exigé ou extorqué",
    reportAmountPlaceholder: "Ex. 50 000 FCFA",
    reportDescLabel: "Description détaillée de l'arnaque",
    reportDescPlaceholder:
      "Expliquez ce qu'ils ont promis, le mode de paiement exigé et les instructions reçues...",
    reportSubmitBtn: "Envoyer le Signalement en Modération",
    reportSuccessMessage:
      "Merci ! Votre signalement a été transmis à l'équipe de modération CheckAm. Il sera traité rapidement afin de protéger le public.",

    // Threat Feed
    threatFeedTitle: "Flux Public de Renseignement sur les Menaces",
    threatFeedSubtitle:
      "Flux API automatisé pour les opérateurs télécoms camerounais, fintechs et banques.",
    downloadJsonBtn: "Télécharger le Flux JSON",
    downloadCsvBtn: "Télécharger le Flux CSV",

    // Footer
    footerDisclaimer:
      "CheckAm est un service d'utilité publique indépendant au Cameroun. Les informations officielles sont recoupées avec la Présidence de la République, les Ministères et l'ANTIC.",
    footerHotline: "Numéro Vert Cybersécurité ANTIC : 8202 (Appel gratuit au Cameroun)",
    footerRights: "CheckAm Cameroun. Tous droits réservés.",

    // Dossier d'affaire (/scam/[slug])
    dossierBack: "Retour au registre des arnaques",
    dossierBadge: "ARNAQUE CONFIRMÉE & SIGNALÉE",
    dossierPublished: "Publié le",
    dossierEntityImpersonated: "Entité usurpée :",
    dossierFactsTitle: "Description des Faits & Mode Opératoire",
    dossierSuspectNumber: "Numéro Suspect / Orange / MTN MoMo",
    dossierFakeEmail: "Faux Email Utilisé",
    dossierAmountDemanded: "Montant Demandé / Extorqué",
    dossierEvidenceTitle: "Preuves & Analyse Juridique CheckAm",
    dossierAnticTitle: "Signalez ce numéro à l'ANTIC",
    dossierAnticDesc: "Appelez sans frais le 8202 pour faire bloquer ce contact par les autorités.",
    dossierHotlineBadge: "Hotline 8202 (Gratuit)",
    dossierAlertTitle: "Alertez Vos Proches sur WhatsApp",
    dossierAlertDesc:
      "Faites suivre cette alerte certifiée dans vos groupes WhatsApp pour empêcher vos contacts d'envoyer de l'argent.",
    dossierForwardBtn: "Transférer sur WhatsApp",

    // Modération admin
    adminBadge: "Portail d'Administration & Modération",
    adminTitle: "File de Modération CheckAm",
    adminSubtitle:
      "Examinez les soumissions citoyennes avant publication pour éviter les fausses accusations.",
    adminPending: "En Attente de Revue",
    adminPendingHint: "Nouveaux signalements à vérifier",
    adminApproved: "Arnaques Publiées",
    adminApprovedHint: "Visibles dans le registre public",
    adminFlagged: "Numéros Blacklistés",
    adminFlaggedHint: "Actifs dans le flux télécoms/banques",
    adminVerifs: "Vérifications Totales",
    adminVerifsHint: "Analyses effectuées par les citoyens",
    adminTabPending: "En Attente",
    adminTabApproved: "Approuvés",
    adminTabRejected: "Rejetés",
    adminTabAll: "Tous",
    adminRefresh: "Actualiser",
    adminEmpty: "Aucun signalement dans cette catégorie.",
    adminEmptyHint: "La file de modération est actuellement à jour.",
    adminApprove: "Approuver & Publier",
    adminReject: "Rejeter",
    adminUnpublish: "Déréférencer / Retirer",
    adminRestore: "Rétablir & Approuver",
    adminViewPublic: "Voir page publique",
    adminReceivedOn: "Reçu le",
    adminReportedBy: "Signalé par :",
    adminLoadFail: "Échec du chargement de la file de modération",
    adminApproveOk: "Rapport approuvé et publié dans le registre public !",
    adminRejectOk: "Rapport rejeté.",
    adminActionFail: "Échec de la modération",

    // Registre (extras)
    resetFilters: "Réinitialiser les filtres",
    categoryOther: "Autre",

    // Page WhatsApp (extras)
    waBotName: "Bot Officiel Anti-Arnaque",
    waTestScenario: "Test scénario :",
    waDevSpecTitle: "Spécification Technique du Webhook WhatsApp (Stage 2)",
    waDevSpecDesc:
      "Le endpoint public de webhook implémente la vérification de signature cryptographique HMAC-SHA256 Meta, l'inbox d'événements idempotents et le traitement asynchrone par file d'attente Inngest avec disjoncteur (circuit-breaker).",

    // Erreurs, toasts, divers
    verifyRateLimit: "Trop de vérifications — patientez une minute et réessayez.",
    verifyDenied: "Bloqué par le bouclier de sécurité. Réessayez bientôt.",
    verifyFailed: "La vérification a échoué. Veuillez réessayer.",
    reportRateLimit: "Trop de signalements — patientez avant d'en envoyer un autre.",
    reportFailed: "Échec de l'envoi du signalement. Veuillez réessayer.",
    copyFailed: "Échec de la copie dans le presse-papiers",
    toggleMenu: "Ouvrir le menu",

    // Accueil — bandeau registre
    bulletinLive: "Registre en direct",
    bulletinVerified: "messages vérifiés",
    bulletinBlacklisted: "numéros blacklistés",
    bulletinCases: "cas confirmés",
    bulletinFlaggedPrefix: "Signalé",

    // Accueil — hero
    heroKicker: "Bureau indépendant anti-arnaque — Cameroun",
    heroHeadingA: "Avant d'envoyer l'argent,",
    heroHeadingB: "envoyez-nous le message.",
    heroLede:
      "Collez le SMS, déposez le flyer, cherchez le numéro. CheckAm l'interroge face aux règles officielles camerounaises et au registre des arnaques confirmées — et vous remet des preuves à transférer.",
    heroCtaVerify: "Vérifier un message",
    heroCtaRegistry: "Consulter le registre",
    heroNoteFree: "Gratuit",
    heroNoteNoAccount: "Sans compte",
    heroNoteBilingual: "EN / FR",
    heroReceiptTitle: "Spécimen — reçu de vérification",
    heroTrustLabel: "Recoupé avec",

    // Accueil — guichet de vérification
    deskKicker: "Le guichet de vérification",
    deskTitle: "Déposez-le ici. Verdict en quelques secondes.",
    deskSub:
      "Trois voies d'entrée, une réponse claire : risque élevé, prudence, ou officiel vérifié.",

    // Accueil — méthode
    howKicker: "Comment un verdict est construit",
    howTitle: "Les règles d'abord. L'IA ensuite. Les preuves toujours.",
    howSub:
      "Aucune boîte noire. Chaque verdict cite la règle exacte qui a été violée — et le canal officiel qui le prouve.",
    howStep1Title: "Vous apportez la preuve",
    howStep1Desc:
      "Un message WhatsApp transféré, un flyer de concours, un SMS MoMo étrange, le numéro d'un inconnu. Collez-le, photographiez-le ou cherchez-le.",
    howStep2Title: "Les règles l'interrogent",
    howStep2Desc:
      "Paiements au Trésor uniquement, domaines .gov.cm, registres ANTIC, numéros signalés. Des contrôles déterministes avant toute IA.",
    howStep3Title: "Vous recevez des preuves à transférer",
    howStep3Desc:
      "Badge, trois preuves, contacts officiels et alerte WhatsApp prête à protéger vos groupes familiaux.",

    // Accueil — anatomie d'une arnaque
    anatomyKicker: "Anatomie d'une arnaque",
    anatomyTitle: "Apprenez les signaux. Chaque drapeau est une règle.",
    anatomySub:
      "Des motifs réels issus de cas camerounais confirmés. Ouvrez un dossier, puis touchez chaque drapeau pour voir où il se cache dans le message.",
    anatomyTabMinesec: "MINESEC 325",
    anatomyTabMomo: "Faux virement MoMo",
    anatomyTabVisa: "Visa Canada",
    anatomyRuleLabel: "Règle",

    // Accueil — aperçu du registre
    regKicker: "Extrait du registre public",
    regTitle: "Cas récemment confirmés",
    regSub: "Chaque dossier ci-dessous a été examiné par un modérateur avant publication.",
    regCta: "Ouvrir le registre complet",
    regViewDossier: "Dossier",

    // Accueil — FAQ
    faqKicker: "Vos questions",
    faqTitle: "Avant de demander",
    faqQ1: "CheckAm est-il vraiment gratuit ?",
    faqA1:
      "Oui. La vérification, le registre et le bot WhatsApp sont gratuits. Si quelqu'un vous demande de payer pour une « validation CheckAm », c'est une arnaque en soi — signalez-la.",
    faqQ2: "Que ne faut-il jamais faire ?",
    faqA2:
      "Ne versez jamais de Mobile Money vers un numéro personnel pour un frais officiel — concours et timbres se paient contre quittance du Trésor Public. Ne partagez jamais vos codes OTP. Dans le doute, appelez d'abord l'ANTIC au 8202.",
    faqQ3: "J'ai déjà envoyé de l'argent. Et maintenant ?",
    faqA3:
      "Agissez vite : appelez votre opérateur (MTN 8788, Orange 950), signalez à l'ANTIC au 8202, puis déposez un signalement ici pour faire bloquer ce numéro.",
    faqQ4: "Qui gère CheckAm ?",
    faqA4:
      "Un service indépendant d'utilité publique pour le Cameroun. Les faits officiels sont recoupés avec la Présidence, les ministères et l'ANTIC — jamais avec l'expéditeur.",

    // Accueil — appel final
    ctaTitle: "Un message suspect sous les yeux ?",
    ctaSub: "Trente secondes de vérification valent mieux que des mois de regrets.",
    ctaBtn: "Vérifiez-le maintenant",
    continueBarText: "Bon retour — vos vérifications vous attendent dans le chat.",
    continueBarBtn: "Continuer vers le chat",

    // Paramètres
    settingsTitle: "Paramètres",
    settingsSub: "Votre profil, langue et mot de passe au même endroit calme.",
    settingsProfile: "Profil",
    settingsNameLabel: "Nom affiché",
    settingsSave: "Enregistrer",
    settingsSaved: "Enregistré.",
    settingsLanguage: "Langue",
    settingsPassword: "Mot de passe",
    settingsCurrentPw: "Mot de passe actuel",
    settingsNewPw: "Nouveau mot de passe",
    settingsChangePw: "Changer le mot de passe",
    settingsPwChanged: "Mot de passe changé. Autres sessions déconnectées.",
    settingsSignOut: "Se déconnecter partout",
    settingsNeedSignIn: "Connectez-vous pour ouvrir les paramètres.",

    // Essais du guide WhatsApp
    guideNumberTitle: "Enregistrez le numéro, essayez",
    guideNumberDesc: "Enregistrez CheckAm dans vos contacts, puis transférez un message suspect. Les exemples ci-dessous ouvrent un essai en un tap.",
    guideSaveBtn: "Enregistrer le numéro",
    guideSaved: "Enregistré — retrouvez CheckAm dans vos contacts.",
    guideOpenWa: "Ouvrir le chat WhatsApp",
    guideUseWebChat: "Essayer dans le chat web",
    guideTrialText: "Essayer un texte suspect",
    guideTrialImage: "Essayer un flyer",
    guideTrialPhone: "Essayer un numéro",

    // Permis (connexion)
    gateKicker: "Permis CheckAm",
    gateTitle: "Connectez-vous à vos vérifications",
    gateSub: "Un seul permis pour tout. Votre historique vous attend de l'autre côté.",
    gateGoogleBtn: "Continuer avec Google",
    gateOrDivider: "ou avec mot de passe",
    gateEmailLabel: "E-mail",
    gateEmailPlaceholder: "vous@exemple.com",
    gatePasswordLabel: "Mot de passe",
    gatePasswordPlaceholder: "8 caractères ou plus",
    gatePasswordHintWeak: "Faible — plus long, c'est plus fort",
    gatePasswordHintFair: "Correct — ajoutez de la variété",
    gatePasswordHintStrong: "Fort — c'est bon",
    gateSignInBtn: "Se connecter",
    gateSignUpBtn: "Créer un compte",
    gateHaveAccount: "Déjà un compte ?",
    gateNoAccount: "Nouveau sur CheckAm ?",
    gateForgotBtn: "Mot de passe oublié ?",
    gateVerifyTitle: "Vérifiez votre boîte mail",
    gateVerifyDesc: "Nous avons envoyé un lien de vérification. Il vit 24 heures.",
    gateResendBtn: "Renvoyer le lien",
    gateResendOk: "Lien envoyé. Vérifiez votre boîte mail.",
    gateResetTitle: "Réinitialisez votre mot de passe",
    gateResetDesc: "Nous avons envoyé un lien plus un code. Le lien vit 1 heure, le code 10 minutes.",
    gateOtpLabel: "Code reçu par mail",
    gateOtpPlaceholder: "Code à 6 chiffres",
    gateOtpBtn: "Confirmer le code",
    gateBackBtn: "Retour à la connexion",
    gateExpiredTitle: "Ce lien a expiré",
    gateExpiredDesc: "Les liens meurent pour de vraies raisons comme le délai. Demandez-en un nouveau.",
    gateReissueBtn: "Envoyer un nouveau lien",
    gateDelayedTitle: "Le mail est en retard",
    gateDelayedDesc: "La file est lente. Votre lien arrive — réessayez si rien ne vient.",
    gateRetryBtn: "Réessayer",
    gateUnverifiedTitle: "Vérifiez d'abord",
    gateUnverifiedDesc: "Le chat exige une boîte mail prouvée. Vérifiez, puis revenez.",
    gateGoogleKept: "Étape Google annulée. Votre formulaire est conservé — continuez ici.",
    gateRateLimited: "Trop de tentatives. Attendez un peu, puis réessayez.",
    gateFailed: "Quelque chose a échoué. Vérifiez le champ et réessayez.",
    gateUserMenuSettings: "Paramètres",
    gateUserMenuSignOut: "Se déconnecter",
    gateSignedInAs: "Connecté en tant que",

    // Atelier de chat
    chatNewChat: "Nouvelle vérification",
    chatFolders: "Dossiers",
    chatNewFolder: "Nouveau dossier",
    chatSearchPh: "Chercher...",
    chatEmptyTitle: "Que vérifions-nous ?",
    chatEmptySub: "Essayez en un tap, ou écrivez vous-même.",
    chatSampleText: "Vérifier un message suspect",
    chatSampleFlyer: "Scanner un flyer",
    chatSamplePhone: "Chercher un numéro",
    chatComposerPh: "Collez un message, ou joignez un flyer...",
    chatSend: "Envoyer",
    chatStop: "Stop",
    chatRetry: "Réessayer",
    chatDossierTitle: "Dossier de preuves",
    chatSealStamped: "Verdict scellé",
    chatWallTitle: "Essais du jour épuisés",
    chatWallDesc: "Connectez-vous pour continuer. Votre brouillon est gardé.",
    chatWallSignIn: "Se connecter",
    chatOfflineTitle: "Vous êtes hors ligne",
    chatOfflineDesc: "Votre message attend et part à la reconnexion.",
    chatTurnFailed: "Ce tour a échoué. Réessayez depuis votre brouillon gardé.",
    chatDeleted: "Supprimé.",
    chatUndo: "Annuler",
    chatRestored: "Restauré.",
    chatDeleteSession: "Supprimer cette vérification ?",
    chatDeleteFolder: "Supprimer ce dossier et ses vérifications ?",
    chatConfirmDelete: "Supprimer",
    chatCancel: "Annuler",
    chatRename: "Renommer",
    chatPin: "Épingler",
    chatUnpin: "Désépingler",
    chatTriesLeft: "essais restants aujourd'hui",

    // Modèles de mail (HTML riche + jumeau texte)
    mailVerifySubject: "Vérifiez votre compte CheckAm",
    mailVerifyHeadline: "Un clic et vos vérifications sont à vous",
    mailVerifyBody: "Confirmez cette boîte mail pour que votre historique et vos vérifications restent avec vous. Le lien vit 24 heures.",
    mailVerifyCta: "Vérifier ma boîte mail",
    mailResetSubject: "Réinitialisez votre mot de passe CheckAm",
    mailResetHeadline: "Retrouvez vos vérifications",
    mailResetBody: "Utilisez le lien sous 1 heure, ou saisissez le code sous 10 minutes. Ne partagez ni l'un ni l'autre.",
    mailResetCta: "Réinitialiser mon mot de passe",
    mailWelcomeSubject: "Bienvenue sur CheckAm — vérifiez avant de payer",
    mailWelcomeHeadline: "Votre première vérification prend trente secondes",
    mailWelcomeBody: "Collez un message suspect, déposez un flyer ou cherchez un numéro. Si quelqu'un vous demande de payer pour une validation CheckAm, c'est une arnaque en soi.",
    mailWelcomeCta: "Lancer ma première vérification",
    mailClosing: "L'équipe CheckAm — vérifiez avant de payer. Hotline ANTIC 8202, gratuit.",
  },
} as const;

export type TranslationKeys = keyof typeof translations.en;
export type TranslationDictionary = {
  [K in TranslationKeys]: string;
};
