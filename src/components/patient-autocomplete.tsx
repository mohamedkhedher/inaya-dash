"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, User, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface PatientSuggestion {
  id: string;
  patientCode: string;
  fullName: string;
  nationality: string | null;
  _count: { cases: number };
}

interface PatientAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPatientSelect: (patient: PatientSuggestion | null) => void;
  selectedPatient: PatientSuggestion | null;
  disabled?: boolean;
  placeholder?: string;
}

export function PatientAutocomplete({
  value,
  onChange,
  onPatientSelect,
  selectedPatient,
  disabled = false,
  placeholder = "Entrez le nom du patient",
}: PatientAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<PatientSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Recherche des patients
  const searchPatients = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/patients/search?q=${encodeURIComponent(query)}`);
      
      // Check if response is JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.warn("API returned non-JSON response");
        setSuggestions([]);
        setIsOpen(false);
        return;
      }
      
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setSuggestions(data);
        setIsOpen(data.length > 0);
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
      setHighlightedIndex(-1);
    } catch (error) {
      console.error("Search error:", error);
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce de la recherche
  useEffect(() => {
    if (selectedPatient) return;
    
    const debounce = setTimeout(() => {
      searchPatients(value);
    }, 300);

    return () => clearTimeout(debounce);
  }, [value, searchPatients, selectedPatient]);

  // Fermer le dropdown quand on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Navigation au clavier
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (patient: PatientSuggestion) => {
    onPatientSelect(patient);
    onChange(patient.fullName);
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // Si on modifie le texte et qu'un patient était sélectionné, on le désélectionne
    if (selectedPatient) {
      onPatientSelect(null);
    }
  };

  const handleFocus = () => {
    if (suggestions.length > 0 && !selectedPatient) {
      setIsOpen(true);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "pl-10 pr-10 h-12 text-base rounded-xl border-gray-200 focus:border-teal-500 focus:ring-teal-500",
            selectedPatient && "border-teal-500 bg-teal-50"
          )}
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        )}
        {selectedPatient && !isLoading && (
          <Check className="absolute right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-600" />
        )}
      </div>

      {/* Dropdown des suggestions */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-slide-up"
        >
          <div className="px-4 py-2.5 bg-gray-50 border-b">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Patients existants ({suggestions.length})
            </p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {suggestions.map((patient, index) => (
              <button
                key={patient.id}
                type="button"
                onClick={() => handleSelect(patient)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors",
                  highlightedIndex === index
                    ? "bg-teal-50"
                    : "hover:bg-gray-50"
                )}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {patient.fullName}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm text-gray-500 font-mono">
                      {patient.patientCode}
                    </span>
                    {patient.nationality && (
                      <span className="text-sm text-gray-400">
                        • {patient.nationality}
                      </span>
                    )}
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-gray-100 text-gray-600 shrink-0"
                >
                  {patient._count.cases} dossier{patient._count.cases > 1 ? "s" : ""}
                </Badge>
              </button>
            ))}
          </div>

          {/* Option pour créer un nouveau patient */}
          <div className="border-t">
            <button
              type="button"
              onClick={() => {
                onPatientSelect(null);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-emerald-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center flex-shrink-0">
                <Plus className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-emerald-700">
                  Créer un nouveau patient
                </p>
                <p className="text-sm text-gray-500">
                  &quot;{value}&quot; - Nouveau dossier
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Message si aucune suggestion mais recherche en cours */}
      {isOpen && value.length >= 2 && suggestions.length === 0 && !isLoading && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-slide-up"
        >
          <div className="border-t">
            <button
              type="button"
              onClick={() => {
                onPatientSelect(null);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-emerald-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center flex-shrink-0">
                <Plus className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-emerald-700">
                  Créer un nouveau patient
                </p>
                <p className="text-sm text-gray-500">
                  &quot;{value}&quot; - Aucun patient trouvé
                </p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
