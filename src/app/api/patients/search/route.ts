import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET search patients for autocomplete
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";

    if (query.length < 2) {
      return NextResponse.json([]);
    }

    const patients = await prisma.patient.findMany({
      where: {
        OR: [
          { fullName: { contains: query, mode: "insensitive" } },
          { patientCode: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        patientCode: true,
        fullName: true,
        nationality: true,
        _count: {
          select: { cases: true },
        },
      },
      take: 5,
      orderBy: { fullName: "asc" },
    });

    return NextResponse.json(patients);
  } catch (error) {
    console.error("Error searching patients:", error);
    // Return empty array instead of error to prevent UI breaking
    return NextResponse.json([]);
  }
}
