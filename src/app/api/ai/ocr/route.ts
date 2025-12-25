import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Tu es un assistant spécialisé dans l'extraction de données de passeports.
Extrais les informations suivantes du document:
- Nom complet (fullName)
- Nationalité (nationality)
- Numéro de passeport (passportNumber)
- Date de naissance (dateOfBirth) au format YYYY-MM-DD
- Genre (gender): "M" ou "F"

Réponds UNIQUEMENT avec un objet JSON valide, sans texte supplémentaire.
Exemple: {"fullName": "John Doe", "nationality": "French", "passportNumber": "AB123456", "dateOfBirth": "1990-01-15", "gender": "M"}
Si une information n'est pas visible, utilise null.`,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || "{}";
    
    // Parse JSON response
    let extractedData;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
      extractedData = JSON.parse(cleanContent);
    } catch {
      extractedData = {};
    }

    return NextResponse.json({
      success: true,
      data: extractedData,
      raw: content,
    });
  } catch (error) {
    console.error("OCR Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'extraction OCR" },
      { status: 500 }
    );
  }
}

