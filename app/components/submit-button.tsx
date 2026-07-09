"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: ReactNode;
  className: string;
  pendingLabel?: string;
};

export function SubmitButton({ children, className, pendingLabel }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-busy={pending}
      className={`${className} action-button`}
      disabled={pending}
      type="submit"
    >
      {pending ? (
        <>
          <span className="button-spinner" />
          <span>{pendingLabel || "Working..."}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
