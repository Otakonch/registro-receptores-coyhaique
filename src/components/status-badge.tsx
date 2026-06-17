"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, FileEdit, XCircle } from "lucide-react";

const STATUS_CONFIG = {
  DRAFT: {
    label: "Borrador",
    variant: "outline" as const,
    icon: FileEdit,
    className: "border-gray-300 text-gray-600",
  },
  PENDING: {
    label: "En Revisión",
    variant: "pending" as const,
    icon: Clock,
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  APPROVED: {
    label: "Aprobada",
    variant: "success" as const,
    icon: CheckCircle,
    className: "bg-green-100 text-green-800 border-green-200",
  },
  REJECTED: {
    label: "Rechazada",
    variant: "destructive" as const,
    icon: XCircle,
    className: "bg-red-100 text-red-800 border-red-200",
  },
};

interface StatusBadgeProps {
  status: keyof typeof STATUS_CONFIG;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}
