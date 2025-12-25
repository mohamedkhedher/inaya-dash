"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Sparkles, FileText } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function TestAnalysisPage() {
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("YACOUBA GADO");
  const [patientCode, setPatientCode] = useState("IN0001");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    setFiles(newFiles);
  };

  const handleAnalyze = async () => {
    if (files.length === 0) {
      toast({
        title: "Aucun fichier",
        description: "Veuillez sélectionner au moins un fichier",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });
      formData.append(
        "patientInfo",
        JSON.stringify({
          fullName: patientName,
          patientCode: patientCode,
        })
      );

      const response = await fetch("/api/ai/test-analyze", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setAnalysis(result.analysis);
        toast({
          title: "✅ Analyse terminée",
          description: `${result.imagesProcessed} image(s) et ${result.textsProcessed} texte(s) analysé(s)`,
        });
      } else {
        throw new Error(result.error || "Erreur lors de l'analyse");
      }
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Test d'analyse IA</h1>
        <p className="text-gray-600 mt-2">
          Testez l'analyse médicale IA avec vos documents
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations patient</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="patientName">Nom du patient</Label>
            <Input
              id="patientName"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="patientCode">Code patient</Label>
            <Input
              id="patientCode"
              value={patientCode}
              onChange={(e) => setPatientCode(e.target.value)}
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents à analyser</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="files">Sélectionner les fichiers</Label>
            <Input
              id="files"
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="mt-2"
            />
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {files.length} fichier(s) sélectionné(s):
              </p>
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                >
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">{file.name}</span>
                  <span className="text-xs text-gray-500">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              ))}
            </div>
          )}

          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || files.length === 0}
            className="w-full gap-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Lancer l'analyse
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle>Résultat de l'analyse</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap"
              dangerouslySetInnerHTML={{
                __html: analysis
                  .replace(/\n/g, "<br />")
                  .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                  .replace(/\*(.*?)\*/g, "<em>$1</em>")
                  .replace(/## (.*?)/g, "<h2 class='text-xl font-bold mt-4 mb-2 text-gray-900'>$1</h2>")
                  .replace(/### (.*?)/g, "<h3 class='text-lg font-semibold mt-3 mb-2 text-gray-800'>$1</h3>"),
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}


