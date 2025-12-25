"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FolderOpen,
  UserPlus,
  Activity,
  Clock,
  ArrowRight,
  TrendingUp,
  FileText,
  Sparkles,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
  totalPatients: number;
  totalCases: number;
  pendingCases: number;
  analyzedCases: number;
}

interface RecentPatient {
  id: string;
  patientCode: string;
  fullName: string;
  createdAt: string;
  _count: { cases: number };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentPatients, setRecentPatients] = useState<RecentPatient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [patientsRes, casesRes] = await Promise.all([
          fetch("/api/patients?limit=5"),
          fetch("/api/cases?limit=100"),
        ]);

        const patientsData = await patientsRes.json();
        const casesData = await casesRes.json();

        setRecentPatients(patientsData.patients || []);
        
        const cases = casesData.cases || [];
        setStats({
          totalPatients: patientsData.pagination?.total || 0,
          totalCases: casesData.pagination?.total || 0,
          pendingCases: cases.filter((c: { status: string }) => c.status === "PENDING").length,
          analyzedCases: cases.filter((c: { status: string }) => c.status === "ANALYZED").length,
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const statCards = [
    {
      title: "Total Patients",
      value: stats?.totalPatients || 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      title: "Dossiers",
      value: stats?.totalCases || 0,
      icon: FolderOpen,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
      gradient: "from-emerald-500 to-teal-500",
    },
    {
      title: "En attente",
      value: stats?.pendingCases || 0,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
      gradient: "from-amber-500 to-orange-500",
    },
    {
      title: "Analysés",
      value: stats?.analyzedCases || 0,
      icon: Activity,
      color: "text-violet-600",
      bgColor: "bg-violet-100",
      gradient: "from-violet-500 to-purple-500",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 lg:text-3xl">
            Tableau de bord
          </h1>
          <p className="text-gray-500 mt-1">
            Bienvenue sur INAYA - Votre assistant de gestion médicale
          </p>
        </div>
        <Link href="/dashboard/patients/new">
          <Button className="w-full sm:w-auto gap-2 h-12 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-xl shadow-lg shadow-teal-500/25">
            <UserPlus className="w-5 h-5" />
            Nouveau Patient
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array(4)
              .fill(0)
              .map((_, i) => (
                <Card key={i} className="border-gray-200 rounded-2xl">
                  <CardContent className="p-5">
                    <Skeleton className="h-12 w-12 rounded-xl mb-4" />
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </CardContent>
                </Card>
              ))
          : statCards.map((stat, i) => (
              <Card
                key={i}
                className="border-gray-200 rounded-2xl hover:shadow-lg transition-all card-hover overflow-hidden"
              >
                <CardContent className="p-5 relative">
                  <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
                    <div className={`w-full h-full bg-gradient-to-br ${stat.gradient} rounded-full blur-2xl`} />
                  </div>
                  <div
                    className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center mb-4`}
                  >
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{stat.title}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Patients */}
        <Card className="border-gray-200 rounded-2xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-3 bg-gradient-to-r from-gray-50 to-slate-50 border-b">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Patients récents
            </CardTitle>
            <Link href="/dashboard/patients">
              <Button variant="ghost" size="sm" className="gap-1 text-gray-600 hover:text-gray-900">
                Voir tout
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-4">
                {Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
              </div>
            ) : recentPatients.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
                <p className="font-medium text-gray-900 mb-1">Aucun patient</p>
                <p className="text-sm text-gray-500 mb-4">Commencez par ajouter votre premier patient</p>
                <Link href="/dashboard/patients/new">
                  <Button size="sm" className="gap-2 rounded-lg">
                    <UserPlus className="w-4 h-4" />
                    Ajouter un patient
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentPatients.map((patient) => (
                  <Link
                    key={patient.id}
                    href={`/dashboard/patients/${patient.id}`}
                    className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center">
                      <span className="text-lg font-semibold text-teal-700">
                        {patient.fullName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{patient.fullName}</p>
                      <p className="text-sm text-gray-500 font-mono">
                        {patient.patientCode}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 bg-gray-100 text-gray-600">
                      {patient._count.cases} dossier(s)
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-gray-200 rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 to-slate-50 border-b">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Actions rapides
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid gap-3">
            <Link href="/dashboard/patients/new">
              <Button
                variant="outline"
                className="w-full justify-start gap-4 h-16 text-left rounded-xl border-gray-200 hover:bg-emerald-50 hover:border-emerald-200 group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <UserPlus className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Nouveau patient</p>
                  <p className="text-xs text-gray-500">
                    Enregistrer un nouveau patient
                  </p>
                </div>
              </Button>
            </Link>
            <Link href="/dashboard/patients">
              <Button
                variant="outline"
                className="w-full justify-start gap-4 h-16 text-left rounded-xl border-gray-200 hover:bg-blue-50 hover:border-blue-200 group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Liste des patients</p>
                  <p className="text-xs text-gray-500">
                    Voir tous les patients enregistrés
                  </p>
                </div>
              </Button>
            </Link>
            <Link href="/dashboard/cases">
              <Button
                variant="outline"
                className="w-full justify-start gap-4 h-16 text-left rounded-xl border-gray-200 hover:bg-violet-50 hover:border-violet-200 group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileText className="w-6 h-6 text-violet-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Dossiers médicaux</p>
                  <p className="text-xs text-gray-500">
                    Gérer les dossiers et analyses
                  </p>
                </div>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Info Banner */}
      <Card className="border-0 rounded-2xl overflow-hidden bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 shadow-xl">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white text-lg">Analyse IA disponible</h3>
              <p className="text-white/90 text-sm mt-1">
                Téléchargez des documents médicaux pour obtenir une pré-analyse automatique par intelligence artificielle.
              </p>
            </div>
            <Link href="/dashboard/patients/new">
              <Button className="w-full sm:w-auto bg-white text-teal-600 hover:bg-white/90 rounded-xl font-semibold shadow-lg">
                Commencer
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
