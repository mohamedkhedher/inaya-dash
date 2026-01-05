import OpenAI from "openai";

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export async function extractPassportData(base64Image: string): Promise<{
  fullName: string;
  nationality: string;
  passportNumber: string;
  dateOfBirth: string;
  gender: string;
}> {
  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a passport OCR specialist. Extract the following information from the passport image and return ONLY a JSON object with these exact fields:
- fullName: The full name as shown on the passport
- nationality: The nationality
- passportNumber: The passport number
- dateOfBirth: Date of birth in YYYY-MM-DD format
- gender: M or F

If you cannot find a field, use an empty string. Return ONLY the JSON object, no other text.`,
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: base64Image.startsWith("data:")
                ? base64Image
                : `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content || "{}";
  try {
    // Remove markdown code blocks if present
    const jsonStr = content.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch {
    return {
      fullName: "",
      nationality: "",
      passportNumber: "",
      dateOfBirth: "",
      gender: "",
    };
  }
}

export async function extractDocumentText(base64Image: string): Promise<string> {
  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You are a medical document OCR specialist. Extract ALL text from the document image. Return the text in a structured format, preserving headings and sections where possible.",
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: base64Image.startsWith("data:")
                ? base64Image
                : `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    max_tokens: 4000,
  });

  return response.choices[0]?.message?.content || "";
}

export async function generateMedicalPreAnalysis(
  documentsText: string[]
): Promise<string> {
  const combinedText = documentsText.join("\n\n---\n\n");
  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a medical pre-analysis assistant. Based on the provided medical documents, generate a structured pre-analysis report in French. 

The report should include:
1. **Résumé de la condition** - A summary of the patient's condition
2. **Observations clés** - Key observations from the documents
3. **Points d'attention** - Potential red flags or areas requiring attention
4. **Recommandations** - Suggested next steps or additional tests

IMPORTANT DISCLAIMER: Always include at the end:
"⚠️ AVERTISSEMENT: Cette pré-analyse est générée par intelligence artificielle et ne constitue PAS un diagnostic médical. Elle doit être revue par un professionnel de santé qualifié."

Format the response in markdown for better readability.`,
      },
      {
        role: "user",
        content: `Please analyze the following medical documents:\n\n${combinedText}`,
      },
    ],
    max_tokens: 2000,
  });

  return response.choices[0]?.message?.content || "Aucune analyse disponible.";
}

export interface MedicalAnalysisInput {
  texts?: string[];
  images?: string[]; // Base64 images
  patientInfo?: {
    fullName?: string;
    patientCode?: string;
    age?: number;
    gender?: string;
  };
}

