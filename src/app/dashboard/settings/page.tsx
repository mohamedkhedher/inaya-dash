"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  User,
  Key,
  Cloud,
  Brain,
  Bell,
  Shield,
  Check,
  Trash2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";

export default function SettingsPage() {
  const [secretKey, setSecretKey] = useState("");
  const [isCleaningDb, setIsCleaningDb] = useState(false);
  const { toast } = useToast();

  const handleCleanDatabase = async () => {
    if (!secretKey) {
      toast({
        title: "Clé requise",
        description: "Veuillez entrer la clé secrète admin",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("⚠️ ATTENTION: Ceci va supprimer TOUTES les données (patients, dossiers, documents) ! Êtes-vous ABSOLUMENT sûr ?")) {
      return;
    }

    setIsCleaningDb(true);

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
          description: data.error || "Clé secrète incorrecte ou erreur serveur",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors du nettoyage",
        variant: "destructive",
      });
    } finally {
      setIsCleaningDb(false);
    }
  };
  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
          Paramètres
        </h1>
        <p className="text-muted-foreground mt-1">
          Configurez votre application INAYA
        </p>
      </div>

      <div className="grid gap-6">
        {/* Profile Settings */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Profil utilisateur
            </CardTitle>
            <CardDescription>
              Gérez vos informations personnelles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">Nom</Label>
                <Input
                  id="name"
                  defaultValue="Dr. Admin"
                  className="mt-1.5 h-11"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue="admin@inaya.health"
                  className="mt-1.5 h-11"
                />
              </div>
            </div>
            <Button className="gap-2">
              <Check className="w-4 h-4" />
              Sauvegarder
            </Button>
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              Clés API
            </CardTitle>
            <CardDescription>
              Configurez les services externes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* OpenAI */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-medium">OpenAI API</p>
                    <p className="text-sm text-muted-foreground">
                      Pour l&apos;OCR et l&apos;analyse IA
                    </p>
                  </div>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-600">
                  Connecté
                </Badge>
              </div>
              <div>
                <Label htmlFor="openai-key">Clé API</Label>
                <Input
                  id="openai-key"
                  type="password"
                  defaultValue="sk-••••••••••••••••"
                  className="mt-1.5 h-11 font-mono"
                />
              </div>
            </div>

            <Separator />

            {/* Google Drive */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Cloud className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium">Google Drive</p>
                    <p className="text-sm text-muted-foreground">
                      Pour le stockage des documents
                    </p>
                  </div>
                </div>
                <Badge className="bg-amber-500/10 text-amber-600">
                  Non configuré
                </Badge>
              </div>
              <Button variant="outline" className="gap-2">
                <Cloud className="w-4 h-4" />
                Connecter Google Drive
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notifications
            </CardTitle>
            <CardDescription>
              Gérez vos préférences de notification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
              <div>
                <p className="font-medium">Nouveaux dossiers</p>
                <p className="text-sm text-muted-foreground">
                  Recevoir une notification pour chaque nouveau dossier
                </p>
              </div>
              <Button variant="outline" size="sm">
                Activer
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
              <div>
                <p className="font-medium">Analyse terminée</p>
                <p className="text-sm text-muted-foreground">
                  Notification quand l&apos;analyse IA est prête
                </p>
              </div>
              <Button variant="outline" size="sm">
                Activer
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Sécurité
            </CardTitle>
            <CardDescription>
              Gérez la sécurité de votre compte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="current-password">Mot de passe actuel</Label>
              <Input
                id="current-password"
                type="password"
                className="mt-1.5 h-11"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                <Input
                  id="new-password"
                  type="password"
                  className="mt-1.5 h-11"
                />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirmer</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  className="mt-1.5 h-11"
                />
              </div>
            </div>
            <Button variant="outline" className="gap-2">
              <Key className="w-4 h-4" />
              Changer le mot de passe
            </Button>
          </CardContent>
        </Card>

        {/* About */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              À propos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">INAYA</span> -
              Plateforme de gestion des patients
            </p>
            <p>Version 1.0.0 MVP</p>
            <p>© 2024 INAYA Health. Tous droits réservés.</p>
          </CardContent>
        </Card>

        {/* Danger Zone - Clean Database */}
        <Card className="border-red-200 shadow-sm">
          <CardHeader className="bg-red-50 border-b border-red-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-lg text-red-900">Zone Dangereuse</CardTitle>
                <CardDescription className="text-red-600">
                  Actions irréversibles - Utilisez avec précaution
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <p className="font-semibold mb-1">⚠️ Nettoyage complet de la base</p>
                  <p className="mb-2">
                    Cette action supprimera <strong>DÉFINITIVEMENT</strong> :
                  </p>
                  <ul className="list-disc list-inside space-y-1 mb-2">
                    <li>Tous les patients</li>
                    <li>Tous les dossiers médicaux</li>
                    <li>Tous les documents uploadés</li>
                    <li>Toutes les notes et analyses</li>
                  </ul>
                  <p className="font-semibold text-red-700">Cette action est IRRÉVERSIBLE !</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="clean-secret-key" className="text-red-900">
                Clé secrète admin
              </Label>
              <Input
                id="clean-secret-key"
                type="password"
                placeholder="Entrez la clé secrète (inaya-clean-2024)"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                className="font-mono h-11"
              />
            </div>

            <Button
              onClick={handleCleanDatabase}
              disabled={isCleaningDb || !secretKey}
              variant="destructive"
              className="w-full gap-2 h-11"
            >
              {isCleaningDb ? (
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
    </div>
  );
}



