import { NextRequest, NextResponse } from "next/server";
import { generateComprehensiveMedicalAnalysis } from "@/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const patientInfo = formData.get("patientInfo") 
      ? JSON.parse(formData.get("patientInfo") as string)
      : {};

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 }
      );
    }

    // Convert files to base64
    const base64Images: string[] = [];
    const texts: string[] = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString("base64");
      const mimeType = file.type || "image/jpeg";
      const base64Image = `data:${mimeType};base64,${base64}`;
      
      if (file.type.startsWith("image/")) {
        base64Images.push(base64Image);
      } else {
        // For PDFs or other files, we'll extract text
        texts.push(`Document: ${file.name}`);
      }
    }

    // Generate comprehensive analysis
    const analysis = await generateComprehensiveMedicalAnalysis({
      texts: texts.length > 0 ? texts : undefined,
      images: base64Images.length > 0 ? base64Images : undefined,
      patientInfo: patientInfo || {
        fullName: "YACOUBA GADO",
        patientCode: "IN0001",
      },
    });

    return NextResponse.json({
      success: true,
      analysis,
      imagesProcessed: base64Images.length,
      textsProcessed: texts.length,
    });
  } catch (error: any) {
    console.error("Test Analysis Error:", error);
    return NextResponse.json(
      { 
        error: "Erreur lors de l'analyse",
        details: error.message 
      },
      { status: 500 }
    );
  }
}






