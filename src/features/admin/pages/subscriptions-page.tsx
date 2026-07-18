import { useCallback, useEffect, useState } from "react";
import { CreditCard, Plus, Pencil, Trash2, Check, Loader2, RefreshCw } from "lucide-react";
import { AppShell } from "@/shared/components/layout/app-shell";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
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
  createSubscriptionPlan,
  deleteSubscriptionPlan,
  DURATION_UNIT,
  fetchAdminPlans,
  formatCreditQuota,
  formatPlanPrice,
  planDescriptionLines,
  RESET_PERIOD,
  updateSubscriptionPlan,
  type DurationUnit,
  type ResetPeriod,
  type SubscriptionPlan,
  type SubscriptionPlanPayload,
} from "@/features/student/api/subscription-api";

type PlanDraft = SubscriptionPlanPayload & { id?: string };

const emptyDraft = (): PlanDraft => ({
  name: "",
  price: 0,
  creditAmount: 100,
  resetPeriod: RESET_PERIOD.MONTHLY,
  durationValue: 1,
  durationUnit: DURATION_UNIT.MONTH,
  description: "",
  active: true,
});

export function AdminSubscriptionsPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<PlanDraft | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SubscriptionPlan | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const page = await fetchAdminPlans({ page: 0, size: 50, sortBy: "price", sortDir: "asc" });
      setPlans(page.content ?? []);
    } catch (e) {
      const message = e instanceof ApiError ? e.message : "Không tải được danh sách gói";
      setLoadError(message);
      setPlans([]);
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

  const openEdit = (p: SubscriptionPlan) => {
    setEditing({
      id: p.id,
      name: p.name,
      price: Number(p.price) || 0,
      creditAmount: p.creditAmount,
      resetPeriod: p.resetPeriod,
      durationValue: p.durationValue,
      durationUnit: p.durationUnit,
      description: p.description ?? "",
      active: p.active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast.error("Tên gói không được để trống");
      return;
    }
    setSaving(true);
    try {
      const payload: SubscriptionPlanPayload = {
        name: editing.name,
        price: Number(editing.price) || 0,
        creditAmount: Number(editing.creditAmount) || 0,
        resetPeriod: editing.resetPeriod,
        durationValue: Number(editing.durationValue) || 1,
        durationUnit: editing.durationUnit,
        description: editing.description,
        active: editing.active,
      };
      if (editing.id) {
        await updateSubscriptionPlan(editing.id, payload);
        toast.success("Đã cập nhật gói");
      } else {
        await createSubscriptionPlan(payload);
        toast.success("Đã tạo gói mới");
      }
      setOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Lưu gói thất bại");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSubscriptionPlan(deleteTarget.id);
      toast.success(`Đã xóa gói ${deleteTarget.name}`);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Xóa gói thất bại");
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (p: SubscriptionPlan) => {
    try {
      await updateSubscriptionPlan(p.id, {
        name: p.name,
        price: Number(p.price) || 0,
        creditAmount: p.creditAmount,
        resetPeriod: p.resetPeriod,
        durationValue: p.durationValue,
        durationUnit: p.durationUnit,
        description: p.description,
        active: !p.active,
      });
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Cập nhật trạng thái thất bại");
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <CreditCard className="h-6 w-6" />
              Quản lý gói tháng
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tạo, chỉnh sửa và bật/tắt các gói đăng ký cho sinh viên.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" /> Tạo gói mới
            </Button>
          </div>
        </div>

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
        ) : plans.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Chưa có gói nào. Hãy tạo gói đầu tiên.
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((p) => {
              const features = planDescriptionLines(p.description);
              return (
                <Card key={p.id} className="flex flex-col p-6">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-lg font-semibold">{p.name || "(Chưa đặt tên)"}</div>
                      <div className="mt-1 text-2xl font-bold tabular-nums">
                        {formatPlanPrice(Number(p.price))}
                      </div>
                    </div>
                    {p.active ? (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-success/30 bg-success/10 text-success"
                      >
                        Đang bán
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0">
                        Ẩn
                      </Badge>
                    )}
                  </div>

                  <div className="mt-4 text-xs text-muted-foreground">
                    {formatCreditQuota(p.creditAmount, p.resetPeriod)} · {p.durationValue}{" "}
                    {p.durationUnit === "DAY" ? "ngày" : "tháng"}
                  </div>

                  {features.length > 0 ? (
                    <ul className="mt-4 flex-1 space-y-1.5 text-sm">
                      {features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-4 flex-1 text-sm text-muted-foreground">Không có mô tả</div>
                  )}

                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                    <div className="flex items-center gap-2">
                      <Switch checked={p.active} onCheckedChange={() => void toggleActive(p)} />
                      <span className="text-xs text-muted-foreground">Hiển thị</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(p)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <Modal open={open} onOpenChange={setOpen}>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>{editing?.id ? "Sửa gói" : "Tạo gói mới"}</ModalTitle>
            </ModalHeader>

            {editing && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tên gói</Label>
                  <Input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    placeholder="VD: Pro"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Giá (VND)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={editing.price}
                      onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Số credit</Label>
                    <Input
                      type="number"
                      min={0}
                      value={editing.creditAmount}
                      onChange={(e) =>
                        setEditing({ ...editing, creditAmount: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Chu kỳ reset credit</Label>
                    <Select
                      value={editing.resetPeriod}
                      onValueChange={(v) =>
                        setEditing({ ...editing, resetPeriod: v as ResetPeriod })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={RESET_PERIOD.HOURLY}>Mỗi giờ</SelectItem>
                        <SelectItem value={RESET_PERIOD.DAILY}>Mỗi ngày</SelectItem>
                        <SelectItem value={RESET_PERIOD.MONTHLY}>Mỗi tháng</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Thời hạn gói</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={1}
                        className="w-20"
                        value={editing.durationValue}
                        onChange={(e) =>
                          setEditing({ ...editing, durationValue: Number(e.target.value) })
                        }
                      />
                      <Select
                        value={editing.durationUnit}
                        onValueChange={(v) =>
                          setEditing({ ...editing, durationUnit: v as DurationUnit })
                        }
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={DURATION_UNIT.DAY}>Ngày</SelectItem>
                          <SelectItem value={DURATION_UNIT.MONTH}>Tháng</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mô tả (mỗi dòng một mục)</Label>
                  <Textarea
                    rows={4}
                    value={editing.description ?? ""}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={editing.active}
                    onCheckedChange={(v) => setEditing({ ...editing, active: v })}
                  />
                  <Label className="cursor-pointer">Hiển thị cho sinh viên</Label>
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
              <ModalTitle>Xóa gói đăng ký?</ModalTitle>
            </ModalHeader>
            <p className="text-sm text-muted-foreground">
              Bạn sắp xóa gói <strong className="text-foreground">{deleteTarget?.name}</strong>.
              Hành động này không thể hoàn tác.
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
