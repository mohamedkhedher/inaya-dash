"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  FileText,
  MessageSquare,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Case {
  id: string;
  status: string;
  aiPreAnalysis: string | null;
  createdAt: string;
  patient: {
    id: string;
    patientCode: string;
    fullName: string;
  };
  _count: {
    notes: number;
    documents: number;
  };
}

interface Pagination {
  total: number;
  pages: number;
  page: number;
  limit: number;
}

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    pages: 0,
    page: 1,
    limit: 10,
  });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const res = await fetch(`/api/cases?${params}`);
      const data = await res.json();

      setCases(data.cases || []);
      setPagination((prev) => ({ ...prev, ...data.pagination }));
    } catch (error) {
      console.error("Error fetching cases:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ANALYZED":
        return "bg-emerald-500/10 text-emerald-600";
      case "IN_PROGRESS":
        return "bg-blue-500/10 text-blue-600";
      case "COMPLETED":
        return "bg-violet-500/10 text-violet-600";
      default:
        return "bg-amber-500/10 text-amber-600";
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
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
            Dossiers médicaux
          </h1>
          <p className="text-muted-foreground mt-1">
            {pagination.total} dossier(s) au total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[180px] h-11">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="PENDING">En attente</SelectItem>
              <SelectItem value="IN_PROGRESS">En cours</SelectItem>
              <SelectItem value="ANALYZED">Analysé</SelectItem>
              <SelectItem value="COMPLETED">Terminé</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cases List */}
      {loading ? (
        <div className="grid gap-4">
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-start gap-4">
                    <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
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
      ) : cases.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <FolderOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold mb-2">Aucun dossier trouvé</h3>
            <p className="text-muted-foreground mb-6">
              {statusFilter !== "all"
                ? "Aucun dossier avec ce statut"
                : "Créez un patient pour commencer"}
            </p>
            <Link href="/dashboard/patients/new">
              <Button className="gap-2">
                <FolderOpen className="w-4 h-4" />
                Créer un dossier
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {cases.map((caseItem) => (
            <Link
              key={caseItem.id}
              href={`/dashboard/patients/${caseItem.patient.id}`}
            >
              <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <FolderOpen className="w-6 h-6 text-primary" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-base lg:text-lg group-hover:text-primary transition-colors">
                            Dossier du{" "}
                            {format(new Date(caseItem.createdAt), "dd MMM yyyy", {
                              locale: fr,
                            })}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <User className="w-3.5 h-3.5" />
                            <span>{caseItem.patient.fullName}</span>
                            <span className="font-mono">
                              ({caseItem.patient.patientCode})
                            </span>
                          </div>
                        </div>
                        <Badge className={`shrink-0 ${getStatusColor(caseItem.status)}`}>
                          {getStatusLabel(caseItem.status)}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          {caseItem._count.documents} document(s)
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {caseItem._count.notes} note(s)
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(caseItem.createdAt), "HH:mm")}
                        </span>
                      </div>

                      {/* AI Analysis preview */}
                      {caseItem.aiPreAnalysis && (
                        <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                          {caseItem.aiPreAnalysis.substring(0, 150)}...
                        </p>
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
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} sur {pagination.pages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={pagination.page === 1}
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
              }
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
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}






