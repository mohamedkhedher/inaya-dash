import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { caseId } = await request.json();

    if (!caseId) {
      return NextResponse.json(
        { error: "L'ID du dossier est requis" },
        { status: 400 }
      );
    }

    // Get case with documents
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        patient: true,
        documents: true,
      },
    });

    if (!caseData) {
      return NextResponse.json(
        { error: "Dossier non trouvé" },
        { status: 404 }
      );
    }

    // Collect all extracted text from documents
    const documentTexts = caseData.documents
      .filter((doc) => doc.extractedText)
      .map((doc) => `--- Document: ${doc.fileName} ---\n${doc.extractedText}`)
      .join("\n\n");

    if (!documentTexts) {
      return NextResponse.json(
        { error: "Aucun texte extrait des documents" },
        { status: 400 }
      );
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Tu es un assistant médical IA spécialisé dans la pré-analyse de documents médicaux.
          
Ton rôle est de fournir une synthèse structurée des documents médicaux pour aider les professionnels de santé.

IMPORTANT: 
- Ceci est une PRÉ-ANALYSE, pas un diagnostic
- Toujours inclure un avertissement que ceci ne remplace pas l'avis d'un médecin
- Être factuel et objectif
- Signaler les éléments qui pourraient nécessiter une attention particulière

Structure ta réponse ainsi:
1. **Résumé** - Vue d'ensemble brève
2. **Observations clés** - Points importants identifiés
3. **Éléments à surveiller** - Signaux d'alerte potentiels
4. **Recommandations** - Suggestions pour le suivi

Réponds en français.`,
        },
        {
          role: "user",
          content: `Patient: ${caseData.patient.fullName}
Code Patient: ${caseData.patient.patientCode}

Documents médicaux à analyser:

${documentTexts}`,
        },
      ],
      max_tokens: 2000,
    });

    const analysis = response.choices[0]?.message?.content || "";

    // Add disclaimer
    const fullAnalysis = `${analysis}

---
⚠️ **AVERTISSEMENT**: Cette pré-analyse est générée par une intelligence artificielle et ne constitue PAS un diagnostic médical. Elle est fournie uniquement à titre informatif pour aider les professionnels de santé. Toute décision médicale doit être prise par un médecin qualifié après examen complet du patient.`;

    // Update case with analysis
    await prisma.case.update({
      where: { id: caseId },
      data: {
        aiPreAnalysis: fullAnalysis,
        status: "ANALYZED",
      },
    });

    return NextResponse.json({
      success: true,
      analysis: fullAnalysis,
    });
  } catch (error) {
    console.error("Analysis Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'analyse" },
      { status: 500 }
    );
  }
}

