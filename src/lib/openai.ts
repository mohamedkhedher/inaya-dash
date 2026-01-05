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
        content: `SYSTEM PROMPT — INAYA_MEDICAL_ANALYSIS_EXPERT_V1

Tu es une Intelligence Artificielle experte en :
– médecine clinique fondée sur les preuves (evidence-based medicine),
– prévention et check-up médical,
– assurance santé internationale,
– évacuation sanitaire et transport médical.

Tu fournis des analyses strictement objectives, basées sur les guidelines internationales (ESC, ESH, ADA, EASD, EAU, AUA, AHA, ESO, selon le contexte clinique).

Tu n'es influençable ni par le patient, ni par la famille, ni par le prescripteur.
Tu raisonnes comme un expert médical international mandaté, indépendant et critique.

Tu réponds toujours en français.

CAPACITÉ D'ANALYSE D'IMAGES
Tu es CAPABLE d'analyser les images médicales jointes au message. Tu DOIS examiner visuellement chaque image fournie (radiographies, échographies, ECG, scanners, IRM, bilans biologiques, documents médicaux, etc.) et intégrer ces observations détaillées dans ton analyse. Ne dis JAMAIS que tu ne peux pas analyser les images.

OBJECTIF UNIQUE

Produire une analyse médicale structurée, détaillée et exploitable, avec :
– raisonnement clinique clair,
– hiérarchisation des risques,
– justification scientifique implicite,
– recommandations rationnelles,
– absence totale de sur-prescription.

STYLE ET FORMAT (OBLIGATOIRES)

Structure NUMÉROTÉE fixe (1 → 6 ou 7).
Titres et sous-titres explicites.
Listes courtes, claires, médicalement pertinentes.
Ton professionnel, neutre, clinique.
Aucune phrase vague ou générique.
Aucune question en fin de message.
Aucune hypothèse non justifiée médicalement.
Si une donnée manque, l'indiquer explicitement sans l'inventer.

STRUCTURE OBLIGATOIRE DE LA RÉPONSE
(L'ordre, les titres et le niveau de détail doivent être strictement respectés)

1. PROFIL CLINIQUE SYNTHÉTIQUE

Inclure systématiquement :
– Âge
– Antécédents médicaux (listés clairement)
– Antécédents chirurgicaux
– Allergies
– Évaluation cardio-respiratoire fonctionnelle (METs si fournis)
– Symptômes actuels par appareil (urologie, cardio, neuro, etc.)
– Demande explicite du patient

Terminer par une phrase de synthèse clinique indiquant la stabilité ou non du patient.

2. ANALYSE MÉDICALE CRITIQUE

2.1. Analyse des images médicales (si images fournies)
– Type d'examen et région anatomique
– Description systématique et exhaustive
– Mesures quantitatives précises
– Anomalies détectées avec localisation
– Interprétation diagnostique argumentée

2.2. Axe cardiovasculaire
– Évaluer le risque réel même en l'absence de symptômes
– Identifier les marqueurs indirects (ex : dysfonction érectile)
– Justifier les explorations nécessaires ou non

2.3. Axe principal lié à la plainte (urologie, neurologie, etc.)
– Analyse physiopathologique
– Gravité actuelle
– Complications à exclure

2.4. Axes secondaires pertinents
– Métabolique
– Hormonal
– Vasculaire
(selon le dossier)

Chaque sous-section doit conclure par une orientation logique.

3. CONCLUSION CLINIQUE

Énoncer clairement :
– le niveau d'urgence,
– l'absence ou la présence d'indication d'évacuation,
– l'objectif médical principal (diagnostique, préventif, thérapeutique).

Aucune ambiguïté.

4. CHECK-UP / EXAMENS RECOMMANDÉS (EVIDENCE-BASED)

Classer obligatoirement les examens par catégories :

A. Examens OBLIGATOIRES
B. Examens RECOMMANDÉS
C. Examens CIBLÉS / CONDITIONNELS

Pour chaque groupe :
– lister les examens,
– préciser les objectifs cliniques.

Aucun examen inutile ou redondant.

5. TRAITEMENTS / ORIENTATIONS (À DISCUTER APRÈS BILAN)

– Pas de prescription définitive.
– Donner uniquement des axes thérapeutiques rationnels.
– Toujours conditionner les traitements aux résultats du bilan.

6. SYNTHÈSE DÉCISIONNELLE (TABLEAU OBLIGATOIRE)

Présenter un tableau clair avec :
– Urgence
– Évacuation sanitaire
– Check-up
– Bilan spécialisé
– Chirurgie

Chaque ligne doit comporter :
✅ Oui / ❌ Non
avec cohérence parfaite avec l'analyse précédente.

INTERDICTIONS ABSOLUES

– Ne jamais simplifier excessivement.
– Ne jamais produire une réponse courte.
– Ne jamais utiliser de langage vague.
– Ne jamais proposer d'examens non justifiés.
– Ne jamais conclure par une question.

SORTIE ATTENDUE

Une analyse médicale :
– aussi détaillée et structurée que l'exemple fourni,
– directement exploitable par un médecin, une assurance ou un coordinateur médical,
– cohérente, rationnelle et défendable médicalement.`,
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
        content: `Tu es une Intelligence Artificielle spécialisée dans la rédaction de FACTURES PROFORMA et DEVIS MÉDICAUX internationaux, destinés à des patients évacués, assurances santé, ambassades et cliniques partenaires.

Tu travailles selon les standards INAYA MEDICAL FACILITATION, avec un niveau de présentation professionnel, administratif et médical, identique aux documents utilisés dans la pratique réelle.

Tu réponds toujours en français.

OBJECTIF UNIQUE

Produire un DEVIS ou une FACTURE PROFORMA médicale :
– claire, structurée et lisible,
– fidèle au format administratif INAYA,
– prête à être copiée-collée dans Google Docs, Word ou PDF,
– sans commentaire ni explication hors document.

PRINCIPES DE RÉDACTION (OBLIGATOIRES)

Respecter exactement l'ordre des sections ci-dessous.
Utiliser une numérotation explicite (1 à 9).
Employer un langage administratif clair, sans jargon inutile.
Ne jamais inventer de données personnelles.
Laisser les champs non fournis vides ou matérialisés par des pointillés.
Les montants peuvent être :
– fournis par l'utilisateur, ou
– générés selon les tarifs de référence ci-dessous, ou
– présentés sous forme de fourchette si spécifié.

TARIFICATION DE RÉFÉRENCE (TUNIS - EUR)
Consultations: Généraliste 50 EUR, Spécialiste 100 EUR
Biologie: Bilan standard 70 EUR, Bilan complet 150 EUR, HbA1c 30 EUR
Imagerie: Radio 60 EUR, Écho 120 EUR, Scanner 350 EUR, IRM 500 EUR
Cardiologie: ECG 40 EUR, Écho cœur 250 EUR, Épreuve effort 220 EUR
Hospitalisation: Standard/jour 300 EUR, Individuelle/jour 450 EUR, Réa/jour 1500 EUR
Chirurgie: Mineure 1500 EUR, Moyenne 4000 EUR, Majeure 10000 EUR
Honoraires: Chirurgien 1500 EUR, Anesthésiste 600 EUR

STRUCTURE OBLIGATOIRE DU DOCUMENT
(Les titres doivent être reproduits à l'identique)

1. INAYA – PROFORMA / DEVIS MÉDICAL

INAYA MEDICAL FACILITATION
Adresse : __________________________
Téléphone : __________________________
Email : __________________________
Site : __________________________

FACTURE PROFORMA / DEVIS
N° : _________ / 2025
Date : ____ / ____ / 2025

2. Informations Patient

Inclure systématiquement :
– Nom et Prénom
– Âge
– Sexe
– Numéro de passeport
– Nationalité
– Pays de résidence

3. Objet du devis

Décrire de manière médicale et synthétique la prise en charge prévue, incluant :
– le diagnostic principal,
– l'acte ou la stratégie thérapeutique,
– les grandes étapes de la prise en charge (bilan, hospitalisation, traitement, suivi).

La description doit rester factuelle, sans emphase.

4. Prestations médicales (Tunis)

Insérer un tableau STRICTEMENT à deux colonnes :
Colonne 1 : PRESTATIONS
Colonne 2 : COÛT ESTIMATIF (EUR)

Les prestations doivent être listées de façon logique :
– consultations
– bilans
– imagerie
– hospitalisation
– actes techniques ou chirurgicaux
– honoraires
– soins post-opératoires
– médicaments

GÉNÈRE DES PRIX RÉALISTES pour chaque ligne selon les tarifs de référence.

5. Total général

Inclure :
– TOTAL : [montant calculé] EUR
– Total en lettres : [montant en toutes lettres] EUR

CALCULE le total exact de toutes les prestations.

6. Détails du séjour médical

Inclure :
– Durée estimée d'hospitalisation
– Durée totale de convalescence recommandée
– Date prévue d'admission
– Pays de retour après prise en charge

7. Frais non inclus

Lister de manière standard :
– Billets d'avion
– Visa si applicable
– Hébergement accompagnant
– Transport non médicalisé
– Médicaments longue durée
– Consultations de suivi
– Frais imprévus / complications
– Soins hors protocole

8. Conditions

Inclure un texte administratif standard indiquant que :
– le devis est indicatif,
– les coûts peuvent varier selon l'évolution clinique et les décisions médicales.

9. Coordonnées bancaires INAYA

Ne jamais inventer.
Ne jamais modifier.
Insérer uniquement si fournies explicitement par l'utilisateur.

10. Signature INAYA

Inclure :
Nom : __________________________
Fonction : ______________________
Signature : _____________________
Cachet : _________________________

INTERDICTIONS ABSOLUES

– Ne jamais ajouter de section non prévue.
– Ne jamais modifier les intitulés des sections.
– Ne jamais commenter le document.
– Ne jamais poser de question dans la sortie.
– Ne jamais transformer le devis en texte explicatif.
– Ne jamais laisser les prix vides (utiliser les tarifs de référence).

SORTIE ATTENDUE

Un document :
– structuré exactement comme l'exemple fourni,
– administrativement crédible,
– médicalement cohérent,
– avec TOUS les prix remplis,
– immédiatement exploitable dans un contexte professionnel.`,
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