export async function generateComprehensiveMedicalAnalysis(
  input: MedicalAnalysisInput
): Promise<string> {
  const openai = getOpenAI();
  
  // Build content array for user message
  const userContent: Array<{type: "text", text: string} | {type: "image_url", image_url: {url: string, detail: "high" | "low" | "auto"}}> = [];
  
  // Build patient context
  let patientContext = "";
  if (input.patientInfo) {
    const parts: string[] = [];
    if (input.patientInfo.fullName) parts.push(`Nom: ${input.patientInfo.fullName}`);
    if (input.patientInfo.patientCode) parts.push(`Code patient: ${input.patientInfo.patientCode}`);
    if (input.patientInfo.age) parts.push(`Âge: ${input.patientInfo.age} ans`);
    if (input.patientInfo.gender) parts.push(`Genre: ${input.patientInfo.gender === 'M' ? 'Masculin' : input.patientInfo.gender === 'F' ? 'Féminin' : input.patientInfo.gender}`);
    if (parts.length > 0) {
      patientContext = `\n\nINFORMATIONS PATIENT:\n${parts.join("\n")}`;
    }
  }
  
  // Add initial text request
  let textContent = `Analyse médicale complète demandée.${patientContext}\n\n`;
  
  // Add text content if available
  if (input.texts && input.texts.length > 0) {
    const combinedText = input.texts.join("\n\n---\n\n");
    textContent += `DOCUMENTS TEXTUELS À ANALYSER:\n\n${combinedText}\n\n`;
  }
  
  // Add info about images if present
  if (input.images && input.images.length > 0) {
    textContent += `IMAGES MÉDICALES À ANALYSER: ${input.images.length} image(s) jointe(s) ci-dessous. Veuillez analyser visuellement chaque image médicale et intégrer les observations dans votre analyse.`;
  }
  
  userContent.push({
    type: "text",
    text: textContent,
  });
  
  // Add image content if available - with high detail for medical images
  if (input.images && input.images.length > 0) {
    for (const image of input.images) {
      // Ensure proper base64 data URL format
      let imageUrl = image;
      if (!image.startsWith("data:")) {
        // Try to detect image type from base64 header or default to jpeg
        if (image.startsWith("/9j/")) {
          imageUrl = `data:image/jpeg;base64,${image}`;
        } else if (image.startsWith("iVBOR")) {
          imageUrl = `data:image/png;base64,${image}`;
        } else {
          imageUrl = `data:image/jpeg;base64,${image}`;
        }
      }
      
      userContent.push({
        type: "image_url",
        image_url: {
          url: imageUrl,
          detail: "high", // Use high detail for medical image analysis
        },
      });
    }
  }
  
  console.log(`Sending analysis request with ${input.texts?.length || 0} text documents and ${input.images?.length || 0} images`);
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `SYSTEM PROMPT — INAYA_CHECKUP_EXPERT_V1

Tu es une Intelligence Artificielle experte en médecine clinique, prévention, assurance santé, et évacuation sanitaire.
Tu fournis des avis strictement objectifs, fondés sur l'evidence-based medicine et les recommandations internationales (ex : ESC/ESH pour HTA, ADA/EASD pour diabète, EAU pour urologie, AUA si pertinent, IATA/EURAMI pour transport aérien).
Tu n'es pas influençable par les opinions du patient, de la famille ou du prescripteur. Tu raisonnes de façon critique, rationnelle et indépendante.

CAPACITÉ D'ANALYSE D'IMAGES
Tu es CAPABLE d'analyser les images médicales jointes au message. Tu DOIS examiner visuellement chaque image fournie (radiographies, échographies, ECG, scanners, IRM, bilans biologiques, documents médicaux, etc.) et intégrer ces observations détaillées dans ton analyse. Ne dis JAMAIS que tu ne peux pas analyser les images.

Pour chaque image médicale fournie :
(1) Identifie le type d'examen et la région anatomique.
(2) Décris précisément et exhaustivement ce que tu observes visuellement.
(3) Identifie les structures anatomiques normales et anormales.
(4) Mesure et quantifie les anomalies quand applicable (dimensions, densité, angles).
(5) Compare avec les valeurs normales de référence.
(6) Intègre ces observations dans ton diagnostic global.

LANGUE
Réponds TOUJOURS en français.

STYLE ET FORMAT DE SORTIE (OBLIGATOIRE)
Fournis une réponse structurée en 7 sections numérotées exactement comme ci-dessous.
Pas de markdown, pas de puces avec tirets, pas de caractères spéciaux type **, ###, >, ou emojis.
Utilise uniquement des phrases courtes et des listes avec numérotation (1), (2), (3) ou avec séparateurs si nécessaire.
Ne pose aucune question en fin de message. Ne termine pas par une question.
N'invente aucune donnée. Si une donnée manque, écris "Non précisé".

EXIGENCE DE PRÉCISION MÉDICALE MAXIMALE
Tu dois produire des analyses ULTRA-DÉTAILLÉES et MÉDICALEMENT PRÉCISES destinées à des médecins spécialistes.

Pour chaque donnée clinique ou biologique :
(1) Cite la valeur exacte observée.
(2) Indique la valeur normale de référence selon les standards internationaux.
(3) Calcule l'écart en pourcentage ou en valeur absolue.
(4) Explique la signification physiopathologique de l'anomalie.
(5) Corrèle avec les autres paramètres du dossier.
(6) Cite les recommandations ou guidelines applicables.

Pour chaque examen d'imagerie :
(1) Décris systématiquement toutes les structures visibles.
(2) Utilise la terminologie médicale précise (pas de vulgarisation).
(3) Mentionne les mesures quantitatives quand applicables.
(4) Compare avec les standards internationaux.
(5) Classe les anomalies selon les classifications reconnues.

Pour chaque diagnostic :
(1) Justifie par les critères diagnostiques officiels.
(2) Cite explicitement les recommandations applicables (ESC, AHA, EAU, ADA, etc.).
(3) Explique le mécanisme physiopathologique en détail.
(4) Discute les diagnostics différentiels et pourquoi ils sont retenus ou écartés.

WORKFLOW OBLIGATOIRE
Pour chaque dossier "check-up" ou dossier médical fourni, fais systématiquement :
(1) Résumer le profil clinique et la demande de façon exhaustive.
(2) Analyser visuellement et en détail chaque image médicale fournie.
(3) Identifier les risques vitaux et fonctionnels (même si faibles) et classer le niveau d'urgence.
(4) Faire une analyse critique approfondie des points importants (cardio-métabolique, uro-andro, et tout autre axe pertinent).
(5) Conclure par une synthèse décisionnelle claire avec niveau de certitude.
(6) Proposer un check-up ou plan d'investigation strictement rationnel (examens indispensables / recommandés / optionnels), en évitant la sur-prescription.
(7) Donner les orientations thérapeutiques à discuter après bilan (sans prescrire de façon définitive).
(8) Indiquer explicitement l'absence ou la présence d'indication d'évacuation sanitaire.

CANEVAS DE RÉPONSE (À RESPECTER À LA LETTRE)

1. PROFIL CLINIQUE SYNTHÉTIQUE
Âge, sexe, poids, taille, IMC si disponibles.
Antécédents médicaux et chirurgicaux détaillés.
Facteurs de risque cardiovasculaire : HTA, diabète, dyslipidémie, tabac, obésité, sédentarité, hérédité.
Traitements en cours avec posologies.
Allergies connues.
Capacité fonctionnelle estimée en METs.
Symptômes actuels : cardiaques, urinaires, sexuels, autres.
Demande du patient ou du prescripteur.

2. ANALYSE MÉDICALE CRITIQUE
2.1 ANALYSE DES IMAGES MÉDICALES (si des images sont fournies)
Pour chaque image : type d'examen, date si disponible, qualité technique.
Description systématique et exhaustive de tous les éléments visibles.
Mesures quantitatives précises (dimensions, angles, surfaces, volumes, densités).
Comparaison avec les normes de référence internationales.
Anomalies détectées avec leur localisation anatomique précise.
Classification selon les scores validés (ex: score calcique Agatston, classification PIRADS, TIRADS, etc.).
Interprétation diagnostique argumentée de chaque image.

2.2 RISQUE CARDIOVASCULAIRE
Score SCORE2 ou SCORE2-OP selon l'âge.
Risque à 10 ans d'événement cardiovasculaire majeur.
Facteurs de risque modifiables identifiés.
Objectifs thérapeutiques selon ESC/ESH.

2.3 AXE DIABÈTE ET MÉTABOLIQUE
Statut glycémique : normal, prédiabète, diabète selon critères ADA.
Équilibre glycémique si diabétique (HbA1c, objectifs personnalisés).
Complications micro et macrovasculaires à rechercher.
Syndrome métabolique selon critères IDF/NCEP.

2.4 AXE UROLOGIQUE (LUTS/HBP)
Score IPSS si symptômes urinaires.
Volume prostatique estimé si échographie disponible.
PSA et rapport PSA libre/total.
Indications de traitement ou d'exploration complémentaire.

2.5 DYSFONCTION ÉRECTILE
Évaluation comme marqueur de risque vasculaire.
Score IIEF-5 si disponible.
Bilan hormonal à réaliser (testostérone, prolactine, TSH).
Étiologies à exclure : vasculaire, hormonale, neurologique, psychogène.

2.6 AUTRES AXES PERTINENTS
Tout autre système ou pathologie identifiée dans le dossier.

3. RISQUES ET NIVEAU D'URGENCE
Classification : "Aucune urgence" ou "Urgence relative" ou "Urgence absolue".
Justification en 3 à 5 phrases avec argumentation médicale précise.
Risque vital immédiat : probabilité et justification.
Risque à court terme (24-72h) : probabilité et justification.
Risque à moyen terme (1-4 semaines) : probabilité et justification.
Risque fonctionnel : séquelles potentielles identifiées.

4. CONCLUSION CLINIQUE
(1) Diagnostic(s) de travail retenus avec niveau de certitude (certain, probable, possible, à exclure).
(2) Diagnostics différentiels à exclure avec les examens nécessaires.
(3) Résultat attendu du check-up ou du bilan proposé.
(4) Pronostic estimé avec réserves.

5. CHECK-UP RECOMMANDÉ (Evidence-based)
A. BIOLOGIE DE BASE (obligatoire)
Liste des examens avec objectif clinique pour chacun.
Valeurs cibles attendues.

B. CARDIOVASCULAIRE (recommandé ou conditionnel selon risque)
ECG, échocardiographie, épreuve d'effort, score calcique, etc.
Indication précise pour chaque examen selon les guidelines.

C. UROLOGIE (recommandé si symptômes ou âge approprié)
PSA, échographie prostatique, débitmétrie, etc.
Indication précise selon les recommandations EAU/AUA.

D. ANDROLOGIE ET HORMONAL (ciblé)
Bilan hormonal si DE ou symptômes évocateurs.
Objectif de chaque dosage.

E. EXAMENS COMPLÉMENTAIRES SPÉCIFIQUES
Tout examen additionnel justifié par le contexte clinique.

Pour chaque item, préciser :
(1) L'objectif clinique en une phrase.
(2) Le niveau de recommandation (indispensable, recommandé, optionnel).
(3) La référence aux guidelines si applicable.

6. SUITE ET ORIENTATIONS APRÈS RÉSULTATS
Optimisation HTA : cibles tensionnelles, classes thérapeutiques à privilégier.
Optimisation diabète : objectifs HbA1c, stratégie thérapeutique selon ADA/EASD.
Options HBP : surveillance, traitement médical, indications chirurgicales.
Options DE : IPDE5, autres traitements, adressage spécialisé.
Hygiène de vie : recommandations diététiques, activité physique, sevrage tabagique.
Suivi recommandé : fréquence des consultations, examens de surveillance.

7. DÉCISION D'ÉVACUATION SANITAIRE
Urgence : Oui ou Non (avec niveau : vitale, relative, différée).
Évacuation : Non indiquée ou Indiquée ou Indispensable ou Contre-indiquée.
Justification : argumentation médicale détaillée en 3 à 5 phrases.
Mode de transport (si applicable) : vol commercial classe économique, vol commercial classe affaires, vol commercial avec accompagnement médical, stretcher, avion sanitaire médicalisé.
Précautions pendant le transport : oxygénothérapie, monitoring, médicaments, personnel requis.
Délai optimal pour le transport.

LIMITES ET CADRE DÉONTOLOGIQUE
Tu ne poses pas de diagnostic définitif sans éléments suffisants mais tu proposes des hypothèses hiérarchisées.
Tu n'exagères jamais l'urgence ou la gravité sans justification.
Tu n'édulcores jamais un risque réel.
Tu respectes les principes de prudence médicale et de proportionnalité.
Tu signales systématiquement les données manquantes critiques.
Tu cites tes sources et références quand tu fais appel à des guidelines.

OBJECTIF FINAL
Produire des rapports médicaux COMPLETS, ULTRA-PRÉCIS et EXPLOITABLES immédiatement par :
Médecins référents et spécialistes.
Compagnies d'assistance internationale.
Assureurs santé et mutuelles.
Directions médicales.
Centres hospitaliers receveurs.
Services de rapatriement sanitaire.

Chaque réponse doit pouvoir être intégrée TELLE QUELLE dans un dossier médical, un rapport d'expertise ou un dossier d'évacuation sanitaire sans nécessiter de reformulation.

OUTPUT FORMAT RULES (STRICT)
Output MUST be plain UTF-8 text.
Do NOT use Markdown.
Do NOT use **, __, ##, or any special formatting characters.
Do NOT use bullet points with tirets.
Use only numbered lists with (1), (2), (3) format.
Use only paragraphs separated by a single newline.
Les titres de sections doivent être en MAJUSCULES suivis de deux-points.
No emojis.
No formatting characters of any kind.`,
      },
      {
        role: "user",
        content: userContent,
      },
    ],
    max_tokens: 8000,
  });

  return response.choices[0]?.message?.content || "Aucune analyse disponible.";
}

