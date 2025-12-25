import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { generateComprehensiveMedicalAnalysis } from "../src/lib/openai";

async function testAnalysis() {
  console.log("🧪 Test de l'analyse IA médicale\n");

  // Informations patient
  const patientInfo = {
    fullName: "YACOUBA GADO",
    patientCode: "IN0001",
    age: 63,
    gender: "M",
  };

  console.log("📋 Informations patient:");
  console.log(`   Nom: ${patientInfo.fullName}`);
  console.log(`   Code: ${patientInfo.patientCode}`);
  console.log(`   Âge: ${patientInfo.age} ans`);
  console.log(`   Genre: ${patientInfo.gender}\n`);

  // Simuler les données des documents basées sur les descriptions fournies
  const documentsText = [
    `=== RAPPORT ÉCHOGRAPHIE DOPPLER ===
Patient: YACOUBA GADO
Date: 17 NOVEMBRE 2025
Âge: 63 ans, Sexe: M

RÉSULTATS:
- Ventricule gauche: DTD 50.6 mm, DTS 36.0 mm
- SIV: 10.4 mm
- Paroi post: 6.9 mm
- Oreillette gauche: diam 40.9 mm, surf 12.40 cm²
- Oreillette droite: surf 11.70 cm²
- Aorte racine: 27.0 mm
- Flux mitral: TYPE 1 IM grade
- Flux aortique: ITV = 15.82 cm
- E/A <1: 0.67
- FEVG: 67.6 %
- TAPSE: 22.8 mm

COMMENTAIRE:
Cavités cardiaques de taille normale, cinétique globale et segmentaire correcte. FEVG conservée. Pas d'HVG. Racine de l'aorte et aorte ascendante de taille correcte. Valves mitrales, aortiques et tricuspides normales. Flux mitral type 1 sans élévation des pressions de remplissage du VG. Pas d'HTAP, péricarde libre. VCI normale. Fonction VD correcte. Pas de thrombus détectable.

CONCLUSION:
Trouble de la relaxation du VG. Ailleurs echo Doppler cardiaque normal ce jour.`,

    `=== RAPPORT DE LABORATOIRE ===
Patient: YACOUBA GADO

RÉSULTATS ANALYSES SANGUINES:
- Glycémie: 7,51 mmol/L (Normal: 3,9-6,2 mmol/L) ⚠️ ÉLEVÉ
- Urée: 4,42 mmol/L (Normal: 1,6-6,6 mmol/L) ✅ NORMAL
- Créatinine: 173 µmol/L (Normal: 56-125 µmol/L) ⚠️ ÉLEVÉ

INTERPRÉTATION:
- Hyperglycémie (diabète probable)
- Insuffisance rénale (créatinine élevée)
- Fonction rénale altérée`,

    `=== SCAN CT (TOMODENSITOMÉTRIE) ===
Patient: YACOUBA GADO

OBSERVATIONS:
- Scan CT de l'abdomen et du pelvis
- Vues axiales, coronales et reconstructions 3D
- Flèche blanche pointant vers la région du rein gauche (zone d'intérêt)
- Structures anatomiques visibles: reins, colonne vertébrale, organes abdominaux
- Reconstructions 3D du squelette (cage thoracique, colonne, bassin)

NOTE: Analyse détaillée des images CT nécessaire pour identifier les anomalies spécifiques.`,
  ];

  console.log("📄 Documents à analyser:");
  console.log(`   1. Échocardiographie Doppler`);
  console.log(`   2. Analyses de laboratoire`);
  console.log(`   3. Scan CT\n`);

  console.log("🤖 Démarrage de l'analyse IA...\n");

  try {
    const analysis = await generateComprehensiveMedicalAnalysis({
      texts: documentsText,
      patientInfo,
    });

    console.log("✅ Analyse terminée avec succès!\n");
    console.log("=" .repeat(80));
    console.log("RÉSULTAT DE L'ANALYSE MÉDICALE IA");
    console.log("=" .repeat(80));
    console.log("\n");
    console.log(analysis);
    console.log("\n");
    console.log("=" .repeat(80));

    return analysis;
  } catch (error: any) {
    console.error("❌ Erreur lors de l'analyse:", error);
    throw error;
  }
}

// Exécuter le test
testAnalysis()
  .then(() => {
    console.log("\n✅ Test terminé avec succès!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Erreur:", error);
    process.exit(1);
  });

