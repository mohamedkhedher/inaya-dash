"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  User,
  FolderPlus,
  FileText,
  Calendar,
  Globe,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Loader2,
  Send,
  MessageSquare,
  ExternalLink,
  Brain,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";

interface Document {
  id: string;
  fileName: string;
  fileType: string;
  googleDriveId: string | null;
  googleDriveUrl: string | null;
  extractedText: string | null;
  createdAt: string;
}

interface Note {
  id: string;
  content: string;
  createdAt: string;
  author: {
    name: string;
    role: string;
  };
}

interface Case {
  id: string;
  status: string;
  aiPreAnalysis: string | null;
  createdAt: string;
  documents: Document[];
  notes: Note[];
}

interface Patient {
  id: string;
  patientCode: string;
  fullName: string;
  nationality: string | null;
  passportNumber: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  createdAt: string;
  cases: Case[];
}

export default function PatientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCase, setActiveCase] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [analyzingCaseId, setAnalyzingCaseId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPatient() {
      try {
        const res = await fetch(`/api/patients/${id}`);
        if (!res.ok) {
          router.push("/dashboard/patients");
          return;
        }
        const data = await res.json();
        setPatient(data);
        if (data.cases.length > 0) {
          setActiveCase(data.cases[0].id);
        }
      } catch (error) {
        console.error("Error fetching patient:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPatient();
  }, [id, router]);

  const handleAddNote = async (caseId: string) => {
    if (!newNote.trim()) return;

    setIsAddingNote(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote }),
      });

      if (res.ok) {
        const note = await res.json();
        setPatient((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            cases: prev.cases.map((c) =>
              c.id === caseId ? { ...c, notes: [note, ...c.notes] } : c
            ),
          };
        });
        setNewNote("");
        toast({
          title: "Note ajoutée",
          description: "La note a été enregistrée avec succès",
        });
      }
    } catch (error) {
      console.error("Error adding note:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter la note",
        variant: "destructive",
      });
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleAnalyzeCase = async (caseId: string) => {
    setAnalyzingCaseId(caseId);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
      });

      const result = await res.json();

      if (result.success) {
        setPatient((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            cases: prev.cases.map((c) =>
              c.id === caseId
                ? { ...c, aiPreAnalysis: result.analysis, status: "ANALYZED" }
                : c
            ),
          };
        });
        toast({
          title: "Analyse terminée",
          description: "La pré-analyse IA a été générée",
        });
      } else {
        toast({
          title: "Erreur",
          description: result.error || "Impossible de générer l'analyse",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setAnalyzingCaseId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ANALYZED":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-200";
      case "IN_PROGRESS":
        return "bg-blue-500/10 text-blue-600 border-blue-200";
      case "COMPLETED":
        return "bg-violet-500/10 text-violet-600 border-violet-200";
      default:
        return "bg-amber-500/10 text-amber-600 border-amber-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ANALYZED":
        return "Analysé";
      case "IN_PROGRESS":
        return "En cours";
      case "COMPLETED":
        return "Terminé";
      default:
        return "En attente";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!patient) {
    return null;
  }

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/patients">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xl font-bold text-primary">
                {patient.fullName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold">{patient.fullName}</h1>
              <p className="text-muted-foreground font-mono">
                {patient.patientCode}
              </p>
            </div>
          </div>
        </div>
        <Link href="/dashboard/patients/new">
          <Button className="w-full sm:w-auto gap-2 h-11">
            <FolderPlus className="w-4 h-4" />
            Nouveau dossier
          </Button>
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Patient Info */}
        <Card className="border-0 shadow-sm lg:sticky lg:top-6 h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Informations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {patient.nationality && (
              <div className="flex items-start gap-3">
                <Globe className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Nationalité</p>
                  <p className="font-medium">{patient.nationality}</p>
                </div>
              </div>
            )}
            {patient.passportNumber && (
              <div className="flex items-start gap-3">
                <CreditCard className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Passeport</p>
                  <p className="font-medium font-mono">{patient.passportNumber}</p>
                </div>
              </div>
            )}
            {patient.dateOfBirth && (
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Date de naissance</p>
                  <p className="font-medium">
                    {format(new Date(patient.dateOfBirth), "dd MMMM yyyy", {
                      locale: fr,
                    })}
                  </p>
                </div>
              </div>
            )}
            {patient.phone && (
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Téléphone</p>
                  <p className="font-medium">{patient.phone}</p>
                </div>
              </div>
            )}
            {patient.email && (
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium break-all">{patient.email}</p>
                </div>
              </div>
            )}
            {patient.address && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Adresse</p>
                  <p className="font-medium">{patient.address}</p>
                </div>
              </div>
            )}
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Enregistré le{" "}
                {format(new Date(patient.createdAt), "dd/MM/yyyy à HH:mm", {
                  locale: fr,
                })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cases */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Dossiers médicaux ({patient.cases.length})
            </h2>
          </div>

          {patient.cases.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="font-semibold mb-2">Aucun dossier</h3>
                <p className="text-muted-foreground mb-4">
                  Ce patient n&apos;a pas encore de dossier médical
                </p>
                <Link href="/dashboard/patients/new">
                  <Button className="gap-2">
                    <FolderPlus className="w-4 h-4" />
                    Créer un dossier
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Accordion
              type="single"
              collapsible
              value={activeCase || undefined}
              onValueChange={(value) => setActiveCase(value)}
              className="space-y-4"
            >
              {patient.cases.map((caseItem, index) => (
                <AccordionItem
                  key={caseItem.id}
                  value={caseItem.id}
                  className="border-0"
                >
                  <Card className="border-0 shadow-sm overflow-hidden">
                    <AccordionTrigger className="px-4 lg:px-6 py-4 hover:no-underline [&[data-state=open]]:bg-muted/30">
                      <div className="flex items-center gap-4 text-left w-full">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold">
                            Dossier #{patient.cases.length - index}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(caseItem.createdAt), "dd MMM yyyy", {
                              locale: fr,
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={getStatusColor(caseItem.status)}>
                            {getStatusLabel(caseItem.status)}
                          </Badge>
                          <Badge variant="secondary">
                            {caseItem.documents.length} doc(s)
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="px-4 lg:px-6 pb-6 space-y-6">
                        <Tabs defaultValue="analysis" className="w-full">
                          <TabsList className="w-full grid grid-cols-3 h-auto p-1">
                            <TabsTrigger value="analysis" className="py-2.5">
                              <Brain className="w-4 h-4 mr-2 hidden sm:inline" />
                              Analyse IA
                            </TabsTrigger>
                            <TabsTrigger value="documents" className="py-2.5">
                              <FileText className="w-4 h-4 mr-2 hidden sm:inline" />
                              Documents
                            </TabsTrigger>
                            <TabsTrigger value="notes" className="py-2.5">
                              <MessageSquare className="w-4 h-4 mr-2 hidden sm:inline" />
                              Notes
                            </TabsTrigger>
                          </TabsList>

                          {/* AI Analysis Tab */}
                          <TabsContent value="analysis" className="mt-4">
                            {caseItem.aiPreAnalysis ? (
                              <div className="prose prose-sm max-w-none dark:prose-invert">
                                <div className="p-4 rounded-xl bg-muted/50 whitespace-pre-wrap">
                                  {caseItem.aiPreAnalysis}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                                <h4 className="font-semibold mb-2">
                                  Analyse non disponible
                                </h4>
                                <p className="text-sm text-muted-foreground mb-4">
                                  Lancez l&apos;analyse IA pour obtenir une
                                  pré-analyse automatique
                                </p>
                                <Button
                                  onClick={() => handleAnalyzeCase(caseItem.id)}
                                  disabled={
                                    analyzingCaseId === caseItem.id ||
                                    caseItem.documents.length === 0
                                  }
                                  className="gap-2"
                                >
                                  {analyzingCaseId === caseItem.id ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      Analyse en cours...
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="w-4 h-4" />
                                      Lancer l&apos;analyse
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </TabsContent>

                          {/* Documents Tab */}
                          <TabsContent value="documents" className="mt-4">
                            {caseItem.documents.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">
                                <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                <p>Aucun document</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {caseItem.documents.map((doc) => (
                                  <div
                                    key={doc.id}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                  >
                                    <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center">
                                      <FileText className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm truncate">
                                        {doc.fileName}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {format(
                                          new Date(doc.createdAt),
                                          "dd/MM/yyyy HH:mm"
                                        )}
                                      </p>
                                    </div>
                                    {doc.googleDriveUrl && (
                                      <a
                                        href={doc.googleDriveUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <Button variant="ghost" size="icon">
                                          <ExternalLink className="w-4 h-4" />
                                        </Button>
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </TabsContent>

                          {/* Notes Tab */}
                          <TabsContent value="notes" className="mt-4 space-y-4">
                            {/* Add note */}
                            <div className="space-y-3">
                              <Textarea
                                placeholder="Ajouter une note..."
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                className="min-h-[100px] resize-none"
                              />
                              <Button
                                onClick={() => handleAddNote(caseItem.id)}
                                disabled={isAddingNote || !newNote.trim()}
                                className="w-full sm:w-auto gap-2"
                              >
                                {isAddingNote ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Send className="w-4 h-4" />
                                )}
                                Ajouter
                              </Button>
                            </div>

                            {/* Notes list */}
                            {caseItem.notes.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">
                                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                <p>Aucune note pour ce dossier</p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {caseItem.notes.map((note) => (
                                  <div
                                    key={note.id}
                                    className="p-4 rounded-xl bg-muted/50"
                                  >
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                        <span className="text-xs font-medium text-primary">
                                          {note.author?.name?.charAt(0) || "?"}
                                        </span>
                                      </div>
                                      <span className="text-sm font-medium">
                                        {note.author?.name || "Utilisateur inconnu"}
                                      </span>
                                      <Badge variant="secondary" className="text-xs">
                                        {note.author?.role || "N/A"}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground ml-auto">
                                        {format(
                                          new Date(note.createdAt),
                                          "dd/MM/yyyy HH:mm",
                                          { locale: fr }
                                        )}
                                      </span>
                                    </div>
                                    <p className="text-sm whitespace-pre-wrap">
                                      {note.content}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </TabsContent>
                        </Tabs>
                      </div>
                    </AccordionContent>
                  </Card>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </div>
    </div>
  );
}

