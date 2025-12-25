import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST add document to case
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;
    const body = await request.json();
    const { fileName, fileType, googleDriveId, googleDriveUrl, fileData, extractedText } = body;

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: "Le nom et le type de fichier sont requis" },
        { status: 400 }
      );
    }

    const document = await prisma.document.create({
      data: {
        caseId,
        fileName,
        fileType,
        googleDriveId,
        googleDriveUrl,
        fileData, // Base64 encoded file
        extractedText,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'ajout du document" },
      { status: 500 }
    );
  }
}

// GET all documents for a case
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;

    const documents = await prisma.document.findMany({
      where: { caseId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des documents" },
      { status: 500 }
    );
  }
}

