import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all patients with search
export async function GET(request: NextRequest) {
  try {
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

    const [patients, total] = await Promise.all([
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
    return NextResponse.json(
      { error: "Erreur lors de la récupération des patients" },
      { status: 500 }
    );
  }
}

// POST create new patient
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, nationality, passportNumber, dateOfBirth, gender, phone, email, address } = body;

    if (!fullName) {
      return NextResponse.json(
        { error: "Le nom complet est requis" },
        { status: 400 }
      );
    }

    // Generate patient code
    const counter = await prisma.counter.upsert({
      where: { id: "patient_counter" },
      update: { value: { increment: 1 } },
      create: { id: "patient_counter", value: 1 },
    });

    const patientCode = `IN${String(counter.value).padStart(4, "0")}`;

    const patient = await prisma.patient.create({
      data: {
        patientCode,
        fullName,
        nationality,
        passportNumber,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender,
        phone,
        email,
        address,
      },
      include: {
        cases: true,
      },
    });

    return NextResponse.json(patient, { status: 201 });
  } catch (error) {
    console.error("Error creating patient:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du patient" },
      { status: 500 }
    );
  }
}