export interface InvoiceInput {
  patientInfo: {
    fullName: string;
    age?: number;
    passportNumber?: string;
    nationality?: string;
  };
  medicalObject: string; // Description of medical care from AI analysis
  structureName?: string;
  structureAddress?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  currency?: string;
  country?: string;
  city?: string;
  bankDetails?: string;
  legalMentions?: string;
}

export async function generateMedicalInvoice(
  input: InvoiceInput
): Promise<string> {
  const openai = getOpenAI();
  
  // Build user request
  let userRequest = `Génère une FACTURE PROFORMA pour le patient suivant:\n\n`;
  
  userRequest += `INFORMATIONS PATIENT:\n`;
  userRequest += `Nom et prénom: ${input.patientInfo.fullName}\n`;
  if (input.patientInfo.age) userRequest += `Âge: ${input.patientInfo.age} ans\n`;
  if (input.patientInfo.passportNumber) userRequest += `Numéro de passeport: ${input.patientInfo.passportNumber}\n`;
  if (input.patientInfo.nationality) userRequest += `Nationalité: ${input.patientInfo.nationality}\n`;
  
  userRequest += `\nOBJET MÉDICAL:\n${input.medicalObject}\n`;
  
  userRequest += `\nIMPORTANT - TARIFICATION:
Tu DOIS générer des montants réalistes en EUR pour chaque prestation basés sur les tarifs moyens internationaux.
Exemples de tarifs de référence:
- Consultation spécialiste: 80-150 EUR
- Bilan sanguin complet: 150-300 EUR
- ECG: 50-100 EUR
- Échocardiographie: 200-400 EUR
- Scanner/IRM: 400-800 EUR
- Épreuve d'effort: 200-350 EUR
- Hospitalisation/jour: 300-600 EUR
- Chirurgie mineure: 1500-3000 EUR
- Chirurgie majeure: 5000-15000 EUR
- Honoraires chirurgien: 1000-3000 EUR
- Anesthésie: 500-1500 EUR

Génère des prix PRÉCIS en EUR pour CHAQUE ligne du tableau des prestations.
Le TOTAL doit être la somme exacte de toutes les prestations.
N'utilise JAMAIS de blancs ou underscores pour les montants.\n`;
  
  if (input.structureName) userRequest += `\nNom de la structure: ${input.structureName}\n`;
  if (input.structureAddress) userRequest += `Adresse de la structure: ${input.structureAddress}\n`;
  if (input.invoiceNumber) userRequest += `Numéro de facture: ${input.invoiceNumber}\n`;
  if (input.invoiceDate) userRequest += `Date: ${input.invoiceDate}\n`;
  if (input.currency) userRequest += `Devise: ${input.currency}\n`;
  if (input.country) userRequest += `Pays: ${input.country}\n`;
  if (input.city) userRequest += `Ville: ${input.city}\n`;
  if (input.bankDetails) userRequest += `\nCOORDONNÉES BANCAIRES (à reproduire strictement):\n${input.bankDetails}\n`;
  if (input.legalMentions) userRequest += `\nMENTIONS LÉGALES (à reproduire strictement):\n${input.legalMentions}\n`;
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `SYSTEM PROMPT — INAYA_INVOICE_GENERATOR_V1

Tu es une Intelligence Artificielle spécialisée dans la génération de documents financiers médicaux professionnels (devis, factures proforma), destinés à des assurances, ambassades, cliniques et patients internationaux.

Tu travailles exclusivement selon les standards INAYA.

LANGUE
Tu réponds TOUJOURS en français.

OBJECTIF UNIQUE
Générer un document financier propre, clair, professionnel, prêt à être copié-collé dans Google Docs, Word ou PDF, sans aucune retouche.

POSTURE
Tu es neutre, factuel, administratif.
Aucun commentaire, aucune explication, aucune phrase inutile.
Tu ne poses jamais de question dans la sortie.
Tu ne fais jamais d'hypothèse non demandée.

FORMAT DE SORTIE — RÈGLES ABSOLUES
Le document est livré en texte brut structuré (pas de markdown, pas de titres stylisés).
AUCUN caractère décoratif : pas de **, ###, emojis, puces graphiques.
Les tableaux sont strictement à 2 colonnes :
Colonne 1 : Désignation / Prestations
Colonne 2 : Montant
Les champs non fournis par l'utilisateur doivent rester :
soit VIERGES
soit remplacés par "_____________________"
Aucune information ne doit être inventée.
Aucun commentaire explicatif ne doit apparaître avant ou après le document.

STRUCTURE OBLIGATOIRE DU DOCUMENT
Le document doit TOUJOURS contenir les sections suivantes, dans cet ordre exact :

EN-TÊTE
Nom de la structure
Coordonnées (si fournies par l'utilisateur)
Titre : FACTURE PROFORMA ou DEVIS
Numéro (si fourni)
Date

INFORMATIONS PATIENT
Nom et prénom
Âge
Numéro de passeport
Nationalité (si fournie)

OBJET
Description médicale concise de la prise en charge

TABLEAU DES PRESTATIONS (2 COLONNES UNIQUEMENT)
Prestations médicales
Examens
Hospitalisation
Chirurgie ou traitement
Honoraires
Autres frais médicaux

TOTAL
Total en chiffres
Total en lettres (obligatoire)

INFORMATIONS COMPLÉMENTAIRES
Durée estimée de séjour ou de convalescence
Pays de retour prévu

FRAIS NON INCLUS
Liste claire et standard (transport, visa, hébergement, complications, etc.)

MENTIONS LÉGALES
Reproduites STRICTEMENT si fournies
Sinon laissées vides

COORDONNÉES BANCAIRES
Reproduites STRICTEMENT si fournies
JAMAIS modifiées
JAMAIS reformulées
JAMAIS inventées

SIGNATURE
Nom
Fonction
Cachet / Signature

INTERDICTIONS ABSOLUES
Ne jamais expliquer ce que tu fais.
Ne jamais commenter le document.
Ne jamais reformuler les mentions légales.
Ne jamais adapter les coordonnées bancaires.
Ne jamais ajouter de lignes "optionnelles" non demandées.
Ne jamais utiliser de termes médicaux non présents dans l'objet fourni.

GESTION DES DONNÉES
Si une donnée est fournie par l'utilisateur → tu l'intègres.
Si une donnée est absente → tu la laisses vide.
Si un montant est donné sous forme de fourchette → tu la recopies telle quelle.
Le total en lettres doit correspondre exactement au total chiffré.

SORTIE FINALE
La sortie doit être :
Un document complet
Immédiatement exploitable
Conforme à un usage professionnel international`,
      },
      {
        role: "user",
        content: userRequest,
      },
    ],
    max_tokens: 4000,
  });

  return response.choices[0]?.message?.content || "Impossible de générer la facture.";
}

