import { NextRequest, NextResponse } from "next/server";
import { generateMedicalInvoice, InvoiceInput } from "@/lib/openai";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { caseId, structureName, structureAddress, invoiceNumber, currency, country, city, bankDetails, legalMentions } = body;

    if (!caseId) {
      return NextResponse.json(
        { error: "caseId est requis" },
        { status: 400 }
      );
    }

    // Fetch case with patient info and AI analysis
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        patient: true,
      },
    });

    if (!caseData) {
      return NextResponse.json(
        { error: "Dossier non trouvé" },
        { status: 404 }
      );
    }

    if (!caseData.aiPreAnalysis) {
      return NextResponse.json(
        { error: "Veuillez d'abord effectuer une analyse IA avant de générer une facture" },
        { status: 400 }
      );
    }

    // Calculate age from date of birth
    let age: number | undefined;
    if (caseData.patient.dateOfBirth) {
      const birthDate = new Date(caseData.patient.dateOfBirth);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }

    // Prepare invoice input
    const invoiceInput: InvoiceInput = {
      patientInfo: {
        fullName: caseData.patient.fullName,
        age,
        passportNumber: caseData.patient.passportNumber || undefined,
        nationality: caseData.patient.nationality || undefined,
      },
      medicalObject: caseData.aiPreAnalysis,
      structureName,
      structureAddress,
      invoiceNumber: invoiceNumber || `INV-${caseData.patient.patientCode}-${Date.now().toString().slice(-6)}`,
      invoiceDate: new Date().toLocaleDateString('fr-FR'),
      currency: currency || "EUR",
      country,
      city,
      bankDetails,
      legalMentions,
    };

    // Generate the invoice
    const invoice = await generateMedicalInvoice(invoiceInput);

    return NextResponse.json({
      success: true,
      invoice,
      invoiceNumber: invoiceInput.invoiceNumber,
    });

  } catch (error) {
    console.error("Error generating invoice:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Erreur lors de la génération de la facture: ${errorMessage}` },
      { status: 500 }
    );
  }
}

