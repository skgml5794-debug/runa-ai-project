import { Suspense } from "react";
import { FreshScreen } from "@/components/FreshScreen";
import { NotesScreen } from "@/components/screens/NotesScreen";
import { ScreenFallback } from "@/components/ui/ScreenFallback";

export default function NotesPage() {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <FreshScreen>
        <NotesScreen />
      </FreshScreen>
    </Suspense>
  );
}
