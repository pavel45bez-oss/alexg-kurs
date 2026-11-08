import { createRoot } from "react-dom/client";
import { Pill, Row, useCanvasState } from "./canvas-shim";
import Course from "./Course";
import FullCourse from "./full/FullCourse";

function App() {
  const [tab, setTab] = useCanvasState<"full" | "short">("app:tab", "full");
  return (
    <div>
      <Row gap={8} style={{ marginBottom: 16 }}>
        <Pill active={tab === "full"} onClick={() => setTab("full")}>Полный курс (10 часов, все темы)</Pill>
        <Pill active={tab === "short"} onClick={() => setTab("short")}>Курс 3 дня + тесты по 28 парам</Pill>
      </Row>
      {tab === "full" ? <FullCourse /> : <Course />}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
