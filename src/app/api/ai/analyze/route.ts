import { NextRequest, NextResponse } from "next/server";
import { generateComprehensiveMedicalAnalysis, extractDocumentText } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { caseId, images } = body; // images: optional array of base64 images

    if (!caseId) {
      return NextResponse.json(
        { error: "L'ID du dossier est requis" },
        { status: 400 }
      );
    }

    // Get case with documents
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        patient: true,
        documents: true,
      },
    });

    if (!caseData) {
      return NextResponse.json(
        { error: "Dossier non trouvé" },
        { status: 404 }
      );
    }

    // Collect extracted text and images from documents
    const documentTexts: string[] = [];
    const allImages: string[] = [];

    for (const doc of caseData.documents) {
      const isImage = doc.fileType?.startsWith("image/");
      const isPDF = doc.fileType === "application/pdf";

      // If document has extracted text, add it
      if (doc.extractedText && doc.extractedText.trim()) {
        documentTexts.push(`--- Document: ${doc.fileName} ---\n${doc.extractedText}`);
      }

      // For PDFs, try to extract text if not already extracted
      if (isPDF && (!doc.extractedText || !doc.extractedText.trim())) {
        if (doc.fileData && doc.fileData.trim()) {
          try {
            const base64Data = doc.fileData.startsWith("data:") 
              ? doc.fileData 
              : `data:${doc.fileType};base64,${doc.fileData}`;
            
            const extractedText = await extractDocumentText(base64Data);
            if (extractedText && extractedText.trim()) {
              documentTexts.push(`--- Document: ${doc.fileName} ---\n${extractedText}`);
              
              // Update document with extracted text
              await prisma.document.update({
                where: { id: doc.id },
                data: { extractedText },
              });
            }
          } catch (error) {
            console.error(`Error extracting text from PDF ${doc.fileName}:`, error);
          }
        }
      }

      // If document is an image, use stored fileData (base64) or try to get from Google Drive
      if (isImage) {
        let base64Image: string | null = null;

        // First, try to use stored fileData (base64)
        if (doc.fileData && doc.fileData.trim()) {
          base64Image = doc.fileData.startsWith("data:") 
            ? doc.fileData 
            : `data:${doc.fileType || "image/jpeg"};base64,${doc.fileData}`;
        }
        // Fallback: try Google Drive if fileData is not available
        else if (doc.googleDriveId || doc.googleDriveUrl) {
          try {
            const { downloadImageFromGoogleDrive, extractFileIdFromUrl } = await import("@/lib/google-drive");
            
            let fileId = doc.googleDriveId;
            if (!fileId && doc.googleDriveUrl) {
              fileId = extractFileIdFromUrl(doc.googleDriveUrl);
            }
            
            if (fileId) {
              base64Image = await downloadImageFromGoogleDrive(
                fileId,
                doc.fileType || "image/jpeg"
              );
              
              // Save the downloaded image as fileData for future use
              if (base64Image) {
                await prisma.document.update({
                  where: { id: doc.id },
                  data: { fileData: base64Image },
                });
              }
            }
          } catch (error) {
            console.error(`Error downloading ${doc.fileName} from Google Drive:`, error);
            // Continue - we'll use extracted text if available
          }
        }

        if (base64Image) {
          allImages.push(base64Image);

          // If no extracted text exists, extract it now
          if (!doc.extractedText || !doc.extractedText.trim()) {
            try {
              const extractedText = await extractDocumentText(base64Image);
              if (extractedText && extractedText.trim()) {
                documentTexts.push(`--- Document: ${doc.fileName} ---\n${extractedText}`);
                
                // Update document with extracted text
                await prisma.document.update({
                  where: { id: doc.id },
                  data: { extractedText },
                });
              }
            } catch (extractError) {
              console.error(`Error extracting text from ${doc.fileName}:`, extractError);
              // Continue even if text extraction fails
            }
          }
        }
        // If image is not available but we have extracted text, use that
        else if (doc.extractedText && doc.extractedText.trim()) {
          // We already added the text above, so just continue
        }
      }
    }

    // Add any directly uploaded images (from request body)
    if (images && Array.isArray(images)) {
      allImages.push(...images);
    }

    // Validate we have at least some content to analyze
    const hasText = documentTexts.length > 0 && documentTexts.some((text: string) => text.trim());
    const hasImages = allImages.length > 0;

    if (!hasText && !hasImages) {
      // Check if we have documents but they don't have content
      const hasDocuments = caseData.documents.length > 0;
      const hasImageDocuments = caseData.documents.some(
        (doc) => doc.fileType?.startsWith("image/")
      );
      const hasTextDocuments = caseData.documents.some(
        (doc) => doc.fileType?.includes("pdf") || doc.fileType?.includes("text")
      );
      
      if (hasDocuments) {
        if (hasImageDocuments && !hasText) {
          return NextResponse.json(
            { 
              error: "Les images n'ont pas de données disponibles. Veuillez réuploader les fichiers ou ajouter des documents avec du texte extrait." 
            },
            { status: 400 }
          );
        }
        
        return NextResponse.json(
          { 
            error: "Aucun contenu analysable trouvé dans les documents. Veuillez vous assurer que les fichiers contiennent du texte ou des images valides." 
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: "Aucun document à analyser. Veuillez d'abord ajouter des documents au dossier." },
        { status: 400 }
      );
    }

    // Calculate patient age if dateOfBirth is available
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

    // Generate comprehensive analysis using text and images
    const fullAnalysis = await generateComprehensiveMedicalAnalysis({
      texts: hasText ? documentTexts : undefined,
      images: hasImages ? allImages : undefined,
      patientInfo: {
        fullName: caseData.patient.fullName,
        patientCode: caseData.patient.patientCode,
        age,
        gender: caseData.patient.gender || undefined,
      },
    });

    // Update case with analysis
    await prisma.case.update({
      where: { id: caseId },
      data: {
        aiPreAnalysis: fullAnalysis,
        status: "ANALYZED",
      },
    });

    return NextResponse.json({
      success: true,
      analysis: fullAnalysis,
    });
  } catch (error) {
    console.error("Analysis Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'analyse" },
      { status: 500 }
    );
  }
}

