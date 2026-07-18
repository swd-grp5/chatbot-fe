import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Children,
  cloneElement,
  isValidElement,
} from "react";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Plus,
  Search,
  MessageSquare,
  Send,
  Copy,
  RefreshCw,
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  MoreHorizontal,
  Pencil,
  Trash2,
  Bot,
  User,
  FileX,
  Loader2,
  BookMarked,
  X,
} from "lucide-react";
import { AppShell } from "@/shared/components/layout/app-shell";
import { ChatWelcome } from "@/shared/components/chat/chat-welcome";
import { useAuth } from "@/features/auth/lib/auth-context";
import {
  fetchCurrentSubscription,
  type CurrentUserSubscription,
} from "@/features/student/api/subscription-api";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/shared/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { cn } from "@/shared/lib/utils";
import { toast } from "@/shared/lib/toast";
import { formatRelativeTime } from "@/shared/lib/format-time";
import {
  type Citation,
  type ChatMessage,
  courseLabel,
  sessionGroupOrder,
} from "@/shared/lib/mock-data";
import { fetchDocuments, mapDocumentResponse } from "@/features/lecturer/api/document-api";
import { useStudentMySubjects } from "@/features/student/hooks/use-my-subjects";
import { useAppStore } from "@/features/student/lib/store";
import type { Course, Doc } from "@/shared/lib/mock-data";
import { ApiError } from "@/shared/lib/api-client";

const groupOrder = sessionGroupOrder;

const HISTORY_WIDTH_KEY = "chat-history-panel-width";
const HISTORY_WIDTH_DEFAULT = 280;
const HISTORY_WIDTH_MIN = 200;
const HISTORY_WIDTH_MAX = 480;

const RIGHT_WIDTH_KEY = "chat-right-panel-width";
const RIGHT_WIDTH_DEFAULT = 360;
const RIGHT_WIDTH_MIN = 260;
const RIGHT_WIDTH_MAX = 560;

function loadPanelWidth(key: string, fallback: number, min: number, max: number) {
  try {
    const raw = localStorage.getItem(key);
    const n = raw != null ? Number(raw) : fallback;
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  } catch {
    return fallback;
  }
}

function loadHistoryWidth() {
  return loadPanelWidth(
    HISTORY_WIDTH_KEY,
    HISTORY_WIDTH_DEFAULT,
    HISTORY_WIDTH_MIN,
    HISTORY_WIDTH_MAX,
  );
}

function loadRightWidth() {
  return loadPanelWidth(RIGHT_WIDTH_KEY, RIGHT_WIDTH_DEFAULT, RIGHT_WIDTH_MIN, RIGHT_WIDTH_MAX);
}

