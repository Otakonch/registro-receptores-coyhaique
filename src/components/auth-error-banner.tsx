"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AlertCircle, X } from "lucide-react";

export function AuthErrorBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(searchParams.get("auth") === "error");
  }, [searchParams]);

  if (!visible) return null;

  function dismiss() {
    setVisible(false);
    router.replace("/", { scroll: false });
  }

  return (
    <div className="bg-red-50 border-b border-red-200">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-sm text-red-800 flex-1">
          No se pudo iniciar sesión con ClaveÚnica. Inténtalo nuevamente.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="text-red-500 hover:text-red-700 p-0.5"
          aria-label="Cerrar aviso"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
