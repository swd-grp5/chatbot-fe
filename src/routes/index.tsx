import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Plus, Search, MessageSquare, Send,
  Copy, RefreshCw, BookOpen, ChevronDown, ChevronRight, FileText,
  MoreHorizontal, Pencil, Trash2, Bot, User, FileX, Loader2,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatRelativeTime } from "@/lib/format-time";
import { type Citation, type ChatMessage, sessionGroupOrder } from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";

export const Route = createFileRoute("/")({ component: ChatPage });

const groupOrder = sessionGroupOrder;

function ChatPage() {
  const [input, setInput] = useState("");
  const [sessionQuery, setSessionQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [, setTick] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sessions = useAppStore((s) => s.sessions);
  const conversations = useAppStore((s) => s.conversations);
  const activeSession = useAppStore((s) => s.activeSessionId);
  const setActiveSession = useAppStore((s) => s.setActiveSession);
  const createSession = useAppStore((s) => s.createSession);
  const deleteSession = useAppStore((s) => s.deleteSession);
  const sendMessage = useAppStore((s) => s.sendMessage);

  const messages: ChatMessage[] = conversations[activeSession] ?? [];
  const activeTitle = sessions.find((s) => s.id === activeSession)?.title ?? "Hội thoại mới";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60000);
    return () => window.clearInterval(id);
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    try {
      await sendMessage(text);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const citationsByDoc = useMemo(() => {
    const map = new Map<string, { docName: string; chapter: string; items: Citation[] }>();
    messages.forEach((m) => (m.citations ?? []).forEach((c) => {
      const entry = map.get(c.docId) ?? { docName: c.docName, chapter: c.chapter, items: [] };
      entry.items.push(c);
      map.set(c.docId, entry);
    }));
    return Array.from(map.entries()).map(([docId, v]) => ({ docId, ...v }));
  }, [messages]);

  const filteredSessions = useMemo(() => {
    const q = sessionQuery.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => s.title.toLowerCase().includes(q));
  }, [sessions, sessionQuery]);

  return (
    <AppShell fullBleed>
      <div className="grid h-full min-h-0 grid-cols-[280px_1fr_360px] overflow-hidden">
        {/* LEFT: Lịch sử chat */}
        <aside className="flex min-h-0 flex-col overflow-hidden border-r border-border bg-sidebar">
          <div className="flex items-center justify-between px-4 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Lịch sử chat</h2>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => createSession("Hội thoại mới")} title="Tạo hội thoại mới">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={sessionQuery}
                onChange={(e) => setSessionQuery(e.target.value)}
                placeholder="Tìm hội thoại..."
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
            {filteredSessions.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                {sessions.length === 0
                  ? "Chưa có hội thoại nào. Hãy đặt câu hỏi để bắt đầu."
                  : "Không tìm thấy hội thoại phù hợp."}
              </div>
            )}
            {groupOrder.map((group) => {
              const items = filteredSessions.filter((s) => s.group === group);
              if (!items.length) return null;
              return (
                <div key={group} className="mb-3">
                  <div className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group}</div>
                  <div className="space-y-0.5">
                    {items.map((s) => (
                      <div
                        key={s.id}
                        className={cn(
                          "group flex w-full items-center gap-1 rounded-md px-1 py-1 transition-colors",
                          activeSession === s.id ? "bg-accent text-accent-foreground" : "hover:bg-secondary/60",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveSession(s.id)}
                          className="flex min-w-0 flex-1 items-start gap-2 rounded-md px-1 py-1.5 text-left text-xs"
                        >
                          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium leading-tight">{s.title}</div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <span>{s.messageCount} tin nhắn</span>
                              <span>·</span>
                              <span>{formatRelativeTime(s.updatedAt)}</span>
                            </div>
                          </div>
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-8 w-8 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100",
                              )}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Tùy chọn hội thoại</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem><Pencil className="mr-2 h-3.5 w-3.5" />Đổi tên</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteSession(s.id);
                                toast.success("Đã xóa hội thoại");
                              }}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />Xoá
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* CENTER: Chat */}
        <section className="flex min-h-0 flex-col overflow-hidden bg-background">
          <div className="border-b border-border bg-card px-6 py-3">
            <h1 className="truncate text-base font-semibold">{activeTitle}</h1>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
              {messages.length === 0 && (
                <div className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center">
                  <Bot className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                  <div className="text-sm font-medium">Bắt đầu hỏi đáp</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Mọi câu trả lời đều kèm theo nguồn trích dẫn ở khung bên phải.
                  </p>
                </div>
              )}
              {messages.map((m) => <MessageBubble key={m.id} message={m} />)}
              {sending && (
                <div className="flex justify-start">
                  <div className="flex max-w-[85%] items-start gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Đang tìm tài liệu và sinh câu trả lời…
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          <div className="border-t border-border bg-card px-6 py-4">
            <div className="mx-auto max-w-3xl">
              <div className="relative rounded-lg border border-border bg-background focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                  placeholder="Hỏi về nội dung môn học... (Enter để gửi · Shift+Enter xuống dòng)"
                  className="min-h-[60px] resize-none border-0 bg-transparent px-4 py-3 text-sm shadow-none focus-visible:ring-0"
                  rows={2}
                />
                <div className="flex items-center justify-between border-t border-border px-3 py-2">
                  <span className="px-1 text-[11px] text-muted-foreground">{input.length} ký tự</span>
                  <Button size="sm" className="h-7 gap-1.5" disabled={!input.trim() || sending} onClick={() => void handleSend()}>
                    {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Gửi
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                Câu trả lời được sinh từ tài liệu môn học. Luôn đối chiếu với giảng viên khi cần thiết.
              </p>
            </div>
          </div>
        </section>

        {/* RIGHT: Nguồn trích dẫn */}
        <aside key={activeSession} className="flex min-h-0 flex-col overflow-hidden border-l border-border bg-sidebar">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <div>
                <h2 className="text-sm font-semibold">Nguồn trích dẫn</h2>
                <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{activeTitle}</p>
              </div>
            </div>
            <Badge variant="outline" className="h-5 text-[10px]">{citationsByDoc.length} tài liệu</Badge>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-3">
              {citationsByDoc.length === 0 && (
                <div className="rounded-lg border border-dashed border-border bg-card/50 p-5 text-center">
                  <FileX className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                  <div className="text-xs font-medium">Chưa có trích dẫn</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    Đặt câu hỏi để xem các đoạn tài liệu được hệ thống tham chiếu.
                  </div>
                </div>
              )}
              {citationsByDoc.map((d, i) => (
                <DocSourceCard key={d.docId} index={i + 1} docName={d.docName} chapter={d.chapter} citations={d.items} />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="flex max-w-[85%] flex-row-reverse items-start gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground">
            <User className="h-4 w-4" />
          </div>
          <div className="min-w-0 text-right">
            <div className="mb-1 text-xs font-medium text-muted-foreground">Bạn</div>
            <div className="inline-block rounded-2xl rounded-tr-sm border border-border bg-secondary/80 px-4 py-2.5 text-left text-sm leading-relaxed text-foreground">
              {message.content}
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="flex max-w-[85%] items-start gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bot className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span>EduBuddy</span>
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-normal">LLM</Badge>
          </div>
          <div className="rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3">
            <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:rounded prose-code:bg-secondary prose-code:px-1 prose-code:py-0.5 prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-md prose-pre:border prose-pre:border-border prose-pre:bg-secondary/50 prose-pre:text-foreground prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>

            {message.citations && message.citations.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
                {message.citations.map((c, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                    <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-primary/10 text-[10px] font-semibold text-primary">{i + 1}</span>
                    <FileText className="h-3 w-3" />
                    <span className="max-w-[180px] truncate">{c.docName}</span>
                    <span>· p.{c.page}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground"><Copy className="h-3.5 w-3.5" />Sao chép</Button>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground"><RefreshCw className="h-3.5 w-3.5" />Tạo lại</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocSourceCard({
  index, docName, chapter, citations,
}: { index: number; docName: string; chapter: string; citations: Citation[] }) {
  const [open, setOpen] = useState(index === 1);
  return (
    <div className="rounded-lg border border-border bg-card">
      <button onClick={() => setOpen(!open)} className="flex w-full items-start gap-2 p-3 text-left">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-[11px] font-semibold text-primary">{index}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
            <div className="truncate text-xs font-medium">{docName}</div>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {chapter && <span className="truncate">{chapter}</span>}
            {chapter && <span>·</span>}
            <span>{citations.length} trích dẫn</span>
          </div>
        </div>
        {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
      {open && (
        <div className="border-t border-border bg-secondary/30 px-3 py-2.5 space-y-2">
          {citations.map((c, i) => (
            <div key={i}>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Đoạn trích · Trang {c.page}
              </div>
              <p className="mt-1 border-l-2 border-primary/40 pl-2 text-xs leading-relaxed text-foreground/80">
                {c.snippet}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
