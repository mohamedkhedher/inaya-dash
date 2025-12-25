import { NextRequest, NextResponse } from "next/server";
import { generateMedicalPreAnalysis } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

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
      .filter((doc: { extractedText: string | null }) => doc.extractedText)
      .map((doc: { fileName: string; extractedText: string | null }) => doc.extractedText || "");

    if (!documentTexts.length || !documentTexts.some((text: string) => text.trim())) {
      return NextResponse.json(
        { error: "Aucun texte extrait des documents" },
        { status: 400 }
      );
    }

    // Generate analysis using the centralized function
    const fullAnalysis = await generateMedicalPreAnalysis(documentTexts);

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

