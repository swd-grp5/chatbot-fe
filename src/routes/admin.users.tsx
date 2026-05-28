import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Lock, Unlock, ShieldCheck, GraduationCap, Users as UsersIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { loadUsers, updateUser, type MockUser } from "@/lib/mock-storage";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({ component: AdminUsersPage });

function AdminUsersPage() {
  const [rows, setRows] = useState<MockUser[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => setRows(loadUsers());

  useEffect(() => { load(); }, []);

  const toggleBlock = (row: MockUser) => {
    setBusyId(row.id);
    updateUser(row.id, { isBlocked: !row.isBlocked });
    toast.success(row.isBlocked ? "Đã mở khóa" : "Đã khóa tài khoản");
    load();
    setBusyId(null);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quản lý người dùng</h1>
          <p className="mt-1 text-sm text-muted-foreground">Khóa hoặc mở khóa truy cập của sinh viên.</p>
        </div>

        <Card className="overflow-hidden p-0">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <UsersIcon className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Chưa có người dùng nào.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                  <TableHead>Email</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm font-medium">{r.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1.5 font-normal">
                        {r.role === "admin" ? <ShieldCheck className="h-3 w-3" /> : <GraduationCap className="h-3 w-3" />}
                        {r.role === "admin" ? "Admin" : "Student"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.isBlocked ? (
                        <Badge variant="outline" className="gap-1.5 border-destructive/30 bg-destructive/10 text-destructive">
                          <Lock className="h-3 w-3" />Đã khóa
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1.5 border-success/30 bg-success/10 text-success">
                          <Unlock className="h-3 w-3" />Hoạt động
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant={r.isBlocked ? "outline" : "destructive"}
                        size="sm"
                        disabled={busyId === r.id || r.role === "admin"}
                        onClick={() => toggleBlock(r)}
                      >
                        {r.isBlocked ? (
                          <><Unlock className="mr-1.5 h-3.5 w-3.5" />Mở khóa</>
                        ) : (
                          <><Lock className="mr-1.5 h-3.5 w-3.5" />Khóa</>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
