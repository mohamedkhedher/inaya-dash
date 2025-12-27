import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all patients with search
export async function GET(request: NextRequest) {
  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL environment variable is not set");
      return NextResponse.json({
        patients: [],
        pagination: { total: 0, pages: 0, page: 1, limit: 10 },
        warning: "Base de données non configurée"
      });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" as const } },
            { patientCode: { contains: search, mode: "insensitive" as const } },
            { passportNumber: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    let patients = [];
    let total = 0;

    try {
      [patients, total] = await Promise.all([
        prisma.patient.findMany({
          where,
          include: {
            cases: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
            _count: {
              select: { cases: true },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.patient.count({ where }),
      ]);
    } catch (dbError) {
      console.error("Database connection error:", dbError);
      const dbErrorMessage = dbError instanceof Error ? dbError.message : "Database error";
      return NextResponse.json({
        patients: [],
        pagination: { total: 0, pages: 0, page: 1, limit: 10 },
        warning: `Erreur de connexion à la base de données: ${dbErrorMessage}`
      });
    }

    return NextResponse.json({
      patients,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching patients:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Return empty list with error info instead of 500
    return NextResponse.json({
      patients: [],
      pagination: {
        total: 0,
        pages: 0,
        page: 1,
        limit: 10,
      },
      warning: `Erreur: ${errorMessage}`,
    });
  }
}

// POST create new patient
export async function POST(request: NextRequest) {
  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL environment variable is not set");
      return NextResponse.json(
        { error: "Base de données non configurée. Veuillez configurer DATABASE_URL sur Vercel." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { fullName, nationality, passportNumber, dateOfBirth, gender, phone, email, address } = body;

    if (!fullName) {
      return NextResponse.json(
        { error: "Le nom complet est requis" },
        { status: 400 }
      );
    }

    // Generate patient code
    let counter;
    try {
      counter = await prisma.counter.upsert({
        where: { id: "patient_counter" },
        update: { value: { increment: 1 } },
        create: { id: "patient_counter", value: 1 },
      });
    } catch (dbError) {
      console.error("Database error creating counter:", dbError);
      const errorMessage = dbError instanceof Error ? dbError.message : "Database error";
      return NextResponse.json(
        { error: `Erreur de connexion à la base de données: ${errorMessage}` },
        { status: 500 }
      );
    }

    const patientCode = `IN${String(counter.value).padStart(4, "0")}`;

    const patient = await prisma.patient.create({
      data: {
        patientCode,
        fullName: fullName.trim(),
        nationality: nationality || null,
        passportNumber: passportNumber?.trim() || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
      },
      include: {
        cases: true,
      },
    });

    return NextResponse.json(patient, { status: 201 });
  } catch (error) {
    console.error("Error creating patient:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Erreur lors de la création du patient: ${errorMessage}` },
      { status: 500 }
    );
  }
}



