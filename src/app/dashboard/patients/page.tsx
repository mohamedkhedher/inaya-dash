"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  UserPlus,
  Users,
  ChevronLeft,
  ChevronRight,
  Calendar,
  FolderOpen,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Patient {
  id: string;
  patientCode: string;
  fullName: string;
  nationality: string | null;
  passportNumber: string | null;
  createdAt: string;
  _count: { cases: number };
  cases: Array<{
    id: string;
    status: string;
    createdAt: string;
  }>;
}

interface Pagination {
  total: number;
  pages: number;
  page: number;
  limit: number;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    pages: 0,
    page: 1,
    limit: 10,
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.set("search", search);

      const res = await fetch(`/api/patients?${params}`);
      const data = await res.json();

      setPatients(data.patients || []);
      setPagination((prev) => ({ ...prev, ...data.pagination }));
    } catch (error) {
      console.error("Error fetching patients:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search]);

  useEffect(() => {
    const debounce = setTimeout(fetchPatients, 300);
    return () => clearTimeout(debounce);
  }, [fetchPatients]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ANALYZED":
        return "bg-emerald-100 text-emerald-700";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-700";
      case "COMPLETED":
        return "bg-violet-100 text-violet-700";
      default:
        return "bg-amber-100 text-amber-700";
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 lg:text-3xl">
            Patients
          </h1>
          <p className="text-gray-500 mt-1">
            {pagination.total} patient(s) enregistré(s)
          </p>
        </div>
        <Link href="/dashboard/patients/new">
          <Button className="w-full sm:w-auto gap-2 h-12 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-xl shadow-lg shadow-teal-500/25">
            <UserPlus className="w-5 h-5" />
            Nouveau Patient
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          placeholder="Rechercher par nom, code patient ou passeport..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-12 h-14 text-base bg-white border-gray-200 rounded-xl focus:border-teal-500 focus:ring-teal-500 shadow-sm"
        />
      </div>

      {/* Patients List */}
      {loading ? (
        <div className="grid gap-4">
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <Card key={i} className="border-gray-200 rounded-2xl">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <Skeleton className="w-14 h-14 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      ) : patients.length === 0 ? (
        <Card className="border-gray-200 rounded-2xl">
          <CardContent className="py-16 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Users className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun patient trouvé</h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              {search
                ? "Aucun résultat pour cette recherche. Essayez d'autres termes."
                : "Commencez par ajouter votre premier patient dans le système."}
            </p>
            <Link href="/dashboard/patients/new">
              <Button className="gap-2 rounded-xl">
                <UserPlus className="w-4 h-4" />
                Ajouter un patient
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {patients.map((patient) => (
            <Link key={patient.id} href={`/dashboard/patients/${patient.id}`}>
              <Card className="border-gray-200 rounded-2xl hover:shadow-lg hover:border-teal-200 transition-all cursor-pointer group">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center shrink-0 group-hover:from-teal-200 group-hover:to-emerald-200 transition-colors">
                      <span className="text-xl font-bold text-teal-700">
                        {patient.fullName.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-lg text-gray-900 group-hover:text-teal-700 transition-colors truncate">
                            {patient.fullName}
                          </h3>
                          <p className="text-sm text-gray-500 font-mono">
                            {patient.patientCode}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className="shrink-0 gap-1.5 bg-gray-100 text-gray-600 hidden sm:flex"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          {patient._count.cases} dossier(s)
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm text-gray-500">
                        {patient.nationality && (
                          <span className="flex items-center gap-1.5">
                            🌍 {patient.nationality}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(patient.createdAt), "dd MMM yyyy", {
                            locale: fr,
                          })}
                        </span>
                      </div>

                      {/* Mobile badge + status */}
                      <div className="flex items-center gap-2 mt-3 sm:hidden">
                        <Badge variant="secondary" className="gap-1 bg-gray-100 text-gray-600">
                          <FolderOpen className="w-3 h-3" />
                          {patient._count.cases}
                        </Badge>
                        {patient.cases[0] && (
                          <Badge className={getStatusColor(patient.cases[0].status)}>
                            {getStatusLabel(patient.cases[0].status)}
                          </Badge>
                        )}
                      </div>

                      {/* Desktop status */}
                      {patient.cases[0] && (
                        <div className="hidden sm:flex items-center gap-2 mt-3">
                          <Badge className={getStatusColor(patient.cases[0].status)}>
                            {getStatusLabel(patient.cases[0].status)}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            Dernier dossier:{" "}
                            {format(
                              new Date(patient.cases[0].createdAt),
                              "dd/MM/yyyy"
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200">
          <p className="text-sm text-gray-600">
            Page <span className="font-medium">{pagination.page}</span> sur{" "}
            <span className="font-medium">{pagination.pages}</span>
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={pagination.page === 1}
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
              }
              className="h-10 w-10 rounded-lg"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={pagination.page >= pagination.pages}
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
              }
              className="h-10 w-10 rounded-lg"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
