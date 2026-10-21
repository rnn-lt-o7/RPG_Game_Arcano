import { createFileRoute } from "@tanstack/react-router";
import { SorteArcana } from "@/components/game/sorte-arcana";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <SorteArcana />;
}
