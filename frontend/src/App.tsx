import { Toaster } from "sonner";
import { RPA } from "@/components/RPA";

function App() {
  return (
    <div>
      <RPA />
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            fontFamily: "'Inter', 'JetBrains Mono', monospace",
          },
        }}
      />
    </div>
  );
}

export default App;

