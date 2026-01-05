import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all cases
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;

    const [cases, total] = await Promise.all([
      prisma.case.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              patientCode: true,
              fullName: true,
            },
          },
          documents: true,
          _count: {
            select: { notes: true, documents: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.case.count({ where }),
    ]);

    return NextResponse.json({
      cases,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching cases:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des dossiers" },
      { status: 500 }
    );
  }
}

// POST create new case for patient
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId } = body;

    if (!patientId) {
      return NextResponse.json(
        { error: "L'ID du patient est requis" },
        { status: 400 }
      );
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      return NextResponse.json(
        { error: "Patient non trouvé" },
        { status: 404 }
      );
    }

    const newCase = await prisma.case.create({
      data: {
        patientId,
        status: "PENDING",
      },
      include: {
        patient: true,
        documents: true,
      },
    });

    return NextResponse.json(newCase, { status: 201 });
  } catch (error) {
    console.error("Error creating case:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du dossier" },
      { status: 500 }
    );
  }
}







