import { NextRequest, NextResponse } from "next/server";
import { generateComprehensiveMedicalAnalysis } from "@/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { texts, images, patientInfo } = body;

    // Validate we have at least some content to analyze
    const hasText = texts && Array.isArray(texts) && texts.length > 0 && texts.some((text: string) => text.trim());
    const hasImages = images && Array.isArray(images) && images.length > 0;

    if (!hasText && !hasImages) {
      return NextResponse.json(
        { error: "Aucun contenu à analyser. Veuillez fournir du texte ou des images." },
        { status: 400 }
      );
    }

    // Generate comprehensive analysis
    const analysis = await generateComprehensiveMedicalAnalysis({
      texts: hasText ? texts : undefined,
      images: hasImages ? images : undefined,
      patientInfo,
    });

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("Direct Analysis Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'analyse" },
      { status: 500 }
    );
  }
}


