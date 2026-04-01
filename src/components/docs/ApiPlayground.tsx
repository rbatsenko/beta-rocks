"use client";

import { useState, useCallback } from "react";
import { Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Field {
  name: string;
  label: string;
  placeholder: string;
  required?: boolean;
  defaultValue?: string;
}

interface ApiPlaygroundProps {
  method: "GET" | "POST";
  buildUrl: (params: Record<string, string>) => string;
  fields: Field[];
  bodyFields?: Field[];
}

export function ApiPlayground({ method, buildUrl, fields, bodyFields }: ApiPlaygroundProps) {
  const [params, setParams] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const f of [...fields, ...(bodyFields || [])]) {
      if (f.defaultValue) initial[f.name] = f.defaultValue;
    }
    return initial;
  });
  const [response, setResponse] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = useCallback((name: string, value: string) => {
    setParams((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    setResponse(null);
    setStatus(null);

    try {
      const url = buildUrl(params);
      const options: RequestInit = { method };

      if (method === "POST" && bodyFields) {
        const body: Record<string, any> = {};
        for (const f of bodyFields) {
          const val = params[f.name];
          if (val) {
            if (f.name === "rating") {
              body[f.name] = parseInt(val, 10);
            } else {
              body[f.name] = val;
            }
          }
        }
        options.headers = { "Content-Type": "application/json" };
        options.body = JSON.stringify(body);
      }

      const res = await fetch(url, options);
      setStatus(res.status);
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setResponse(`Error: ${err instanceof Error ? err.message : "Request failed"}`);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [params, method, buildUrl, bodyFields]);

  const allFields = bodyFields ? [...fields, ...bodyFields] : fields;

  return (
    <div className="space-y-3">
        <div className="grid gap-2">
          {allFields.map((f) => (
            <div key={f.name} className="flex items-center gap-2">
              <label className="text-xs font-mono w-20 shrink-0 text-muted-foreground">
                {f.label}
                {f.required && <span className="text-amber-400">*</span>}
              </label>
              <input
                type="text"
                placeholder={f.placeholder}
                value={params[f.name] || ""}
                onChange={(e) => handleChange(f.name, e.target.value)}
                className="flex-1 px-2 py-1.5 text-xs font-mono rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          ))}
        </div>
        <Button
          onClick={handleSubmit}
          disabled={loading}
          size="sm"
          className="gap-1.5"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          {loading ? "Sending..." : "Send request"}
        </Button>
        {response && (
          <div className="rounded border border-border overflow-hidden">
            <div className="px-3 py-1.5 bg-muted/50 border-b border-border flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Response</span>
              {status && (
                <span className={`text-xs font-mono ${status < 300 ? "text-emerald-400" : status < 500 ? "text-amber-400" : "text-red-400"}`}>
                  {status}
                </span>
              )}
            </div>
            <pre className="p-3 bg-muted/30 overflow-x-auto text-xs leading-relaxed max-h-80 overflow-y-auto">
              <code>{response}</code>
            </pre>
          </div>
        )}
    </div>
  );
}
