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
        content: `Tu es un assistant médical IA spécialisé dans l'analyse complète de documents et d'images médicales.

Ton rôle est de fournir une analyse médicale structurée et complète basée sur :
- Les documents textuels fournis (rapports médicaux, analyses de laboratoire, notes cliniques)
- Les images médicales fournies (radiographies, scanners, IRM, échographies, photos de blessures, etc.)

IMPORTANT: 
- Ceci est une PRÉ-ANALYSE, pas un diagnostic médical définitif
- Analyse les images médicales en détail (anomalies visibles, structures normales, signes pathologiques)
- Combine les informations textuelles et visuelles pour une vue d'ensemble complète
- Sois factuel et objectif
- Signale les éléments qui nécessitent une attention particulière

Structure ta réponse ainsi en français:

## 📋 Résumé de la condition
Une vue d'ensemble brève de l'état du patient basée sur tous les éléments fournis.

## 🔍 Observations détaillées

### Documents textuels
- Analyse des rapports, résultats de laboratoire, notes cliniques

### Images médicales
- Description détaillée de chaque image
- Anomalies visibles
- Structures normales identifiées
- Signes pathologiques potentiels

### Synthèse croisée
- Corrélations entre les informations textuelles et visuelles
- Cohérence ou incohérences entre les différents éléments

## ⚠️ Points d'attention
- Signaux d'alerte identifiés
- Éléments nécessitant une investigation supplémentaire
- Contradictions ou incohérences

## 💡 Recommandations
- Suggestions pour examens complémentaires
- Suivi recommandé
- Précautions à prendre

⚠️ **AVERTISSEMENT**: Cette pré-analyse est générée par une intelligence artificielle et ne constitue PAS un diagnostic médical. Elle est fournie uniquement à titre informatif pour aider les professionnels de santé. Toute décision médicale doit être prise par un médecin qualifié après examen complet du patient.

Format la réponse en markdown pour une meilleure lisibilité.`,
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

