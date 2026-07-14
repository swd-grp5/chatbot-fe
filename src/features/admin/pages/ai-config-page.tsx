import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bot,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
  Sparkles,
  KeyRound,
  CheckCircle2,
} from "lucide-react";
import { AppShell } from "@/shared/components/layout/app-shell";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Switch } from "@/shared/components/ui/switch";
import { Slider } from "@/shared/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/shared/components/ui/modal";
import { ApiError } from "@/shared/lib/api-client";
import { toast } from "@/shared/lib/toast";
import {
  AI_PROVIDER,
  activateModelSetting,
  createModelSetting,
  deleteModelSetting,
  fetchEffectiveAiConfig,
  fetchModelSettings,
  updateModelSetting,
  type AiProvider,
  type EffectiveAiConfig,
  type ModelSetting,
  type ModelSettingPayload,
} from "@/features/admin/api/model-setting-api";

type SettingDraft = {
  id?: string;
  provider: AiProvider;
  chatModel: string;
  embeddingModel: string;
  apiKey: string;
  temperature: number;
  topK: number;
  maxTokens: number;
  active: boolean;
};

const CHAT_MODELS: Record<AiProvider, { value: string; label: string }[]> = {
  gemini: [
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash — nhanh, cân bằng" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro — chất lượng cao" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "gemini-3.5-flash", label: "Gemini 3.5 Flash (mặc định BE)" },
  ],
  openai: [
    { value: "gpt-4o-mini", label: "GPT-4o Mini — cân bằng (mặc định BE)" },
    { value: "gpt-4o", label: "GPT-4o — mạnh" },
    { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
  ],
};

const EMBED_MODELS: Record<AiProvider, { value: string; label: string }[]> = {
  gemini: [{ value: "gemini-embedding-001", label: "gemini-embedding-001" }],
  openai: [
    { value: "text-embedding-3-small", label: "text-embedding-3-small (1536d)" },
    { value: "text-embedding-3-large", label: "text-embedding-3-large (3072d)" },
  ],
};

const emptyDraft = (): SettingDraft => ({
  provider: AI_PROVIDER.GEMINI,
  chatModel: CHAT_MODELS.gemini[0].value,
  embeddingModel: EMBED_MODELS.gemini[0].value,
  apiKey: "",
  temperature: 0.3,
  topK: 5,
  maxTokens: 1024,
  active: true,
});

function normalizeProvider(value: string | null | undefined): AiProvider {
  return value?.toLowerCase() === AI_PROVIDER.OPENAI ? AI_PROVIDER.OPENAI : AI_PROVIDER.GEMINI;
}

function withOption(options: { value: string; label: string }[], value: string) {
  if (!value || options.some((o) => o.value === value)) return options;
  return [{ value, label: `${value} (hiện tại)` }, ...options];
}

