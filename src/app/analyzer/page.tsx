import { StockAnalyzer } from "@/components/analyzer/stock-analyzer";

// AnalyzerPage renders the local mock-OHLC stock analyzer workflow.
export default function AnalyzerPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-normal">Stock Analyzer</h1>
        <p className="text-sm text-muted-foreground">Local technical setup using deterministic mock OHLC data</p>
      </div>

      <StockAnalyzer />
    </div>
  );
}
