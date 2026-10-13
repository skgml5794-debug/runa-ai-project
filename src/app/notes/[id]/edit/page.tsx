import { Suspense } from "react";
import { FreshScreen } from "@/components/FreshScreen";
import { NoteEditScreen } from "@/components/screens/NoteEditScreen";
import { ScreenFallback } from "@/components/ui/ScreenFallback";

export default function NoteEditPage() {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <FreshScreen>
        <NoteEditScreen />
      </FreshScreen>
    </Suspense>
  );
}
