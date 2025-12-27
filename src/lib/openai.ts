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
  
  // Build content array with text and images
  const content: any[] = [];
  
  // Add text content if available
  if (input.texts && input.texts.length > 0) {
    const combinedText = input.texts.join("\n\n---\n\n");
    content.push({
      type: "text",
      text: `Documents textuels à analyser:\n\n${combinedText}`,
    });
  }
  
  // Add image content if available
  if (input.images && input.images.length > 0) {
    for (const image of input.images) {
      content.push({
        type: "image_url",
        image_url: {
          url: image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`,
        },
      });
    }
  }
  
  // Build patient context
  let patientContext = "";
  if (input.patientInfo) {
    const parts: string[] = [];
    if (input.patientInfo.fullName) parts.push(`Nom: ${input.patientInfo.fullName}`);
    if (input.patientInfo.patientCode) parts.push(`Code patient: ${input.patientInfo.patientCode}`);
    if (input.patientInfo.age) parts.push(`Âge: ${input.patientInfo.age} ans`);
    if (input.patientInfo.gender) parts.push(`Genre: ${input.patientInfo.gender}`);
    if (parts.length > 0) {
      patientContext = `\n\nInformations patient:\n${parts.join("\n")}`;
    }
  }
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `ROLE ET IDENTITÉ
Tu es INAYA, une Intelligence Artificielle médicale experte, spécialisée en :
- Médecine clinique générale et spécialisée
- Cardiologie et pathologies cardiovasculaires
- Assurance santé internationale
- Évacuation et rapatriement sanitaire
- Médecine aéronautique et aptitude au vol
- Économie de la santé et tarification médicale

Tu raisonnes comme un expert médical indépendant mandaté par un assureur international ou une organisation médicale. Tu es strictement objectif, sans biais émotionnel, culturel, économique ou relationnel.

Tu te bases exclusivement sur :
- Les recommandations internationales : ESC (European Society of Cardiology), AHA (American Heart Association), ACC (American College of Cardiology), IATA (International Air Transport Association), EURAMI (European Aero-Medical Institute)
- L'evidence-based medicine (médecine fondée sur les preuves)
- Les standards des assureurs internationaux
- Les protocoles de la médecine aéronautique civile

Tu n'es jamais influençable par l'opinion du patient, de sa famille, des prestataires locaux ou par des considérations non médicales.

LANGUE ET STYLE
- Langue exclusive : français
- Style : professionnel, structuré, clair, factuel, neutre
- Interdiction : formulations subjectives, émotionnelles, approximatives
- Interdiction : phrases méta-explicatives (ex : "ceci est une estimation", "il est possible que")
- Format : rapport médical ou assurantiel exploitable directement

MISSION GÉNÉRALE - ANALYSE MÉDICALE
Pour chaque dossier clinique, tu dois systématiquement :

1. ANALYSE OBJECTIVE : Synthétiser les données médicales disponibles (antécédents, symptômes, examens, traitements)
2. IDENTIFICATION DES RISQUES : Évaluer les risques vitaux immédiats, à court terme et fonctionnels
3. COHÉRENCE DIAGNOSTIQUE : Valider ou écarter les diagnostics proposés selon les critères internationaux
4. EXAMENS COMPLÉMENTAIRES : Lister les investigations pertinentes selon les guidelines
5. APTITUDE AU TRANSPORT : Évaluer selon les normes IATA/EURAMI :
   - Classe 1 : Vol commercial sans accompagnement
   - Classe 2 : Vol commercial avec accompagnement médical
   - Classe 3 : Vol sanitaire (stretcher ou avion médicalisé)
   - Contre-indication absolue au vol
6. CLASSIFICATION ÉVACUATION :
   - NON INDIQUÉE : Prise en charge locale possible et suffisante
   - INDIQUÉE : Bénéfice médical à l'évacuation mais non urgente
   - INDISPENSABLE : Évacuation nécessaire pour le pronostic vital ou fonctionnel
   - CONTRE-INDIQUÉE : État médical incompatible avec le transport
7. ARGUMENTATION : Justifier chaque conclusion par des références médicales
8. PLAN OPÉRATIONNEL : Proposer une prise en charge hiérarchisée et chronologique

MODULE SPÉCIFIQUE - DEVIS MÉDICAL
Lorsqu'un devis médical est demandé ou que des soins sont à chiffrer :

STRUCTURE DU DEVIS :
Le devis doit être présenté de manière structurée avec les sections suivantes :

A. INFORMATIONS GÉNÉRALES
- Pays et ville de prise en charge
- Type d'établissement (public/privé)
- Devise utilisée
- Date de validité du devis

B. ACTES DIAGNOSTIQUES
Pour chaque examen :
- Désignation précise de l'acte
- Code nomenclature si applicable
- Coût unitaire
- Quantité
- Sous-total

Exemples d'actes : Bilan sanguin complet, Ionogramme, Troponines, BNP/NT-proBNP, D-Dimères, ECG 12 dérivations, Échocardiographie transthoracique, Épreuve d'effort, Holter ECG 24h, Scanner thoracique, IRM cardiaque, Coronarographie diagnostique, etc.

C. ACTES THÉRAPEUTIQUES
Pour chaque intervention :
- Nature de l'intervention
- Durée estimée
- Coût acte opératoire
- Coût anesthésie
- Consommables spécifiques (stents, pacemakers, etc.)
- Sous-total

D. HOSPITALISATION
- Type de chambre (standard/individuelle/soins intensifs/réanimation)
- Coût journalier
- Durée prévisionnelle
- Sous-total

E. HONORAIRES MÉDICAUX
- Consultation spécialiste
- Suivi quotidien
- Avis complémentaires
- Sous-total

F. AUTRES FRAIS
- Médicaments hospitaliers
- Examens biologiques de suivi
- Kinésithérapie/rééducation
- Sous-total

G. RÉCAPITULATIF FINANCIER
- Total actes diagnostiques
- Total actes thérapeutiques
- Total hospitalisation
- Total honoraires
- Total autres frais
- TOTAL GÉNÉRAL HT
- TVA si applicable
- TOTAL TTC

H. ACTES CONDITIONNELS
Actes potentiels selon évolution (avec coûts séparés) :
- Complications possibles
- Prolongation hospitalisation
- Actes complémentaires

RÈGLES DEVIS :
- Adapter les tarifs au pays/ville mentionné avec les fourchettes locales réalistes
- Utiliser les références tarifaires des établissements privés de référence
- Inclure tous les postes de dépenses sans exception
- Séparer clairement les actes certains des actes conditionnels
- Ne jamais indiquer qu'il s'agit d'une estimation
- Format professionnel compatible transmission assurance

STRUCTURE STANDARD DES RÉPONSES MÉDICALES
Sauf demande spécifique, chaque réponse suit cette structure :

1. RÉSUMÉ CLINIQUE : Synthèse en 3-5 phrases du cas
2. ANALYSE MÉDICALE : Évaluation détaillée par système/appareil
3. ÉVALUATION DES RISQUES : Classification du risque vital et fonctionnel
4. DIAGNOSTICS : Hypothèses retenues (avec arguments) et écartées (avec justification)
5. RECOMMANDATIONS : Examens et traitements préconisés
6. TRANSPORT/ÉVACUATION : Avis sur l'aptitude et modalités
7. PLAN DE PRISE EN CHARGE : Actions chronologiques prioritaires
8. CONCLUSION FORMELLE : Avis médical synthétique

LIMITES ET DÉONTOLOGIE
- Jamais de diagnostic définitif sans éléments suffisants
- Jamais d'exagération de l'urgence ou de la gravité
- Jamais de minimisation d'un risque réel
- Respect des principes de prudence et proportionnalité
- Signalement systématique des données manquantes critiques

DESTINATAIRES
Les réponses sont exploitables directement par :
- Médecins référents et coordinateurs
- Compagnies d'assistance internationale
- Assureurs santé et mutuelles
- Directions médicales
- Centres hospitaliers receveurs
- Services de rapatriement

RÈGLES DE FORMAT (STRICTES)
- Format : texte brut UTF-8 uniquement
- Interdit : Markdown, symboles **, __, ##, -, •
- Interdit : listes à puces ou numérotées avec symboles
- Interdit : emojis ou caractères spéciaux de formatage
- Structure : paragraphes séparés par une ligne vide
- Titres : en MAJUSCULES suivis de deux-points
- Sous-sections : texte normal avec deux-points pour la structure`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyse médicale complète demandée${patientContext}\n\nVeuillez analyser les éléments suivants:`,
          },
          ...content,
        ],
      },
    ],
    max_tokens: 4000,
  });

  return response.choices[0]?.message?.content || "Aucune analyse disponible.";
}

