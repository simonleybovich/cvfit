"use client";

import { Redo2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { REUSE_JD_STORAGE_KEY } from "@/lib/reuse-jd-storage-key";

interface ReuseJdButtonProps {
  jobDescription: string;
}

export function ReuseJdButton({ jobDescription }: ReuseJdButtonProps) {
  const router = useRouter();

  function handleClick() {
    sessionStorage.setItem(REUSE_JD_STORAGE_KEY, jobDescription);
    router.push("/");
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleClick}>
      <Redo2 data-icon="inline-start" />
      Reutilizar esta JD
    </Button>
  );
}
