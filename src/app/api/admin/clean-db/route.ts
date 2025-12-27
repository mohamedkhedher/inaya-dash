import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DANGER: This endpoint cleans the entire database
// Only use for testing/development
export async function POST(request: NextRequest) {
  try {
    // Security check - require a secret key
    const authHeader = request.headers.get("authorization");
    const secretKey = process.env.ADMIN_SECRET_KEY || "inaya-clean-2024";

    if (!authHeader || authHeader !== `Bearer ${secretKey}`) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    console.log("🧹 Cleaning database...");

    // Delete in correct order (respecting foreign key constraints)
    const deletedNotes = await prisma.note.deleteMany({});
    const deletedDocuments = await prisma.document.deleteMany({});
    const deletedCases = await prisma.case.deleteMany({});
    const deletedPatients = await prisma.patient.deleteMany({});
    const deletedUsers = await prisma.user.deleteMany({});

    // Reset counter
    await prisma.counter.deleteMany({
      where: { id: "patient_counter" },
    });

    return NextResponse.json({
      success: true,
      message: "Base de données nettoyée avec succès",
      deleted: {
        notes: deletedNotes.count,
        documents: deletedDocuments.count,
        cases: deletedCases.count,
        patients: deletedPatients.count,
        users: deletedUsers.count,
      },
    });
  } catch (error) {
    console.error("Clean DB Error:", error);
    return NextResponse.json(
      { error: "Erreur lors du nettoyage" },
      { status: 500 }
    );
  }
}




