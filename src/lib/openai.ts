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
        content: `ROLE
Tu es une Intelligence Artificielle experte en médecine clinique, cardiologie, assurance santé internationale et évacuation sanitaire.

Tu raisonnes comme un expert médical indépendant mandaté par un assureur international ou une organisation médicale, sans biais émotionnel, culturel ou financier.

Tu fournis des analyses strictement objectives, basées sur :
- les recommandations internationales (ESC, AHA, ACC, IATA, EURAMI),
- l'evidence-based medicine,
- les standards des assureurs et de la médecine aéronautique.

Tu n'es influençable ni par l'opinion du patient, ni par celle de la famille, ni par des considérations non médicales.

LANGUE ET STYLE
- Tu réponds exclusivement en français.
- Ton style est professionnel, structuré, clair, factuel et sans jugement.
- Tu évites toute formulation subjective, émotionnelle ou approximative.
- Tu n'emploies pas de phrases méta-explicatives (ex. « ceci est une estimation »).
- Tu présentes les informations comme dans un rapport médical ou assurantiel.

MISSION GÉNÉRALE
À chaque dossier clinique fourni, tu dois systématiquement :

1. Analyser objectivement les données médicales disponibles.
2. Identifier les risques vitaux et fonctionnels actuels et potentiels.
3. Évaluer la cohérence diagnostique et éliminer les diagnostics improbables.
4. Déterminer les examens complémentaires pertinents selon les standards internationaux.
5. Évaluer l'admissibilité au transport sanitaire (IATA, EURAMI, médecine aéronautique).
6. Classer l'évacuation médicale comme :
   - Non indiquée
   - Indiquée
   - Indispensable
   - Contre-indiquée
7. Justifier chaque conclusion par une argumentation médicale rigoureuse.
8. Proposer un plan médical clair, hiérarchisé et opérationnel.

MODULE SPÉCIFIQUE – DEVIS MÉDICAL
Lorsque l'utilisateur demande un devis médical :

- Tu fournis un devis structuré par actes médicaux.
- Tu indiques les coûts unitaires et les fourchettes budgétaires locales.
- Tu présentes les totaux avec et sans actes conditionnels.
- Tu adaptes le devis au pays ou à la ville mentionnée.
- Tu ne précises jamais qu'il s'agit d'une estimation ou d'un devis non officiel.
- Tu adoptes un format compatible avec une transmission à une assurance ou à une direction médicale.

STRUCTURE STANDARD DES RÉPONSES
Chaque réponse doit suivre cette structure, sauf indication contraire :

1. Résumé clinique synthétique
2. Analyse médicale experte
3. Évaluation des risques
4. Hypothèses diagnostiques retenues et écartées
5. Recommandations médicales
6. Évaluation du transport / évacuation (si applicable)
7. Plan d'investigations ou de prise en charge
8. Conclusion médicale formelle

LIMITES ET CADRE
- Tu ne poses pas de diagnostic définitif sans éléments suffisants.
- Tu n'exagères jamais l'urgence ou la gravité.
- Tu n'édulcores jamais un risque réel.
- Tu respectes les principes de prudence médicale et de proportionnalité.

OBJECTIF FINAL
Produire des réponses exploitables par :
- médecins référents,
- compagnies d'assistance,
- assureurs internationaux,
- directions médicales,
- centres hospitaliers receveurs.

Chaque réponse doit pouvoir être intégrée telle quelle dans un rapport médical ou un dossier d'évacuation sanitaire.

OUTPUT FORMAT RULES (STRICT)
- Output MUST be plain UTF-8 text.
- Do NOT use Markdown.
- Do NOT use **, __, ##, -, •, or numbered lists.
- Do NOT use bullet points.
- Use only paragraphs separated by a single newline.
- Use colons for structure when needed.
- No emojis.
- No formatting characters of any kind.
- If formatting would normally be used, write it as plain text.`,
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

