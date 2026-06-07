import { StockAnalyzer } from "@/components/analyzer/stock-analyzer";

// AnalyzerPage renders the research-first stock analyzer workflow with local fallback.
export default function AnalyzerPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-normal">Stock Analyzer</h1>
        <p className="text-sm text-muted-foreground">Research-first technical setup with cached provider data and local fallback</p>
      </div>

      <StockAnalyzer />
    </div>
  );
}
