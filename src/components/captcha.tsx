"use client";

import { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface CaptchaProps {
  onVerified: (verified: boolean) => void;
}

function generateChallenge() {
  const ops = ["+", "-", "×"] as const;
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, answer: number;

  if (op === "+") {
    a = Math.floor(Math.random() * 15) + 1;
    b = Math.floor(Math.random() * 15) + 1;
    answer = a + b;
  } else if (op === "-") {
    a = Math.floor(Math.random() * 15) + 10;
    b = Math.floor(Math.random() * 9) + 1;
    answer = a - b;
  } else {
    a = Math.floor(Math.random() * 9) + 2;
    b = Math.floor(Math.random() * 5) + 2;
    answer = a * b;
  }

  return { question: `${a} ${op} ${b} = ?`, answer };
}

export function Captcha({ onVerified }: CaptchaProps) {
  const [challenge, setChallenge] = useState(generateChallenge);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  const refresh = useCallback(() => {
    setChallenge(generateChallenge());
    setInput("");
    setStatus("idle");
    onVerified(false);
  }, [onVerified]);

  useEffect(() => {
    const val = parseInt(input);
    if (isNaN(val)) {
      if (status !== "idle") { setStatus("idle"); onVerified(false); }
      return;
    }
    if (val === challenge.answer) {
      setStatus("ok");
      onVerified(true);
    } else {
      setStatus("error");
      onVerified(false);
    }
  }, [input, challenge.answer]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2">
          {/* Pregunta visual tipo "imagen" */}
          <div
            className="select-none px-4 py-2.5 rounded-md font-mono font-bold text-base tracking-widest border-2 bg-gray-50"
            style={{
              letterSpacing: "0.15em",
              borderColor: status === "ok" ? "#16a34a" : status === "error" ? "#dc2626" : "#d1d5db",
              color: "#1f2937",
              minWidth: 110,
              textAlign: "center",
              userSelect: "none",
            }}
          >
            {challenge.question}
          </div>
          <Input
            type="number"
            placeholder="Respuesta"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className={`w-28 text-center font-mono ${
              status === "ok"
                ? "border-green-500 focus-visible:ring-green-400"
                : status === "error"
                ? "border-red-400 focus-visible:ring-red-300"
                : ""
            }`}
            autoComplete="off"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={refresh}
            title="Nueva pregunta"
            className="text-gray-400 hover:text-gray-600 h-9 w-9 p-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="h-4">
        {status === "ok" && (
          <p className="text-xs text-green-600 font-medium">✓ Verificación correcta</p>
        )}
        {status === "error" && input.length > 0 && (
          <p className="text-xs text-red-500">Respuesta incorrecta, intenta de nuevo</p>
        )}
        {status === "idle" && (
          <p className="text-xs text-gray-400">Resuelve la operación para continuar</p>
        )}
      </div>
    </div>
  );
}
