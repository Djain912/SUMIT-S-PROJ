"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

type ServerAction = (formData: FormData) => void;

export function useServerActionWithRefresh(action: ServerAction) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const wrappedAction = (formData: FormData) => {
    startTransition(async () => {
      await action(formData);
      router.refresh();
    });
  };

  return { action: wrappedAction, isPending };
}