export function ChatPage() {
  const [sessionQuery, setSessionQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [, setTick] = useState(0);
  const [rightTab, setRightTab] = useState<"documents" | "citations">("documents");
  const [docsSaving, setDocsSaving] = useState(false);
  const [focusCitationIndex, setFocusCitationIndex] = useState<number | null>(null);
  const [historyWidth, setHistoryWidth] = useState(loadHistoryWidth);
  const [historyResizing, setHistoryResizing] = useState(false);
  const [rightWidth, setRightWidth] = useState(loadRightWidth);
  const [rightResizing, setRightResizing] = useState(false);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const courses = useAppStore((s) => s.courses);
  const documents = useAppStore((s) => s.documents);
  const sessions = useAppStore((s) => s.sessions);
  const conversations = useAppStore((s) => s.conversations);
  const activeSession = useAppStore((s) => s.activeSessionId);
  const setActiveSession = useAppStore((s) => s.setActiveSession);
  const createSession = useAppStore((s) => s.createSession);
  const deleteSession = useAppStore((s) => s.deleteSession);
  const renameSession = useAppStore((s) => s.renameSession);
  const syncConversations = useAppStore((s) => s.syncConversations);
  const sendMessage = useAppStore((s) => s.sendMessage);
  const init = useAppStore((s) => s.init);
  const selectedDocIds = useAppStore((s) => s.selectedDocIds);
  const setSessionDocumentIds = useAppStore((s) => s.setSessionDocumentIds);
  const { user } = useAuth();
  const isStudentApiMode = user?.source === "api" && user.role === "student";

  const { data: subjectRows } = useStudentMySubjects(isStudentApiMode);
  const apiCourses = useMemo(
    () =>
      (subjectRows ?? []).map((subject) => ({
        code: subject.code,
        name: subject.name,
      })),
    [subjectRows],
  );

  const [apiDocuments, setApiDocuments] = useState<Doc[]>([]);
  const [subscription, setSubscription] = useState<CurrentUserSubscription | null>(null);

  const displayCourses = isStudentApiMode ? apiCourses : courses;
  const assignedCodes = useMemo(
    () => new Set(apiCourses.map((course) => course.code)),
    [apiCourses],
  );
  const displayDocuments = isStudentApiMode
    ? apiDocuments.filter((doc) => assignedCodes.has(doc.course))
    : documents;

  const loadApiDocuments = useCallback(async () => {
    const codes = new Set(apiCourses.map((course) => course.code));
    if (codes.size === 0) {
      setApiDocuments([]);
      return;
    }
    try {
      const docsRes = await fetchDocuments({ active: true, status: "INDEXED", size: 100 });
      setApiDocuments(
        docsRes.content.map(mapDocumentResponse).filter((doc) => codes.has(doc.course)),
      );
    } catch {
      setApiDocuments([]);
    }
  }, [apiCourses]);

  useEffect(() => {
    if (!isStudentApiMode) {
      setApiDocuments([]);
      return;
    }
    void loadApiDocuments();
  }, [isStudentApiMode, loadApiDocuments]);

  useEffect(() => {
    if (!user || user.role !== "student") {
      setSubscription(null);
      return;
    }
    let cancelled = false;
    void fetchCurrentSubscription()
      .then((data) => {
        if (!cancelled) setSubscription(data);
      })
      .catch(() => {
        if (!cancelled) setSubscription(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const messages: ChatMessage[] = conversations[activeSession] ?? [];

  const hasEverChatted = useMemo(
    () => Object.values(conversations).some((msgs) => msgs.length > 0),
    [conversations],
  );

  const showWelcome = messages.length === 0 && !hasEverChatted;

  useEffect(() => {
    if (!isStudentApiMode) return;
    init();
    void syncConversations();
  }, [isStudentApiMode, init, syncConversations]);
  const activeTitle = sessions.find((s) => s.id === activeSession)?.title ?? "Hội thoại mới";

  useEffect(() => {
    const scroller = messagesScrollRef.current;
    if (!scroller) return;
    // Scroll only the messages pane — never the document (scrollIntoView would).
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
  }, [messages.length, sending, activeSession]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60000);
    return () => window.clearInterval(id);
  }, []);

  const scrollToCitation = useCallback((citationIndex: number) => {
    setRightTab("citations");
    setFocusCitationIndex(citationIndex);
    // Đợi tab citations mount rồi scroll
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        const el = document.getElementById(`citation-excerpt-${citationIndex}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    });
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      if (!text || sending) return;
      setSending(true);
      try {
        await sendMessage(text);
      } finally {
        setSending(false);
      }
    },
    [sending, sendMessage],
  );

  const citationsByDoc = useMemo(() => {
    const map = new Map<string, { docName: string; course: string; items: Citation[] }>();
    messages.forEach((m) =>
      (m.citations ?? []).forEach((c) => {
        const course = c.course || displayDocuments.find((d) => d.id === c.docId)?.course || "";
        const entry = map.get(c.docId) ?? { docName: c.docName, course, items: [] };
        entry.items.push({ ...c, course: c.course || course });
        map.set(c.docId, entry);
      }),
    );
    return Array.from(map.entries()).map(([docId, v]) => ({ docId, ...v }));
  }, [messages, displayDocuments]);

  const filteredSessions = useMemo(() => {
    const q = sessionQuery.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => s.title.toLowerCase().includes(q));
  }, [sessions, sessionQuery]);

  const indexedDocs = useMemo(
    () => displayDocuments.filter((d) => d.status === "indexed"),
    [displayDocuments],
  );

  const selectedDocs = useMemo(
    () => displayDocuments.filter((d) => selectedDocIds.includes(d.id)),
    [displayDocuments, selectedDocIds],
  );

  const toggleDoc = async (id: string) => {
    const next = selectedDocIds.includes(id)
      ? selectedDocIds.filter((x) => x !== id)
      : [...selectedDocIds, id];
    setDocsSaving(true);
    try {
      await setSessionDocumentIds(next);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Không cập nhật được tài liệu hội thoại");
    } finally {
      setDocsSaving(false);
    }
  };

  useEffect(() => {
    localStorage.setItem(HISTORY_WIDTH_KEY, String(historyWidth));
  }, [historyWidth]);

  useEffect(() => {
    localStorage.setItem(RIGHT_WIDTH_KEY, String(rightWidth));
  }, [rightWidth]);

  const startHistoryResize = useCallback(
    (startX: number) => {
      const startWidth = historyWidth;
      setHistoryResizing(true);
      const onMouseMove = (e: MouseEvent) => {
        const next = Math.min(
          HISTORY_WIDTH_MAX,
          Math.max(HISTORY_WIDTH_MIN, startWidth + (e.clientX - startX)),
        );
        setHistoryWidth(next);
      };
      const onMouseUp = () => {
        setHistoryResizing(false);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [historyWidth],
  );

  const startRightResize = useCallback(
    (startX: number) => {
      const startWidth = rightWidth;
      setRightResizing(true);
      const onMouseMove = (e: MouseEvent) => {
        // Kéo sang trái (clientX giảm) → panel phải rộng hơn
        const next = Math.min(
          RIGHT_WIDTH_MAX,
          Math.max(RIGHT_WIDTH_MIN, startWidth + (startX - e.clientX)),
        );
        setRightWidth(next);
      };
      const onMouseUp = () => {
        setRightResizing(false);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [rightWidth],
  );

  return (
    <AppShell fullBleed>
      <div
        className="grid h-full min-h-0 overflow-hidden"
        style={{
          gridTemplateColumns: `${historyWidth}px minmax(0, 1fr) ${rightWidth}px`,
        }}
      >
        {/* LEFT: Lịch sử chat */}
        <aside className="relative flex h-full min-h-0 flex-col overflow-hidden border-r border-border bg-sidebar">
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Đổi độ rộng lịch sử chat"
            aria-valuenow={Math.round(historyWidth)}
            aria-valuemin={HISTORY_WIDTH_MIN}
            aria-valuemax={HISTORY_WIDTH_MAX}
            title="Kéo để đổi độ rộng"
            className={cn(
              "group absolute inset-y-0 -right-1.5 z-20 flex w-3 cursor-col-resize touch-none select-none items-center justify-center",
              "hover:bg-primary/10",
              historyResizing && "bg-primary/15",
            )}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              startHistoryResize(e.clientX);
            }}
          >
            <span
              className={cn(
                "flex h-9 w-3.5 items-center justify-center gap-0.5 rounded-full border border-border bg-card shadow-sm transition-colors",
                "group-hover:border-primary/50 group-hover:bg-primary/10",
                historyResizing && "border-primary bg-primary/15",
              )}
            >
              <span className="h-4 w-px rounded-full bg-muted-foreground/50 transition-colors group-hover:bg-primary" />
              <span className="h-4 w-px rounded-full bg-muted-foreground/50 transition-colors group-hover:bg-primary" />
            </span>
          </div>
          <div className="flex items-center justify-between px-4 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Lịch sử chat</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => createSession("Hội thoại mới")}
              title="Tạo hội thoại mới"
            >
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
                  <div className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group}
                  </div>
                  <div className="space-y-0.5">
                    {items.map((s) => (
                      <div
                        key={s.id}
                        className={cn(
                          "group flex w-full cursor-pointer items-center gap-1 rounded-md px-1 py-1 transition-colors",
                          activeSession === s.id
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-secondary/60",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveSession(s.id)}
                          className="flex min-w-0 flex-1 cursor-pointer items-start gap-2 rounded-md px-1 py-1.5 text-left text-xs"
                        >
                          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            {renamingId === s.id ? (
                              <input
                                autoFocus
                                className="w-full rounded border border-primary/40 bg-background px-1 py-0.5 text-xs font-medium outline-none"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onBlur={() => {
                                  void renameSession(s.id, renameValue);
                                  setRenamingId(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    void renameSession(s.id, renameValue);
                                    setRenamingId(null);
                                  }
                                  if (e.key === "Escape") setRenamingId(null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <div className="truncate font-medium leading-tight">{s.title}</div>
                            )}
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
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenamingId(s.id);
                                setRenameValue(s.title);
                              }}
                            >
                              <Pencil className="mr-2 h-3.5 w-3.5" />
                              Đổi tên
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteSession(s.id);
                                toast.success("Đã xóa hội thoại");
                              }}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Xoá
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
        <section className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
          <div className="border-b border-border bg-card px-6 py-3">
            <h1 className="truncate text-base font-semibold">{activeTitle}</h1>
          </div>

          <div
            ref={messagesScrollRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
              {showWelcome && (
                <ChatWelcome
                  courses={displayCourses}
                  documents={displayDocuments}
                  subscription={subscription}
                />
              )}
              {messages.length === 0 && hasEverChatted && (
                <div className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center">
                  <Bot className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                  <div className="text-sm font-medium">Hội thoại mới</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Đặt câu hỏi về tài liệu môn học — trích dẫn hiển thị bên phải.
                  </p>
                </div>
              )}
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} onCiteClick={scrollToCitation} />
              ))}
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
            </div>
          </div>

          <div className="border-t border-border bg-card px-6 py-4">
            <ChatComposer
              sending={sending}
              requireDocs={false}
              selectedDocCount={selectedDocIds.length}
              onOpenDocs={() => setRightTab("documents")}
              onSend={handleSend}
            />
          </div>
        </section>

        {/* RIGHT: Trích dẫn | Tài liệu hội thoại */}
        <aside
          key={activeSession}
          className="relative flex h-full min-h-0 flex-col overflow-hidden border-l border-border bg-sidebar"
        >
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Đổi độ rộng panel tài liệu"
            aria-valuenow={Math.round(rightWidth)}
            aria-valuemin={RIGHT_WIDTH_MIN}
            aria-valuemax={RIGHT_WIDTH_MAX}
            title="Kéo để đổi độ rộng"
            className={cn(
              "group absolute inset-y-0 -left-1.5 z-20 flex w-3 cursor-col-resize touch-none select-none items-center justify-center",
              "hover:bg-primary/10",
              rightResizing && "bg-primary/15",
            )}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              startRightResize(e.clientX);
            }}
          >
            <span
              className={cn(
                "flex h-9 w-3.5 items-center justify-center gap-0.5 rounded-full border border-border bg-card shadow-sm transition-colors",
                "group-hover:border-primary/50 group-hover:bg-primary/10",
                rightResizing && "border-primary bg-primary/15",
              )}
            >
              <span className="h-4 w-px rounded-full bg-muted-foreground/50 transition-colors group-hover:bg-primary" />
              <span className="h-4 w-px rounded-full bg-muted-foreground/50 transition-colors group-hover:bg-primary" />
            </span>
          </div>
          {isStudentApiMode ? (
            <div className="flex h-full min-h-0 flex-col">
              <div className="border-b border-border px-4 pt-4 pb-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                  Trích dẫn tài liệu
                </div>
                <p className="mt-1 truncate text-[10px] text-muted-foreground">{activeTitle}</p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <div className="space-y-3">
                  {citationsByDoc.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border bg-card/50 p-5">
                      {showWelcome ? (
                        <div className="space-y-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2 font-medium text-foreground">
                            <BookOpen className="h-3.5 w-3.5 text-primary" />
                            Sẵn sàng tra cứu
                          </div>
                          <p>
                            Sau câu hỏi đầu tiên, các đoạn trích từ tài liệu (kèm mã môn) sẽ hiện tại
                            đây.
                          </p>
                          {subscription?.plan && (
                            <p className="text-[11px]">
                              Gói {subscription.plan.name}: còn{" "}
                              <strong className="text-foreground">
                                {subscription.remainingCredits.toLocaleString("vi-VN")}
                              </strong>{" "}
                              credit.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-center">
                          <FileX className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                          <div className="text-xs font-medium">Chưa có trích dẫn</div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            Đặt câu hỏi để xem các đoạn tài liệu được hệ thống tham chiếu.
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {citationsByDoc.map((d, i) => (
                    <DocSourceCard
                      key={d.docId}
                      index={i + 1}
                      docName={d.docName}
                      courseCode={d.course}
                      courseName={courseLabel(d.course, displayCourses)}
                      citations={d.items}
                      focusCitationIndex={focusCitationIndex}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <Tabs
              value={rightTab}
              onValueChange={(v) => setRightTab(v as "documents" | "citations")}
              className="flex h-full min-h-0 flex-col"
            >
              <div className="border-b border-border px-3 pt-3 pb-2">
                <TabsList className="grid h-8 w-full grid-cols-2">
                  <TabsTrigger value="documents" className="gap-1 text-xs">
                    <BookMarked className="h-3.5 w-3.5" />
                    Tài liệu
                    {selectedDocIds.length > 0 && (
                      <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                        {selectedDocIds.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="citations" className="gap-1 text-xs">
                    <BookOpen className="h-3.5 w-3.5" />
                    Trích dẫn
                    {citationsByDoc.length > 0 && (
                      <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                        {citationsByDoc.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
                <p className="mt-2 truncate text-[10px] text-muted-foreground">{activeTitle}</p>
              </div>

              <TabsContent
                value="documents"
                className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
              >
                <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                  {selectedDocs.length > 0 && (
                    <div className="mb-3 space-y-1.5">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Đã gắn vào chat
                      </div>
                      {selectedDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 px-2 py-2"
                        >
                          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-medium">
                              {doc.title ?? doc.name}
                            </div>
                            <Badge
                              variant="outline"
                              className="mt-0.5 h-4 px-1 font-mono text-[9px] font-semibold"
                            >
                              {doc.course}
                            </Badge>
                          </div>
                          <button
                            type="button"
                            disabled={docsSaving}
                            onClick={() => void toggleDoc(doc.id)}
                            className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="Bỏ khỏi hội thoại"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {selectedDocs.length > 0 ? "Thêm tài liệu" : "Chọn tài liệu"}
                    </div>
                    {indexedDocs.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                        Chưa có tài liệu nào được index.
                      </div>
                    ) : (
                      indexedDocs
                        .filter((d) => !selectedDocIds.includes(d.id))
                        .map((doc) => (
                          <button
                            key={doc.id}
                            type="button"
                            disabled={docsSaving}
                            onClick={() => void toggleDoc(doc.id)}
                            className="flex w-full cursor-pointer items-start gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-secondary/60"
                          >
                            <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border bg-background">
                              <Plus className="h-2.5 w-2.5 text-muted-foreground" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-xs font-medium">
                                {doc.title ?? doc.name}
                              </div>
                              <Badge
                                variant="outline"
                                className="mt-0.5 h-4 px-1 font-mono text-[9px] font-semibold"
                              >
                                {doc.course}
                              </Badge>
                            </div>
                          </button>
                        ))
                    )}
                    {indexedDocs.filter((d) => !selectedDocIds.includes(d.id)).length === 0 &&
                      indexedDocs.length > 0 && (
                        <p className="px-1 py-2 text-[11px] text-muted-foreground">
                          Đã gắn hết tài liệu.
                        </p>
                      )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent
                value="citations"
                className="mt-0 min-h-0 flex-1 overflow-y-auto px-4 py-4 data-[state=inactive]:hidden"
              >
                <div className="space-y-3">
                  {citationsByDoc.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border bg-card/50 p-5">
                      {showWelcome ? (
                        <div className="space-y-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2 font-medium text-foreground">
                            <BookOpen className="h-3.5 w-3.5 text-primary" />
                            Sẵn sàng tra cứu
                          </div>
                          <p>
                            Sau câu hỏi đầu tiên, các đoạn trích từ tài liệu (kèm mã môn) sẽ hiện tại
                            đây.
                          </p>
                          {subscription?.plan && (
                            <p className="text-[11px]">
                              Gói {subscription.plan.name}: còn{" "}
                              <strong className="text-foreground">
                                {subscription.remainingCredits.toLocaleString("vi-VN")}
                              </strong>{" "}
                              credit.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-center">
                          <FileX className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                          <div className="text-xs font-medium">Chưa có trích dẫn</div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            Đặt câu hỏi để xem các đoạn tài liệu được hệ thống tham chiếu.
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {citationsByDoc.map((d, i) => (
                    <DocSourceCard
                      key={d.docId}
                      index={i + 1}
                      docName={d.docName}
                      courseCode={d.course}
                      courseName={courseLabel(d.course, displayCourses)}
                      citations={d.items}
                      focusCitationIndex={focusCitationIndex}
                    />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </aside>
      </div>
    </AppShell>
  );
}

/** Ô nhập tách riêng — tránh re-render markdown/sidebar mỗi lần gõ */
function ChatComposer({
  sending,
  requireDocs,
  selectedDocCount,
  onOpenDocs,
  onSend,
}: {
  sending: boolean;
  requireDocs: boolean;
  selectedDocCount: number;
  onOpenDocs: () => void;
  onSend: (text: string) => Promise<void>;
}) {
  const [input, setInput] = useState("");
  const needsDocs = requireDocs && selectedDocCount === 0;

  const submit = async () => {
    const text = input.trim();
    if (!text || sending) return;
    if (needsDocs) {
      onOpenDocs();
      toast.error("Hãy gắn ít nhất 1 tài liệu vào hội thoại (panel bên phải).");
      return;
    }
    setInput("");
    await onSend(text);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-2">
      <div className="relative rounded-lg border border-border bg-background focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          disabled={sending}
          placeholder={
            needsDocs ? "Gắn tài liệu ở panel bên phải trước khi hỏi..." : "Hỏi về nội dung môn học"
          }
          className="min-h-15 resize-none border-0 bg-transparent px-4 py-3 text-sm shadow-none focus-visible:ring-0"
          rows={2}
        />
        <div className="flex items-center justify-between border-t border-border px-3 py-2">
          <span className="px-1 text-[11px] text-muted-foreground">
            {input.length} ký tự
            {requireDocs && selectedDocCount > 0 && (
              <>
                {" · "}
                <button type="button" className="text-primary hover:underline" onClick={onOpenDocs}>
                  {selectedDocCount} tài liệu
                </button>
              </>
            )}
          </span>
          <Button
            size="sm"
            className="h-7 gap-1.5"
            disabled={!input.trim() || sending || needsDocs}
            onClick={() => void submit()}
          >
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Gửi
          </Button>
        </div>
      </div>
      <p className="mt-1 text-center text-[11px] text-muted-foreground">
        {needsDocs ? (
          <span className="text-amber-500 dark:text-amber-400">
            ⚠ Gắn tài liệu ở panel bên phải (tab Tài liệu) để bắt đầu hỏi.
          </span>
        ) : (
          "Câu trả lời được sinh từ tài liệu gắn với hội thoại này. Luôn đối chiếu với giảng viên khi cần thiết."
        )}
      </p>
    </div>
  );
}

/** Chèn nút [n] clickable vào text node của ReactMarkdown */
function linkifyCitationMarkers(children: ReactNode, onCite: (n: number) => void): ReactNode {
  return Children.map(children, (child, childIdx) => {
    if (typeof child === "string") {
      const parts = child.split(/(\[\d+\])/g);
      if (parts.length === 1) return child;
      return parts.map((part, i) => {
        const m = /^\[(\d+)\]$/.exec(part);
        if (!m) return <span key={`${childIdx}-${i}`}>{part}</span>;
        const n = Number(m[1]);
        return (
          <button
            key={`${childIdx}-${i}`}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCite(n);
            }}
            className="mx-0.5 inline-flex h-5 min-w-5 cursor-pointer items-center justify-center rounded bg-primary/15 px-1 align-baseline text-[11px] font-semibold text-primary hover:bg-primary/25"
            title={`Xem trích dẫn [${n}]`}
          >
            [{n}]
          </button>
        );
      });
    }
    if (isValidElement<{ children?: ReactNode }>(child) && child.props.children != null) {
      return cloneElement(child, {
        ...child.props,
        children: linkifyCitationMarkers(child.props.children, onCite),
      });
    }
    return child;
  });
}

function HighlightedQuote({ text, highlight }: { text: string; highlight?: string | null }) {
  const needle = highlight?.trim();
  if (!needle) return <>{text}</>;
  const idx = text.indexOf(needle);
  if (idx < 0) {
    // thử match không phân biệt hoa thường
    const lower = text.toLowerCase();
    const nIdx = lower.indexOf(needle.toLowerCase());
    if (nIdx < 0) return <>{text}</>;
    return (
      <>
        {text.slice(0, nIdx)}
        <strong className="rounded bg-primary/15 font-semibold text-foreground">
          {text.slice(nIdx, nIdx + needle.length)}
        </strong>
        {text.slice(nIdx + needle.length)}
      </>
    );
  }
  return (
    <>
      {text.slice(0, idx)}
      <strong className="rounded bg-primary/15 font-semibold text-foreground">
        {text.slice(idx, idx + needle.length)}
      </strong>
      {text.slice(idx + needle.length)}
    </>
  );
}

const MessageBubble = memo(function MessageBubble({
  message,
  onCiteClick,
}: {
  message: ChatMessage;
  onCiteClick?: (citationIndex: number) => void;
}) {
  const courses = useAppStore((s) => s.courses);
  const documents = useAppStore((s) => s.documents);

  const courseForCitation = (c: Citation) =>
    c.course || documents.find((d) => d.id === c.docId)?.course || "";

  const isUser = String(message.role).toUpperCase() === "USER";

  const mdComponents = useMemo(() => {
    if (!onCiteClick) return undefined;
    const wrap =
      (Tag: "p" | "li" | "td" | "th" | "blockquote") =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ children, ...props }: any) => (
          <Tag {...props}>{linkifyCitationMarkers(children, onCiteClick)}</Tag>
        );
    return {
      p: wrap("p"),
      li: wrap("li"),
      td: wrap("td"),
      th: wrap("th"),
      blockquote: wrap("blockquote"),
    };
  }, [onCiteClick]);

  if (isUser) {
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
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-normal">
              LLM
            </Badge>
          </div>
          <div className="rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3">
            <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:rounded prose-code:bg-secondary prose-code:px-1 prose-code:py-0.5 prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-md prose-pre:border prose-pre:border-border prose-pre:bg-secondary/50 prose-pre:text-foreground prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {message.content}
              </ReactMarkdown>
            </div>

            {message.citations && message.citations.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
                {message.citations.map((c, i) => {
                  const code = courseForCitation(c);
                  const name = courseLabel(code, courses);
                  const citeNo = c.citationIndex ?? i + 1;
                  return (
                    <button
                      key={`${c.docId}-${citeNo}-${i}`}
                      type="button"
                      onClick={() => onCiteClick?.(citeNo)}
                      className="inline-flex max-w-full cursor-pointer flex-wrap items-center gap-x-1 gap-y-0.5 rounded border border-border bg-background px-2 py-1 text-left text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
                      title={`Xem trích dẫn [${citeNo}]`}
                    >
                      <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-primary/10 text-[10px] font-semibold text-primary">
                        {citeNo}
                      </span>
                      <FileText className="h-3 w-3 shrink-0" />
                      <span className="max-w-35 truncate font-medium text-foreground">
                        {c.docName}
                      </span>
                      {code && (
                        <>
                          <span className="text-border">·</span>
                          <span className="font-mono text-[10px] font-medium text-primary">
                            {code}
                          </span>
                        </>
                      )}
                      {name !== code && code && (
                        <>
                          <span className="text-border">·</span>
                          <span className="max-w-30 truncate">{name}</span>
                        </>
                      )}
                      <span className="text-border">·</span>
                      <span>p.{c.page}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground">
              <Copy className="h-3.5 w-3.5" />
              Sao chép
            </Button>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5" />
              Tạo lại
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

function DocSourceCard({
  index,
  docName,
  courseCode,
  courseName,
  citations,
  focusCitationIndex,
}: {
  index: number;
  docName: string;
  courseCode: string;
  courseName: string;
  citations: Citation[];
  focusCitationIndex?: number | null;
}) {
  const hasFocus = citations.some((c, i) => (c.citationIndex ?? i + 1) === focusCitationIndex);
  const [open, setOpen] = useState(index === 1 || hasFocus);

  useEffect(() => {
    if (hasFocus) setOpen(true);
  }, [hasFocus]);

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full cursor-pointer items-start gap-2 p-3 text-left"
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-[11px] font-semibold text-primary">
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
            <div className="truncate text-xs font-medium">{docName}</div>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <Badge variant="outline" className="h-4 px-1 font-mono text-[9px] font-semibold">
              {courseCode}
            </Badge>
            <span className="truncate">{courseName}</span>
            <span>·</span>
            <span>{citations.length} trích dẫn</span>
          </div>
        </div>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="space-y-2 border-t border-border bg-secondary/30 px-3 py-2.5">
          {citations.map((c, i) => {
            const citeNo = c.citationIndex ?? i + 1;
            const focused = focusCitationIndex === citeNo;
            return (
              <div
                key={`${c.docId}-${citeNo}-${i}`}
                id={`citation-excerpt-${citeNo}`}
                className={cn(
                  "rounded-md px-1 py-1 transition-colors",
                  focused && "bg-primary/10 ring-1 ring-primary/30",
                )}
              >
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded bg-primary/15 px-1 font-mono normal-case text-primary">
                    [{citeNo}]
                  </span>
                  <span>Đoạn trích</span>
                  <span className="font-mono normal-case text-primary">
                    {c.course || courseCode}
                  </span>
                  <span>· Trang {c.page}</span>
                </div>
                <p className="mt-1 border-l-2 border-primary/40 pl-2 text-xs leading-relaxed text-foreground/80">
                  <HighlightedQuote text={c.snippet} highlight={c.highlightText} />
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
