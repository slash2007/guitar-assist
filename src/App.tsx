import { AppShell } from "./ui/AppShell";
import { StoreProvider } from "./ui/store";

export function App() {
  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  );
}
