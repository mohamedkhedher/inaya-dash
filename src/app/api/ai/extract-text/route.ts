import { NextRequest, NextResponse } from "next/server";
import { extractDocumentText } from "@/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 }
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";
    const base64Image = `data:${mimeType};base64,${base64}`;

    // Extract text from medical document image
    const extractedText = await extractDocumentText(base64Image);

    return NextResponse.json({
      success: true,
      text: extractedText,
      fileName: file.name,
    });
  } catch (error) {
    console.error("Text Extraction Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'extraction du texte" },
      { status: 500 }
    );
  }
}






