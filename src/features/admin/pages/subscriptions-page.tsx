import { useEffect, useState } from "react";
import { CreditCard, Plus, Pencil, Trash2, Check } from "lucide-react";
import { AppShell } from "@/shared/components/layout/app-shell";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "@/shared/components/ui/modal";
import { toast } from "@/shared/lib/toast";
import {
  DEFAULT_PLANS,
  formatPlanPrice,
  loadPlans,
  savePlans,
  type SubscriptionPlan,
} from "@/features/student/lib/subscriptions";

export function AdminSubscriptionsPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(DEFAULT_PLANS);
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setPlans(loadPlans());
  }, []);

  const persist = (next: SubscriptionPlan[]) => {
    setPlans(next);
    savePlans(next);
  };

  const openCreate = () => {
    setEditing({
      id: `p-${Date.now()}`,
      name: "",
      pricePerMonth: 0,
      questionsPerMonth: 100,
      features: [],
      active: true,
    });
    setOpen(true);
  };

  const openEdit = (p: SubscriptionPlan) => {
    setEditing({ ...p });
    setOpen(true);
  };

  const save = () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast.error("Tên gói không được để trống");
      return;
    }
    const exists = plans.find((p) => p.id === editing.id);
    persist(exists ? plans.map((p) => (p.id === editing.id ? editing : p)) : [...plans, editing]);
    toast.success(exists ? "Đã cập nhật gói" : "Đã tạo gói mới");
    setOpen(false);
  };

  const remove = (id: string) => {
    persist(plans.filter((p) => p.id !== id));
    toast.success("Đã xóa gói");
  };

  const toggleActive = (id: string) => {
    persist(plans.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <CreditCard className="h-6 w-6" />
              Quản lý gói tháng
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tạo, chỉnh sửa và bật/tắt các gói đăng ký cho sinh viên.
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Tạo gói mới
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {plans.map((p) => (
            <Card key={p.id} className="flex flex-col p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-semibold">{p.name || "(Chưa đặt tên)"}</div>
                  <div className="mt-1 text-2xl font-bold tabular-nums">{formatPlanPrice(p.pricePerMonth)}</div>
                </div>
                {p.active ? (
                  <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
                    Đang bán
                  </Badge>
                ) : (
                  <Badge variant="outline">Ẩn</Badge>
                )}
              </div>

              <div className="mt-4 text-xs text-muted-foreground">
                {p.questionsPerMonth.toLocaleString("vi-VN")} câu hỏi / tháng
              </div>

              <ul className="mt-4 flex-1 space-y-1.5 text-sm">
                {p.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 text-success" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                <div className="flex items-center gap-2">
                  <Switch checked={p.active} onCheckedChange={() => toggleActive(p.id)} />
                  <span className="text-xs text-muted-foreground">Hiển thị</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => remove(p.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Modal open={open} onOpenChange={setOpen}>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>{editing && plans.find((p) => p.id === editing.id) ? "Sửa gói" : "Tạo gói mới"}</ModalTitle>
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
                    <Label>Giá (VND/tháng)</Label>
                    <Input
                      type="number" min={0}
                      value={editing.pricePerMonth}
                      onChange={(e) => setEditing({ ...editing, pricePerMonth: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Số câu hỏi/tháng</Label>
                    <Input
                      type="number" min={0}
                      value={editing.questionsPerMonth}
                      onChange={(e) => setEditing({ ...editing, questionsPerMonth: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tính năng (mỗi dòng một mục)</Label>
                  <Textarea
                    rows={4}
                    value={editing.features.join("\n")}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        features: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                      })
                    }
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
              <Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
              <Button onClick={save}>Lưu</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </AppShell>
  );
}
