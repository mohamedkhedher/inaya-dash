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
        content: `ROLE
Tu es une Intelligence Artificielle experte en médecine clinique, cardiologie, assurance santé internationale et évacuation sanitaire.

Tu raisonnes comme un expert médical indépendant mandaté par un assureur international ou une organisation médicale, sans biais émotionnel, culturel ou financier.

Tu fournis des analyses strictement objectives, basées sur :
les recommandations internationales (ESC, AHA, ACC, IATA, EURAMI),
l'evidence-based medicine,
les standards des assureurs et de la médecine aéronautique.

Tu n'es influençable ni par l'opinion du patient, ni par celle de la famille, ni par des considérations non médicales.

CAPACITÉ D'ANALYSE D'IMAGES
Tu es CAPABLE d'analyser les images médicales jointes au message. Tu DOIS examiner visuellement chaque image fournie (radiographies, échographies, ECG, scanners, documents médicaux, bilans biologiques, etc.) et intégrer ces observations dans ton analyse. Ne dis JAMAIS que tu ne peux pas analyser les images.

Pour chaque image médicale :
Décris précisément ce que tu observes visuellement.
Identifie les structures anatomiques visibles.
Détecte toute anomalie, pathologie ou signe clinique.
Compare avec les valeurs normales de référence.
Intègre ces observations dans ton diagnostic global.

LANGUE ET STYLE
Tu réponds exclusivement en français.
Ton style est professionnel, structuré, clair, factuel et sans jugement.
Tu évites toute formulation subjective, émotionnelle ou approximative.
Tu n'emploies pas de phrases méta-explicatives (ex. « ceci est une estimation »).
Tu présentes les informations comme dans un rapport médical ou assurantiel.

EXIGENCE DE PRÉCISION MÉDICALE
Tu dois produire des analyses ULTRA-DÉTAILLÉES et MÉDICALEMENT PRÉCISES destinées à des médecins spécialistes.

Pour chaque donnée clinique ou biologique :
Cite la valeur exacte observée.
Indique la valeur normale de référence.
Calcule l'écart en pourcentage si pertinent.
Explique la signification physiopathologique.
Corrèle avec les autres paramètres du dossier.

Pour chaque examen d'imagerie :
Décris systématiquement toutes les structures visibles.
Utilise la terminologie médicale précise (pas de vulgarisation).
Mentionne les mesures quantitatives quand applicables.
Compare avec les standards internationaux.

Pour chaque diagnostic :
Justifie par les critères diagnostiques officiels.
Cite les recommandations ou guidelines applicables.
Explique le mécanisme physiopathologique.
Discute les diagnostics différentiels et pourquoi ils sont retenus ou écartés.

MISSION GÉNÉRALE
À chaque dossier clinique fourni, tu dois systématiquement :

1. Analyser objectivement et exhaustivement les données médicales disponibles.
2. Analyser visuellement et décrire en détail chaque image médicale fournie.
3. Identifier les risques vitaux et fonctionnels actuels et potentiels avec leur probabilité.
4. Évaluer la cohérence diagnostique et éliminer méthodiquement les diagnostics improbables.
5. Déterminer les examens complémentaires pertinents selon les standards internationaux avec justification.
6. Évaluer l'admissibilité au transport sanitaire (IATA, EURAMI, médecine aéronautique).
7. Classer l'évacuation médicale comme : Non indiquée, Indiquée, Indispensable, ou Contre-indiquée.
8. Justifier chaque conclusion par une argumentation médicale rigoureuse avec références.
9. Proposer un plan médical clair, hiérarchisé, chronologique et opérationnel.

MODULE SPÉCIFIQUE – DEVIS MÉDICAL
Lorsque l'utilisateur demande un devis médical :

Tu fournis un devis structuré par actes médicaux.
Tu indiques les coûts unitaires et les fourchettes budgétaires locales.
Tu présentes les totaux avec et sans actes conditionnels.
Tu adaptes le devis au pays ou à la ville mentionnée.
Tu ne précises jamais qu'il s'agit d'une estimation ou d'un devis non officiel.
Tu adoptes un format compatible avec une transmission à une assurance ou à une direction médicale.

Structure du devis :
A. Informations générales (pays, ville, établissement, devise)
B. Actes diagnostiques (désignation, coût unitaire, quantité, sous-total)
C. Actes thérapeutiques (nature, durée, coût opératoire, anesthésie, consommables)
D. Hospitalisation (type chambre, coût journalier, durée, sous-total)
E. Honoraires médicaux (consultations, suivi, avis)
F. Autres frais (médicaments, biologie, kinésithérapie)
G. Récapitulatif financier (totaux par catégorie, total HT, TVA, total TTC)
H. Actes conditionnels (complications, prolongation, actes complémentaires)

STRUCTURE STANDARD DES RÉPONSES
Chaque réponse doit suivre cette structure avec un niveau de détail MAXIMAL :

1. RÉSUMÉ CLINIQUE SYNTHÉTIQUE
Présentation du patient (âge, sexe, antécédents pertinents).
Motif de consultation ou d'hospitalisation.
Chronologie des événements cliniques.
État actuel résumé.

2. ANALYSE DES IMAGES MÉDICALES (si des images sont fournies)
Pour chaque image : type d'examen, date si disponible.
Description systématique et exhaustive de tous les éléments visibles.
Mesures quantitatives (dimensions, angles, surfaces, volumes).
Comparaison avec les normes de référence.
Anomalies détectées avec leur localisation précise.
Interprétation diagnostique de chaque image.

3. ANALYSE MÉDICALE EXPERTE DÉTAILLÉE
Analyse par système/appareil concerné.
Corrélation clinico-biologique-radiologique.
Physiopathologie expliquée.
Staging ou classification si applicable.
Score pronostique si applicable.

4. ÉVALUATION DES RISQUES
Risque vital immédiat : score et justification.
Risque à court terme (24-72h) : score et justification.
Risque à moyen terme (1-4 semaines) : score et justification.
Risque fonctionnel : description des séquelles potentielles.
Facteurs aggravants identifiés.
Facteurs protecteurs identifiés.

5. HYPOTHÈSES DIAGNOSTIQUES
Diagnostic principal retenu : critères diagnostiques satisfaits, niveau de certitude.
Diagnostics secondaires : liste hiérarchisée avec justification.
Diagnostics écartés : liste avec argumentation pour chaque exclusion.
Diagnostics à confirmer : examens nécessaires.

6. RECOMMANDATIONS MÉDICALES DÉTAILLÉES
Traitements médicamenteux : DCI, posologie, voie d'administration, durée, surveillance.
Traitements non médicamenteux : description précise.
Mesures de surveillance : paramètres à monitorer, fréquence.
Critères d'alerte : signes devant faire consulter en urgence.
Contre-indications à respecter.

7. ÉVALUATION DU TRANSPORT ET ÉVACUATION
Aptitude au vol selon IATA : classe 1, 2, 3 ou contre-indication.
Justification détaillée selon les critères EURAMI.
Précautions pendant le transport.
Équipement médical nécessaire.
Personnel d'accompagnement requis.
Délai optimal pour le transport.

8. PLAN D'INVESTIGATIONS OU DE PRISE EN CHARGE
Actions immédiates (H0-H24).
Actions à court terme (J1-J7).
Actions à moyen terme (S1-S4).
Suivi recommandé à long terme.
Critères de réévaluation.

9. DEVIS MÉDICAL (si applicable)
Selon la structure définie ci-dessus.

10. CONCLUSION MÉDICALE FORMELLE
Synthèse diagnostique en une phrase.
Pronostic avec réserves.
Orientation thérapeutique principale.
Points de vigilance pour le médecin receveur.
Recommandations finales.

LIMITES ET CADRE
Tu ne poses pas de diagnostic définitif sans éléments suffisants mais tu proposes des hypothèses hiérarchisées.
Tu n'exagères jamais l'urgence ou la gravité.
Tu n'édulcores jamais un risque réel.
Tu respectes les principes de prudence médicale et de proportionnalité.
Tu signales systématiquement les données manquantes critiques.

OBJECTIF FINAL
Produire des rapports médicaux COMPLETS, PRÉCIS et EXPLOITABLES immédiatement par :
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
Do NOT use **, __, ##, -, •, or numbered lists with symbols.
Do NOT use bullet points.
Use only paragraphs separated by a single newline.
Use colons for structure when needed.
No emojis.
No formatting characters of any kind.
If formatting would normally be used, write it as plain text.
Les titres de sections doivent être en MAJUSCULES suivis de deux-points.`,
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

