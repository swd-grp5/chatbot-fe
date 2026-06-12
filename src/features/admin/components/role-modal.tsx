import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/shared/components/ui/modal";
import {
  createRole,
  fetchRoleById,
  updateRole,
  type RoleResponse,
} from "@/features/admin/api/role-api";
import { activeStyles } from "@/features/lecturer/components/documents-table-ui";
import { ApiError } from "@/shared/lib/api-client";
import { formatDateTimeDMY } from "@/shared/lib/format-time";
import { cn } from "@/shared/lib/utils";
import { toast } from "@/shared/lib/toast";

export type RoleModalMode = "create" | "edit" | "view";

type RoleModalProps = {
  mode: RoleModalMode | null;
  roleId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void | Promise<void>;
  onEditRequest?: (roleId: string) => void;
};

function DetailField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export function RoleModal({
  mode,
  roleId = null,
  open,
  onOpenChange,
  onSaved,
  onEditRequest,
}: RoleModalProps) {
  const [detail, setDetail] = useState<RoleResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setDetail(null);
      setLoadingDetail(false);
      return;
    }

    if (mode === "create") {
      setLoadingDetail(false);
      setDetail(null);
      setCode("");
      setName("");
      setDescription("");
      setActive(true);
      return;
    }

    if ((mode === "edit" || mode === "view") && roleId) {
      let cancelled = false;
      setLoadingDetail(true);
      setDetail(null);

      void fetchRoleById(roleId)
        .then((role) => {
          if (cancelled) return;
          setDetail(role);
          setCode(role.code);
          setName(role.name);
          setDescription(role.description ?? "");
          setActive(role.active);
        })
        .catch((e) => {
          if (cancelled) return;
          toast.error(e instanceof ApiError ? e.message : "Không tải được chi tiết vai trò");
          onOpenChange(false);
        })
        .finally(() => {
          setLoadingDetail(false);
        });

      return () => {
        cancelled = true;
      };
    }

    setLoadingDetail(false);
  }, [open, mode, roleId, onOpenChange]);

  const handleSubmit = async () => {
    const trimmedCode = code.trim();
    const trimmedName = name.trim();

    if (!trimmedCode) {
      toast.error("Mã vai trò không được để trống");
      return;
    }
    if (!trimmedName) {
      toast.error("Tên vai trò không được để trống");
      return;
    }
    if (!detail) return;

    setSubmitting(true);
    try {
      await updateRole(detail.id, {
        code: trimmedCode,
        name: trimmedName,
        description: description.trim(),
        active,
      });
      toast.success("Đã cập nhật vai trò");

      await onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Lưu thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = async () => {
    const trimmedCode = code.trim();
    const trimmedName = name.trim();

    if (!trimmedCode) {
      toast.error("Mã vai trò không được để trống");
      return;
    }
    if (!trimmedName) {
      toast.error("Tên vai trò không được để trống");
      return;
    }

    setSubmitting(true);
    try {
      await createRole({
        code: trimmedCode,
        name: trimmedName,
        description: description.trim(),
        active,
      });
      toast.success("Đã thêm vai trò");

      await onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Lưu thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    mode === "view" ? "Chi tiết vai trò" : mode === "edit" ? "Sửa vai trò" : "Thêm vai trò";

  const status = detail
    ? detail.active
      ? activeStyles.active
      : activeStyles.inactive
    : null;

  return (
    <Modal open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <ModalContent className="sm:max-w-md">
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
        </ModalHeader>

        {loadingDetail && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải...
          </div>
        )}

        {!loadingDetail && mode === "view" && detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <DetailField label="Mã vai trò">
                <span className="font-mono font-medium">{detail.code}</span>
              </DetailField>
              <DetailField label="Kích hoạt">
                {status && (
                  <Badge variant="outline" className={cn("font-normal", status.className)}>
                    {status.label}
                  </Badge>
                )}
              </DetailField>
            </div>
            <DetailField label="Tên vai trò">
              <span className="font-medium">{detail.name}</span>
            </DetailField>
            <DetailField label="Mô tả">
              {detail.description?.trim() ? (
                <p className="whitespace-pre-wrap text-muted-foreground">{detail.description.trim()}</p>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </DetailField>
            <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
              <DetailField label="Ngày tạo">{formatDateTimeDMY(detail.createdAt)}</DetailField>
              <DetailField label="Cập nhật">{formatDateTimeDMY(detail.updatedAt)}</DetailField>
            </div>
          </div>
        )}

        {!loadingDetail && mode !== "view" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="role-code">Mã vai trò *</Label>
              <Input
                id="role-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="VD: ADMIN"
                disabled={submitting}
                className="font-mono uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-name">Tên vai trò *</Label>
              <Input
                id="role-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tên hiển thị"
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-description">Mô tả</Label>
              <Textarea
                id="role-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả ngắn"
                rows={3}
                disabled={submitting}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <div>
                <Label htmlFor="role-active" className="text-sm">
                  Kích hoạt
                </Label>
                <p className="text-xs text-muted-foreground">
                  Vai trò có thể gán cho người dùng
                </p>
              </div>
              <Switch
                id="role-active"
                checked={active}
                onCheckedChange={setActive}
                disabled={submitting}
              />
            </div>
          </div>
        )}

        <ModalFooter>
          {mode === "view" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Đóng
              </Button>
              <Button
                onClick={() => detail && onEditRequest?.(detail.id)}
                disabled={!detail}
              >
                Sửa
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Huỷ
              </Button>
              <Button
                onClick={() => void (mode === "edit" ? handleSubmit() : handleCreate())}
                disabled={submitting || loadingDetail}
              >
                {submitting ? "Đang lưu..." : mode === "edit" ? "Lưu" : "Thêm"}
              </Button>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
