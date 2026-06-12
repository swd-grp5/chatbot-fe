import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { PasswordInput } from "@/shared/components/ui/password-input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import {
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/shared/components/ui/modal";
import {
  createStudent,
  fetchStudentById,
  updateStudent,
  type StudentResponse,
} from "@/features/admin/api/student-api";
import { fetchSubjects, type SubjectOption } from "@/features/lecturer/api/subject-api";
import { activeStyles } from "@/features/lecturer/components/documents-table-ui";
import { ApiError } from "@/shared/lib/api-client";
import { formatDateTimeDMY } from "@/shared/lib/format-time";
import { cn } from "@/shared/lib/utils";
import { toast } from "@/shared/lib/toast";

export type StudentModalMode = "create" | "edit" | "view";

type StudentModalProps = {
  mode: StudentModalMode | null;
  studentId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void | Promise<void>;
  onEditRequest?: (studentId: string) => void;
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

function SubjectPicker({
  subjects,
  selectedIds,
  onChange,
  disabled,
}: {
  subjects: SubjectOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const toggle = (id: string) => {
    if (disabled) return;
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((item) => item !== id)
        : [...selectedIds, id],
    );
  };

  if (subjects.length === 0) {
    return <p className="text-sm text-muted-foreground">Chưa có môn học khả dụng.</p>;
  }

  return (
    <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-lg border border-border p-2">
      {subjects.map((subject) => {
        const selected = selectedIds.includes(subject.id);
        return (
          <button
            key={subject.id}
            type="button"
            disabled={disabled}
            onClick={() => toggle(subject.id)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs transition-colors",
              selected
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:bg-secondary",
              disabled && "pointer-events-none opacity-50",
            )}
          >
            {subject.code}
          </button>
        );
      })}
    </div>
  );
}

export function StudentModal({
  mode,
  studentId = null,
  open,
  onOpenChange,
  onSaved,
  onEditRequest,
}: StudentModalProps) {
  const [detail, setDetail] = useState<StudentResponse | null>(null);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [active, setActive] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setDetail(null);
      setLoadingDetail(false);
      return;
    }

    let cancelled = false;
    void fetchSubjects({ active: true, size: 200, page: 0 })
      .then((res) => {
        if (!cancelled) {
          setSubjects(res.content.map(({ id, code, name }) => ({ id, code, name })));
        }
      })
      .catch(() => {
        if (!cancelled) setSubjects([]);
      });

    if (mode === "create") {
      setLoadingDetail(false);
      setDetail(null);
      setFullName("");
      setEmail("");
      setPassword("");
      setActive(true);
      setEmailVerified(false);
      setSubjectIds([]);
      return () => {
        cancelled = true;
      };
    }

    if ((mode === "edit" || mode === "view") && studentId) {
      setLoadingDetail(true);
      setDetail(null);

      void fetchStudentById(studentId)
        .then((student) => {
          if (cancelled) return;
          setDetail(student);
          setFullName(student.fullName);
          setEmail(student.email);
          setPassword("");
          setActive(student.active);
          setEmailVerified(student.emailVerified);
          setSubjectIds(student.subjects.map((s) => s.id));
        })
        .catch((e) => {
          if (cancelled) return;
          toast.error(e instanceof ApiError ? e.message : "Không tải được chi tiết sinh viên");
          onOpenChange(false);
        })
        .finally(() => {
          setLoadingDetail(false);
        });
    } else {
      setLoadingDetail(false);
    }

    return () => {
      cancelled = true;
    };
  }, [open, mode, studentId, onOpenChange]);

  const validateForm = (requirePassword: boolean) => {
    if (!fullName.trim()) {
      toast.error("Họ tên không được để trống");
      return false;
    }
    if (!email.trim()) {
      toast.error("Email không được để trống");
      return false;
    }
    if (requirePassword && !password.trim()) {
      toast.error("Mật khẩu không được để trống");
      return false;
    }
    if (subjectIds.length === 0) {
      toast.error("Chọn ít nhất một môn học");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!detail || !validateForm(false)) return;

    setSubmitting(true);
    try {
      await updateStudent(detail.id, {
        fullName,
        email,
        password: password.trim() || undefined,
        active,
        emailVerified,
        subjectIds,
      });
      toast.success("Đã cập nhật sinh viên");
      await onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Lưu thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = async () => {
    if (!validateForm(true)) return;

    setSubmitting(true);
    try {
      await createStudent({
        fullName,
        email,
        password,
        active,
        emailVerified,
        subjectIds,
      });
      toast.success("Đã thêm sinh viên");
      await onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Lưu thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    mode === "view" ? "Chi tiết sinh viên" : mode === "edit" ? "Sửa sinh viên" : "Thêm sinh viên";

  const status = detail
    ? detail.active
      ? activeStyles.active
      : activeStyles.inactive
    : null;

  return (
    <Modal open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <ModalContent className="sm:max-w-lg">
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
              <DetailField label="Họ tên">
                <span className="font-medium">{detail.fullName}</span>
              </DetailField>
              <DetailField label="Kích hoạt">
                {status && (
                  <Badge variant="outline" className={cn("font-normal", status.className)}>
                    {status.label}
                  </Badge>
                )}
              </DetailField>
            </div>
            <DetailField label="Email">{detail.email}</DetailField>
            <DetailField label="Xác thực email">
              {detail.emailVerified ? "Đã xác thực" : "Chưa xác thực"}
            </DetailField>
            <DetailField label="Nhà cung cấp">{detail.provider}</DetailField>
            <DetailField label="Môn học">
              <div className="flex flex-wrap gap-1.5">
                {detail.subjects.map((subject) => (
                  <Badge key={subject.id} variant="secondary" className="font-normal">
                    {subject.code}
                  </Badge>
                ))}
              </div>
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
              <Label htmlFor="student-full-name">Họ tên *</Label>
              <Input
                id="student-full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="student-email">Email *</Label>
              <Input
                id="student-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="student-password">
                Mật khẩu {mode === "create" ? "*" : "(để trống nếu không đổi)"}
              </Label>
              <PasswordInput
                id="student-password"
                value={password}
                onChange={setPassword}
                placeholder={mode === "create" ? "Mật khẩu" : "••••••••"}
                required={mode === "create"}
                autoComplete={mode === "create" ? "new-password" : "current-password"}
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Môn học *</Label>
              <SubjectPicker
                subjects={subjects}
                selectedIds={subjectIds}
                onChange={setSubjectIds}
                disabled={submitting}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <div>
                <Label htmlFor="student-active" className="text-sm">
                  Kích hoạt
                </Label>
                <p className="text-xs text-muted-foreground">Cho phép sinh viên đăng nhập</p>
              </div>
              <Switch
                id="student-active"
                checked={active}
                onCheckedChange={setActive}
                disabled={submitting}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <div>
                <Label htmlFor="student-email-verified" className="text-sm">
                  Email đã xác thực
                </Label>
              </div>
              <Switch
                id="student-email-verified"
                checked={emailVerified}
                onCheckedChange={setEmailVerified}
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
              <Button onClick={() => detail && onEditRequest?.(detail.id)} disabled={!detail}>
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
