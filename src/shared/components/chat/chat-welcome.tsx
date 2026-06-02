import { Link } from "@tanstack/react-router";
import {
  Bot,
  BookOpen,
  FileText,
  Sparkles,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import type { Course, Doc } from "@/shared/lib/mock-data";
import type { SubscriptionPlan } from "@/features/student/lib/subscriptions";
import { cn } from "@/shared/lib/utils";

type ChatWelcomeProps = {
  courses: Course[];
  documents: Doc[];
  plan: SubscriptionPlan;
};

export function ChatWelcome({ courses, documents, plan }: ChatWelcomeProps) {
  const indexed = documents.filter((d) => d.status === "indexed");

  const byCourse = courses.map((c) => ({
    course: c,
    docs: indexed.filter((d) => d.course === c.code),
  }));

  return (
    <div className="space-y-4 text-left">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-card p-6">
        <div className="flex gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bot className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold tracking-tight">
              Chào mừng đến EduBuddy
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              EduBuddy là trợ lý học tập AI — trả lời câu hỏi dựa trên{" "}
              <strong className="font-medium text-foreground">tài liệu môn học</strong> do
              giảng viên cung cấp, kèm{" "}
              <strong className="font-medium text-foreground">trích dẫn nguồn</strong> ở khung
              bên phải để bạn đối chiếu.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Tài liệu bạn có thể hỏi</h3>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Hiện tại hệ thống có {indexed.length} tài liệu sẵn sàng trên{" "}
          {byCourse.filter((g) => g.docs.length > 0).length} môn. Gõ câu hỏi bên dưới để bắt
          đầu — ví dụ: &quot;Tóm tắt UML&quot;, &quot;Middleware Express là gì?&quot;
        </p>
        <div className="space-y-3">
          {byCourse.map(({ course, docs }) => (
            <div
              key={course.code}
              className={cn(
                "rounded-lg border border-border px-3 py-2.5",
                docs.length > 0 ? "bg-secondary/30" : "bg-muted/20 opacity-70",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-mono text-[10px]">
                  {course.code}
                </Badge>
                <span className="text-xs font-medium">{course.name}</span>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {docs.length} tài liệu
                </span>
              </div>
              {docs.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {docs.slice(0, 4).map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                    >
                      <FileText className="h-3 w-3 shrink-0" />
                      <span className="truncate">{d.name}</span>
                    </li>
                  ))}
                  {docs.length > 4 && (
                    <li className="text-[11px] text-muted-foreground">
                      +{docs.length - 4} tài liệu khác
                    </li>
                  )}
                </ul>
              ) : (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Chưa có tài liệu sẵn sàng trong môn này.
                </p>
              )}
            </div>
          ))}
        </div>
        <Button variant="link" size="sm" className="mt-3 h-auto px-0 text-xs" asChild>
          <Link to="/documents">
            Xem đầy đủ danh sách tài liệu
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </Card>

      <Card className="border-dashed p-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">
            Gói {plan.name} — miễn phí khi đăng ký
          </h3>
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>
              <strong className="text-foreground">
                {plan.questionsPerMonth.toLocaleString("vi-VN")} câu hỏi / tháng
              </strong>{" "}
              — đủ để thử nghiệm và ôn tập cơ bản.
            </span>
          </li>
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2 pl-5 text-xs">
              <span className="text-primary">·</span>
              {f}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Cần hỏi nhiều hơn hoặc ưu tiên tốc độ? Nâng cấp gói Pro / Education trên trang Gói
          tháng.
        </p>
        <Button size="sm" variant="outline" className="mt-3 gap-1.5" asChild>
          <Link to="/subscriptions">
            Xem các gói
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </Card>
    </div>
  );
}
