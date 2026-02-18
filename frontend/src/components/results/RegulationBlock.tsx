import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { RegulationResult } from "../../lib/api";

interface Props {
  title: string;
  result: RegulationResult;
}

const LEVEL_COLORS: Record<string, string> = {
  major: "bg-red-50 border-red-200",
  significant: "bg-amber-50 border-amber-200",
  minor: "bg-blue-50 border-blue-200",
  none: "bg-gray-50 border-gray-200",
};

const LEVEL_BADGE: Record<string, string> = {
  major: "bg-red-100 text-red-800",
  significant: "bg-amber-100 text-amber-800",
  minor: "bg-blue-100 text-blue-800",
  none: "bg-gray-100 text-gray-800",
};

const LEVEL_LABELS: Record<string, string> = {
  major: "Majeur",
  significant: "Significatif",
  minor: "Mineur",
  none: "Non applicable",
};

export default function RegulationBlock({ title, result }: Props) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  if (!result.applicable) return null;

  const toggle = (i: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  return (
    <Card className={`border ${LEVEL_COLORS[result.level]}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge className={LEVEL_BADGE[result.level]}>
            {LEVEL_LABELS[result.level]}
          </Badge>
        </div>
        {result.reasoning && (
          <p className="text-xs text-gray-600 mt-1">{result.reasoning}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {result.actions.map((action, i) => (
          <div key={i} className="flex items-start gap-3">
            <Checkbox
              id={`action-${title}-${i}`}
              checked={checked.has(i)}
              onCheckedChange={() => toggle(i)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <label
                htmlFor={`action-${title}-${i}`}
                className={`text-sm cursor-pointer ${checked.has(i) ? "line-through text-gray-400" : ""}`}
              >
                {action.action}
              </label>
            </div>
            <Badge variant="outline" className="text-xs shrink-0">
              {action.delay_label}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
