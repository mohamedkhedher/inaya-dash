"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function CleanDatabasePage() {
  const [secretKey, setSecretKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleClean = async () => {
    if (!secretKey) {
      toast({
        title: "Clé requise",
        description: "Veuillez entrer la clé secrète",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("⚠️ ATTENTION: Ceci va supprimer TOUTES les données ! Êtes-vous sûr ?")) {
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/clean-db", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: "✅ Base nettoyée",
          description: `${data.deleted.patients} patients, ${data.deleted.cases} dossiers, ${data.deleted.documents} documents supprimés`,
        });
        setSecretKey("");
      } else {
        toast({
          title: "Erreur",
          description: data.error || "Impossible de nettoyer la base",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <Card className="border-red-200">
        <CardHeader className="bg-red-50 border-b border-red-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-red-900">Zone Dangereuse</CardTitle>
              <CardDescription className="text-red-600">
                Nettoyage complet de la base de données
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <p className="font-semibold mb-1">⚠️ ATTENTION</p>
                <p>
                  Cette action est <strong>IRRÉVERSIBLE</strong> et supprimera :
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Tous les patients</li>
                  <li>Tous les dossiers médicaux</li>
                  <li>Tous les documents</li>
                  <li>Toutes les notes</li>
                  <li>Tous les utilisateurs</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="secretKey">Clé secrète admin</Label>
            <Input
              id="secretKey"
              type="password"
              placeholder="Entrez la clé secrète"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Clé par défaut : inaya-clean-2024
            </p>
          </div>

          <Button
            onClick={handleClean}
            disabled={isLoading || !secretKey}
            variant="destructive"
            className="w-full gap-2 h-12"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Nettoyage en cours...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Nettoyer la base de données
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}




