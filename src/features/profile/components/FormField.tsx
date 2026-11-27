"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface FieldA11y {
  id: string;
  "aria-invalid": boolean | undefined;
  "aria-describedby": string | undefined;
}

/** ARIA wiring for a control rendered inside <FormField>. */
export function fieldA11y(id: string, opts: { description?: boolean; error?: string }): FieldA11y {
  const describedBy = [opts.description ? `${id}-description` : null, opts.error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ");
  return { id, "aria-invalid": opts.error ? true : undefined, "aria-describedby": describedBy || undefined };
}

interface FormFieldProps {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  error?: string;
  required?: boolean;
  /** Id for the label element (for controls labelled via aria-labelledby). */
  labelId?: string;
  className?: string;
  children: ReactNode;
}

export function FormField({ id, label, description, error, required, labelId, className, children }: FormFieldProps) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id} id={labelId}>
        {label}
        {required ? (
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        ) : null}
        {required ? <span className="sr-only">(required)</span> : null}
      </Label>
      {children}
      {description ? (
        <p id={`${id}-description`} className="text-muted-foreground text-xs">
          {description}
        </p>
      ) : null}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-destructive text-xs font-medium">
      {message}
    </p>
  );
}
