import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST add note to case (append-only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;
    const body = await request.json();
    const { content, authorId } = body;

    if (!content) {
      return NextResponse.json(
        { error: "Le contenu est requis" },
        { status: 400 }
      );
    }

    // For MVP, use a default author if not provided
    let author = authorId;
    if (!author) {
      // Get or create a default user
      const defaultUser = await prisma.user.findFirst();
      if (!defaultUser) {
        const newUser = await prisma.user.create({
          data: {
            email: "admin@inaya.health",
            password: "placeholder",
            name: "Admin",
            role: "ADMIN",
          },
        });
        author = newUser.id;
      } else {
        author = defaultUser.id;
      }
    }

    const note = await prisma.note.create({
      data: {
        caseId,
        content,
        authorId: author,
      },
      include: {
        author: {
          select: {
            name: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'ajout de la note" },
      { status: 500 }
    );
  }
}

// GET all notes for a case
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;

    const notes = await prisma.note.findMany({
      where: { caseId },
      include: {
        author: {
          select: {
            name: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des notes" },
      { status: 500 }
    );
  }
}

