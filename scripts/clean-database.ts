import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log("🧹 Nettoyage de la base de données...\n");

  try {
    // Delete in correct order (respecting foreign key constraints)
    console.log("Suppression des notes...");
    const deletedNotes = await prisma.note.deleteMany({});
    console.log(`✅ ${deletedNotes.count} notes supprimées`);

    console.log("Suppression des documents...");
    const deletedDocuments = await prisma.document.deleteMany({});
    console.log(`✅ ${deletedDocuments.count} documents supprimés`);

    console.log("Suppression des dossiers (cases)...");
    const deletedCases = await prisma.case.deleteMany({});
    console.log(`✅ ${deletedCases.count} dossiers supprimés`);

    console.log("Suppression des patients...");
    const deletedPatients = await prisma.patient.deleteMany({});
    console.log(`✅ ${deletedPatients.count} patients supprimés`);

    console.log("Suppression des utilisateurs...");
    const deletedUsers = await prisma.user.deleteMany({});
    console.log(`✅ ${deletedUsers.count} utilisateurs supprimés`);

    console.log("Réinitialisation du compteur de patients...");
    await prisma.counter.deleteMany({
      where: { id: "patient_counter" },
    });
    console.log("✅ Compteur réinitialisé");

    console.log("\n✨ Base de données nettoyée avec succès !");
    console.log("🚀 Vous pouvez maintenant tester la plateforme depuis zéro.\n");
  } catch (error) {
    console.error("❌ Erreur lors du nettoyage:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

