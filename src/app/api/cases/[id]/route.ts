import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET single case with all details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const caseData = await prisma.case.findUnique({
      where: { id },
      include: {
        patient: true,
        documents: {
          orderBy: { createdAt: "desc" },
        },
        notes: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!caseData) {
      return NextResponse.json(
        { error: "Dossier non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json(caseData);
  } catch (error) {
    console.error("Error fetching case:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du dossier" },
      { status: 500 }
    );
  }
}

// PATCH update case (AI analysis, status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const caseData = await prisma.case.update({
      where: { id },
      data: {
        aiPreAnalysis: body.aiPreAnalysis,
        status: body.status,
      },
      include: {
        patient: true,
        documents: true,
        notes: true,
      },
    });

    return NextResponse.json(caseData);
  } catch (error) {
    console.error("Error updating case:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du dossier" },
      { status: 500 }
    );
  }
}







