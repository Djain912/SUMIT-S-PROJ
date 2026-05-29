"use client";

import { useRouter } from "next/navigation";
import { startTransition } from "react";

export function RefreshOnSubmit({ children, action }: { children: React.ReactNode; action: (formData: FormData) => void }) {
  const router = useRouter();

  const handleAction = (formData: FormData) => {
    startTransition(async () => {
      await action(formData);
      router.refresh();
    });
  };

  return (
    <form action={handleAction}>
      {children}
    </form>
  );
}