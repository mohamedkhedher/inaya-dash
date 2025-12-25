"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Upload,
  Loader2,
  Check,
  X,
  FileText,
  Scan,
  User,
  Sparkles,
  FolderPlus,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import { PatientAutocomplete } from "@/components/patient-autocomplete";

interface PatientSuggestion {
  id: string;
  patientCode: string;
  fullName: string;
  nationality: string | null;
  _count: { cases: number };
}

interface PatientForm {
  fullName: string;
  nationality: string;
  passportNumber: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
}

interface UploadedFile {
  file: File;
  preview?: string;
  extractedText?: string;
  status: "pending" | "uploading" | "done" | "error";
}

export default function NewPatientPage() {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const passportInputRef = useRef<HTMLInputElement>(null);

  const [selectedPatient, setSelectedPatient] = useState<PatientSuggestion | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [form, setForm] = useState<PatientForm>({
    fullName: "",
    nationality: "",
    passportNumber: "",
    dateOfBirth: "",
    gender: "",
    phone: "",
    email: "",
    address: "",
  });

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isExistingPatient = selectedPatient !== null;

  const handlePatientSelect = (patient: PatientSuggestion | null) => {
    setSelectedPatient(patient);
    if (patient) {
      setForm((prev) => ({
        ...prev,
        fullName: patient.fullName,
        nationality: patient.nationality || "",
      }));
    }
  };

  const handleNameChange = (value: string) => {
    setSearchQuery(value);
    setForm((prev) => ({ ...prev, fullName: value }));
  };

  const clearSelection = () => {
    setSelectedPatient(null);
    setSearchQuery("");
    setForm({
      fullName: "",
      nationality: "",
      passportNumber: "",
      dateOfBirth: "",
      gender: "",
      phone: "",
      email: "",
      address: "",
    });
  };

  // Handle passport OCR
  const handlePassportScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/ai/ocr", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (result.success && result.data) {
        const newName = result.data.fullName || form.fullName;
        setForm((prev) => ({
          ...prev,
          fullName: newName,
          nationality: result.data.nationality || prev.nationality,
          passportNumber: result.data.passportNumber || prev.passportNumber,
          dateOfBirth: result.data.dateOfBirth || prev.dateOfBirth,
          gender: result.data.gender || prev.gender,
        }));
        setSearchQuery(newName);

        toast({
          title: "✅ Extraction réussie",
          description: "Les informations du passeport ont été extraites automatiquement",
        });
      } else {
        toast({
          title: "Erreur d'extraction",
          description: "Impossible d'extraire les informations du document",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("OCR error:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors du scan",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    const uploadedFiles: UploadedFile[] = newFiles.map((file) => ({
      file,
      preview: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined,
      status: "pending" as const,
    }));
    setFiles((prev) => [...prev, ...uploadedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.fullName.trim()) {
      toast({
        title: "Champ requis",
        description: "Veuillez entrer le nom du patient",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let patientId: string;

      if (isExistingPatient && selectedPatient) {
        patientId = selectedPatient.id;
      } else {
        // Create new patient
        const patientRes = await fetch("/api/patients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        if (!patientRes.ok) {
          throw new Error("Erreur lors de la création du patient");
        }

        const patient = await patientRes.json();
        patientId = patient.id;
      }

      // Create new case
      const caseRes = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });

      if (!caseRes.ok) {
        throw new Error("Erreur lors de la création du dossier");
      }

      const newCase = await caseRes.json();

      // Upload files and add to case
      for (const uploadedFile of files) {
        await fetch(`/api/cases/${newCase.id}/documents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: uploadedFile.file.name,
            fileType: uploadedFile.file.type,
            extractedText: uploadedFile.extractedText || "",
          }),
        });
      }

      toast({
        title: "✅ Succès",
        description: isExistingPatient
          ? "Nouveau dossier créé pour le patient existant"
          : "Patient et dossier créés avec succès",
      });

      router.push(`/dashboard/patients/${patientId}`);
    } catch (error) {
      console.error("Submit error:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/patients">
          <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {isExistingPatient ? "Nouveau dossier" : "Nouveau patient"}
          </h1>
          <p className="text-gray-500 mt-1">
            {isExistingPatient
              ? `Ajouter un dossier pour ${selectedPatient?.fullName}`
              : "Enregistrer un nouveau patient dans le système"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Search / Selection */}
        <Card className="border-gray-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-4 bg-gradient-to-r from-teal-50 to-emerald-50 border-b">
            <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
              <User className="w-5 h-5 text-teal-600" />
              Informations patient
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {/* Selected patient banner */}
            {selectedPatient && (
              <div className="flex items-center justify-between p-4 rounded-xl bg-teal-50 border border-teal-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                    <span className="font-bold text-white text-lg">
                      {selectedPatient.fullName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{selectedPatient.fullName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm text-gray-600 font-mono">
                        {selectedPatient.patientCode}
                      </span>
                      <Badge variant="secondary" className="bg-teal-100 text-teal-700">
                        {selectedPatient._count.cases} dossier(s) existant(s)
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={clearSelection}
                  className="h-10 w-10 rounded-full hover:bg-teal-100"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </Button>
              </div>
            )}

            {/* Passport OCR */}
            {!selectedPatient && (
              <div className="p-5 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg">
                      <Scan className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Scanner un passeport</p>
                      <p className="text-sm text-gray-600">
                        Extraction automatique des informations avec IA
                      </p>
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={passportInputRef}
                    onChange={handlePassportScan}
                    accept="image/*,.pdf"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    onClick={() => passportInputRef.current?.click()}
                    disabled={isScanning}
                    className="w-full sm:w-auto gap-2 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white rounded-xl h-11"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyse en cours...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Scanner avec IA
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Name with autocomplete */}
            <div>
              <Label htmlFor="fullName" className="text-gray-700 font-medium">
                Nom complet du patient <span className="text-red-500">*</span>
              </Label>
              <div className="mt-2">
                <PatientAutocomplete
                  value={searchQuery}
                  onChange={handleNameChange}
                  onPatientSelect={handlePatientSelect}
                  selectedPatient={selectedPatient}
                  disabled={isExistingPatient}
                  placeholder="Tapez pour rechercher ou créer un patient..."
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 Commencez à taper pour rechercher un patient existant ou créez-en un nouveau
              </p>
            </div>

            {/* Other fields - only for new patients */}
            {!isExistingPatient && (
              <div className="grid gap-5 sm:grid-cols-2 pt-2">
                <div>
                  <Label htmlFor="nationality" className="text-gray-700">Nationalité</Label>
                  <Input
                    id="nationality"
                    value={form.nationality}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, nationality: e.target.value }))
                    }
                    placeholder="Ex: Française"
                    className="mt-2 h-12 rounded-xl border-gray-200"
                  />
                </div>
                <div>
                  <Label htmlFor="passportNumber" className="text-gray-700">N° Passeport</Label>
                  <Input
                    id="passportNumber"
                    value={form.passportNumber}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, passportNumber: e.target.value }))
                    }
                    placeholder="Ex: AB123456"
                    className="mt-2 h-12 rounded-xl border-gray-200 font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="dateOfBirth" className="text-gray-700">Date de naissance</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))
                    }
                    className="mt-2 h-12 rounded-xl border-gray-200"
                  />
                </div>
                <div>
                  <Label htmlFor="gender" className="text-gray-700">Genre</Label>
                  <Select
                    value={form.gender}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, gender: value }))
                    }
                  >
                    <SelectTrigger className="mt-2 h-12 rounded-xl border-gray-200">
                      <SelectValue placeholder="Sélectionner le genre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculin</SelectItem>
                      <SelectItem value="F">Féminin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="phone" className="text-gray-700">Téléphone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="+33 6 12 34 56 78"
                    className="mt-2 h-12 rounded-xl border-gray-200"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-gray-700">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="patient@email.com"
                    className="mt-2 h-12 rounded-xl border-gray-200"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="address" className="text-gray-700">Adresse</Label>
                  <Textarea
                    id="address"
                    value={form.address}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, address: e.target.value }))
                    }
                    placeholder="Adresse complète du patient"
                    className="mt-2 min-h-[100px] rounded-xl border-gray-200 resize-none"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documents Upload */}
        <Card className="border-gray-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
            <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
              <FileText className="w-5 h-5 text-blue-600" />
              Documents médicaux
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 ml-2">
                Optionnel
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {/* Upload zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                accept="image/*,.pdf"
                className="hidden"
              />
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8 text-blue-500" />
              </div>
              <p className="font-semibold text-gray-900">Glissez vos fichiers ici</p>
              <p className="text-sm text-gray-500 mt-1">
                ou cliquez pour sélectionner
              </p>
              <p className="text-xs text-gray-400 mt-3">
                Formats acceptés: PDF, JPG, PNG • Taille max: 10 MB
              </p>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  {files.length} fichier(s) sélectionné(s)
                </p>
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200"
                  >
                    <div className="w-12 h-12 rounded-lg bg-white border flex items-center justify-center overflow-hidden">
                      {file.preview ? (
                        <img
                          src={file.preview}
                          alt=""
                          className="w-12 h-12 object-cover"
                        />
                      ) : (
                        <FileText className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {file.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(file.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    {file.status === "done" ? (
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <Check className="w-4 h-4 text-green-600" />
                      </div>
                    ) : file.status === "uploading" ? (
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(index)}
                        className="h-8 w-8 rounded-full hover:bg-red-100 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <Link href="/dashboard/patients" className="sm:w-auto">
            <Button type="button" variant="outline" className="h-12 w-full rounded-xl border-gray-300">
              Annuler
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isSubmitting || !form.fullName.trim()}
            className="h-12 flex-1 gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-xl shadow-lg shadow-teal-500/25"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                {isExistingPatient ? (
                  <>
                    <FolderPlus className="w-4 h-4" />
                    Créer le dossier
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Enregistrer le patient
                  </>
                )}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
