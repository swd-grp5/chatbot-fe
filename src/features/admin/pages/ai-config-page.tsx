import { useEffect, useState } from "react";
import { Bot, Save, Sparkles } from "lucide-react";
import { AppShell } from "@/shared/components/layout/app-shell";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card } from "@/shared/components/ui/card";
import { Slider } from "@/shared/components/ui/slider";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { toast } from "@/shared/lib/toast";

import { migrateStorageKey, storageKey } from "@/shared/lib/storage-keys";

const STORAGE_KEY = storageKey("ai-config");

type AIConfig = {
  model: string;
  temperature: number;
  maxTokens: number;
  topK: number;
  systemPrompt: string;
  embeddingModel: string;
  chunkSize: number;
  chunkOverlap: number;
};

const DEFAULT_CONFIG: AIConfig = {
  model: "google/gemini-2.5-flash",
  temperature: 0.3,
  maxTokens: 1024,
  topK: 5,
  systemPrompt:
    "Bạn là trợ lý học thuật. Trả lời câu hỏi dựa trên các trích đoạn tài liệu được cung cấp. Luôn ghi rõ nguồn trích dẫn.",
  embeddingModel: "text-embedding-3-small",
  chunkSize: 800,
  chunkOverlap: 120,
};

const MODELS = [
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash — nhanh, cân bằng" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro — chất lượng cao" },
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite — tiết kiệm" },
  { value: "openai/gpt-5", label: "GPT-5 — mạnh nhất" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini — cân bằng" },
];

const EMBED_MODELS = [
  { value: "text-embedding-3-small", label: "text-embedding-3-small (1536d)" },
  { value: "text-embedding-3-large", label: "text-embedding-3-large (3072d)" },
];

export function AdminAIConfigPage() {
  const [config, setConfig] = useState<AIConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    migrateStorageKey(STORAGE_KEY, "sdn-ai-config");
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(raw) });
    } catch { /* ignore */ }
  }, []);

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    toast.success("Đã lưu cấu hình AI");
  };

  const reset = () => {
    setConfig(DEFAULT_CONFIG);
    toast.success("Đã khôi phục mặc định");
  };

  const update = <K extends keyof AIConfig>(key: K, value: AIConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Bot className="h-6 w-6" />
              Cấu hình AI
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Cài đặt mô hình sinh, embedding và tham số tra cứu tài liệu cho toàn hệ thống.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={reset}>Mặc định</Button>
            <Button onClick={save} className="gap-2">
              <Save className="h-4 w-4" /> Lưu
            </Button>
          </div>
        </div>

        <Card className="space-y-5 p-6">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" /> Mô hình sinh câu trả lời
          </div>

          <div className="space-y-2">
            <Label>Model</Label>
            <Select value={config.model} onValueChange={(v) => update("model", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Temperature</Label>
                <span className="text-xs tabular-nums text-muted-foreground">{config.temperature.toFixed(2)}</span>
              </div>
              <Slider
                value={[config.temperature]}
                min={0} max={1} step={0.05}
                onValueChange={([v]) => update("temperature", v)}
              />
              <p className="text-[11px] text-muted-foreground">Thấp = bám tài liệu. Cao = sáng tạo hơn.</p>
            </div>
            <div className="space-y-2">
              <Label>Max tokens</Label>
              <Input
                type="number" min={128} max={8192}
                value={config.maxTokens}
                onChange={(e) => update("maxTokens", Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>System prompt</Label>
            <Textarea
              rows={4}
              value={config.systemPrompt}
              onChange={(e) => update("systemPrompt", e.target.value)}
            />
          </div>
        </Card>

        <Card className="space-y-5 p-6">
          <div className="text-sm font-medium">Embedding & Chunking</div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Embedding model</Label>
              <Select value={config.embeddingModel} onValueChange={(v) => update("embeddingModel", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EMBED_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Top-K chunks</Label>
              <Input
                type="number" min={1} max={20}
                value={config.topK}
                onChange={(e) => update("topK", Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Chunk size (tokens)</Label>
              <Input
                type="number" min={100} max={4000}
                value={config.chunkSize}
                onChange={(e) => update("chunkSize", Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Chunk overlap (tokens)</Label>
              <Input
                type="number" min={0} max={1000}
                value={config.chunkOverlap}
                onChange={(e) => update("chunkOverlap", Number(e.target.value))}
              />
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
