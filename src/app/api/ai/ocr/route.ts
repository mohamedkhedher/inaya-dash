import { NextRequest, NextResponse } from "next/server";
import { extractPassportData } from "@/lib/openai";

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

    // Extract passport data using the centralized function
    const extractedData = await extractPassportData(base64Image);

    return NextResponse.json({
      success: true,
      data: extractedData,
    });
  } catch (error) {
    console.error("OCR Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'extraction OCR" },
      { status: 500 }
    );
  }
}

