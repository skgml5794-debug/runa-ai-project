import { Suspense } from "react";
import { FreshScreen } from "@/components/FreshScreen";
import { NoteDetailScreen } from "@/components/screens/NoteDetailScreen";
import { ScreenFallback } from "@/components/ui/ScreenFallback";

export default function NoteDetailPage() {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <FreshScreen>
        <NoteDetailScreen />
      </FreshScreen>
    </Suspense>
  );
}