export function AdminAIConfigPage() {
  const [settings, setSettings] = useState<ModelSetting[]>([]);
  const [effective, setEffective] = useState<EffectiveAiConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<SettingDraft | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ModelSetting | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [list, eff] = await Promise.all([
        fetchModelSettings(),
        fetchEffectiveAiConfig().catch(() => null),
      ]);
      setSettings(list);
      setEffective(eff);
    } catch (e) {
      const message = e instanceof ApiError ? e.message : "Không tải được cấu hình AI";
      setLoadError(message);
      setSettings([]);
      setEffective(null);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(emptyDraft());
    setOpen(true);
  };

  const openEdit = (s: ModelSetting) => {
    const provider = normalizeProvider(s.provider);
    setEditing({
      id: s.id,
      provider,
      chatModel: s.chatModel,
      embeddingModel: s.embeddingModel,
      apiKey: "",
      temperature: s.temperature ?? 0.3,
      topK: s.topK ?? 5,
      maxTokens: s.maxTokens ?? 1024,
      active: s.active,
    });
    setOpen(true);
  };

  const chatOptions = useMemo(() => {
    if (!editing) return [];
    return withOption(CHAT_MODELS[editing.provider], editing.chatModel);
  }, [editing]);

  const embedOptions = useMemo(() => {
    if (!editing) return [];
    return withOption(EMBED_MODELS[editing.provider], editing.embeddingModel);
  }, [editing]);

  const save = async () => {
    if (!editing) return;
    if (!editing.chatModel.trim() || !editing.embeddingModel.trim()) {
      toast.error("Chat model và embedding model không được để trống");
      return;
    }
    setSaving(true);
    try {
      const payload: ModelSettingPayload = {
        provider: editing.provider,
        chatModel: editing.chatModel.trim(),
        embeddingModel: editing.embeddingModel.trim(),
        temperature: editing.temperature,
        topK: editing.topK,
        maxTokens: editing.maxTokens,
        active: editing.active,
      };
      if (editing.apiKey.trim()) {
        payload.apiKey = editing.apiKey.trim();
      }
      if (editing.id) {
        await updateModelSetting(editing.id, payload);
        toast.success("Đã cập nhật cấu hình model");
      } else {
        await createModelSetting(payload);
        toast.success("Đã tạo cấu hình model");
      }
      setOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Lưu cấu hình thất bại");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteModelSetting(deleteTarget.id);
      toast.success("Đã xóa cấu hình model");
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Xóa cấu hình thất bại");
    } finally {
      setDeleting(false);
    }
  };

  const activate = async (s: ModelSetting) => {
    if (s.active) return;
    setActivatingId(s.id);
    try {
      await activateModelSetting(s.id);
      toast.success(`Đã kích hoạt ${s.chatModel}`);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Kích hoạt thất bại");
    } finally {
      setActivatingId(null);
    }
  };

  const onProviderChange = (provider: AiProvider) => {
    if (!editing) return;
    setEditing({
      ...editing,
      provider,
      chatModel: CHAT_MODELS[provider][0].value,
      embeddingModel: EMBED_MODELS[provider][0].value,
    });
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Bot className="h-6 w-6" />
              Cấu hình AI
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Quản lý preset model (Gemini / OpenAI). Chỉ một cấu hình active được hệ thống dùng.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" /> Tạo cấu hình
            </Button>
          </div>
        </div>

        {effective && (
          <Card className="flex flex-wrap items-center gap-3 border-primary/20 bg-primary/5 p-4 text-sm">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <div className="font-medium">
                Đang hiệu lực:{" "}
                <span className="tabular-nums">
                  {effective.provider} / {effective.chatModel}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Embedding {effective.embeddingModel} · temp {effective.temperature ?? "—"} · topK{" "}
                {effective.topK ?? "—"} · maxTokens {effective.maxTokens ?? "—"} ·{" "}
                {effective.fromDatabase ? "từ DB" : "fallback env"} · API key{" "}
                {effective.apiKeyConfigured ? "đã cấu hình" : "chưa có"}
              </div>
            </div>
          </Card>
        )}

        {loading ? (
          <Card className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải…
          </Card>
        ) : loadError ? (
          <Card className="space-y-3 p-8 text-center">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Thử lại
            </Button>
          </Card>
        ) : settings.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Chưa có cấu hình model. Hãy tạo preset đầu tiên.
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {settings.map((s) => (
              <Card key={s.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold">{s.chatModel}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {s.provider} · {s.embeddingModel}
                    </div>
                  </div>
                  {s.active ? (
                    <Badge
                      variant="outline"
                      className="shrink-0 border-success/30 bg-success/10 text-success"
                    >
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="shrink-0">
                      Inactive
                    </Badge>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div>
                    Temp{" "}
                    <span className="font-medium text-foreground">
                      {s.temperature?.toFixed(2) ?? "—"}
                    </span>
                  </div>
                  <div>
                    Top-K <span className="font-medium text-foreground">{s.topK ?? "—"}</span>
                  </div>
                  <div>
                    Tokens <span className="font-medium text-foreground">{s.maxTokens ?? "—"}</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <KeyRound className="h-3.5 w-3.5" />
                  {s.hasApiKey ? (
                    <span>
                      API key:{" "}
                      <span className="font-mono text-foreground">{s.apiKeyMasked ?? "****"}</span>
                    </span>
                  ) : (
                    <span>Chưa lưu API key (dùng env nếu có)</span>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                  <Button
                    variant={s.active ? "secondary" : "outline"}
                    size="sm"
                    className="gap-1.5"
                    disabled={s.active || activatingId === s.id}
                    onClick={() => void activate(s)}
                  >
                    {activatingId === s.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    {s.active ? "Đang dùng" : "Kích hoạt"}
                  </Button>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(s)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(s)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Modal open={open} onOpenChange={setOpen}>
          <ModalContent className="max-w-lg">
            <ModalHeader>
              <ModalTitle>{editing?.id ? "Sửa cấu hình model" : "Tạo cấu hình model"}</ModalTitle>
            </ModalHeader>

            {editing && (
              <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select
                    value={editing.provider}
                    onValueChange={(v) => onProviderChange(v as AiProvider)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AI_PROVIDER.GEMINI}>Gemini</SelectItem>
                      <SelectItem value={AI_PROVIDER.OPENAI}>OpenAI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Chat model</Label>
                  <Select
                    value={editing.chatModel}
                    onValueChange={(v) => setEditing({ ...editing, chatModel: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {chatOptions.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="mt-1"
                    placeholder="Hoặc nhập model ID tùy chỉnh"
                    value={editing.chatModel}
                    onChange={(e) => setEditing({ ...editing, chatModel: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Embedding model</Label>
                  <Select
                    value={editing.embeddingModel}
                    onValueChange={(v) => setEditing({ ...editing, embeddingModel: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {embedOptions.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="mt-1"
                    placeholder="Hoặc nhập embedding model tùy chỉnh"
                    value={editing.embeddingModel}
                    onChange={(e) => setEditing({ ...editing, embeddingModel: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>API key</Label>
                  <Input
                    type="password"
                    autoComplete="off"
                    placeholder={
                      editing.id
                        ? "Để trống nếu giữ nguyên key hiện tại"
                        : "Tùy chọn — có thể dùng key từ env"
                    }
                    value={editing.apiKey}
                    onChange={(e) => setEditing({ ...editing, apiKey: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Temperature</Label>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {editing.temperature.toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    value={[editing.temperature]}
                    min={0}
                    max={1}
                    step={0.05}
                    onValueChange={([v]) => setEditing({ ...editing, temperature: v })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Top-K</Label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={editing.topK}
                      onChange={(e) =>
                        setEditing({ ...editing, topK: Number(e.target.value) || 1 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max tokens</Label>
                    <Input
                      type="number"
                      min={128}
                      max={8192}
                      value={editing.maxTokens}
                      onChange={(e) =>
                        setEditing({ ...editing, maxTokens: Number(e.target.value) || 128 })
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={editing.active}
                    onCheckedChange={(v) => setEditing({ ...editing, active: v })}
                  />
                  <Label className="cursor-pointer">Đặt làm cấu hình active</Label>
                </div>
              </div>
            )}

            <ModalFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Hủy
              </Button>
              <Button onClick={() => void save()} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang lưu…
                  </>
                ) : (
                  "Lưu"
                )}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        <Modal
          open={!!deleteTarget}
          onOpenChange={(next) => {
            if (!next) setDeleteTarget(null);
          }}
        >
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Xóa cấu hình model?</ModalTitle>
            </ModalHeader>
            <p className="text-sm text-muted-foreground">
              Bạn sắp xóa preset{" "}
              <strong className="text-foreground">{deleteTarget?.chatModel}</strong> (
              {deleteTarget?.provider}). Hành động này không thể hoàn tác.
            </p>
            <ModalFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Hủy
              </Button>
              <Button variant="destructive" onClick={() => void remove()} disabled={deleting}>
                {deleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang xóa…
                  </>
                ) : (
                  "Xóa"
                )}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </AppShell>
  );
}
