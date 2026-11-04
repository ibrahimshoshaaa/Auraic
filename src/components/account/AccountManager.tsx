"use client";

import { PermissionPicker } from "./PermissionPicker";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type User = { id: string; name: string; email: string; role: string; status: string; permissions: string[] };

async function send(path: string, input: object, method = "POST") {
  const response = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "تعذر حفظ البيانات");
  return result;
}

export function AccountManager({ owner }: { owner: boolean }) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [fullAccess, setFullAccess] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (owner) fetch("/api/mobile/account/users", { cache: "no-store" })
      .then(async response => { if (!response.ok) throw new Error("تعذر تحميل المستخدمين"); return response.json(); })
      .then(result => setUsers(result.data)).catch(err => setError(err.message));
  }, [owner]);

  async function submit(event: FormEvent<HTMLFormElement>, path: string) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    setError(""); setMessage("");
    if (values.newPassword && values.newPassword !== values.confirmPassword) {
      setError("تأكيد كلمة المرور الجديدة غير مطابق"); return;
    }
    if (values.password && values.password !== values.confirmPassword) {
      setError("تأكيد كلمة مرور المستخدم غير مطابق"); return;
    }
    delete values.confirmPassword;
    setBusy(true);
    try {
      const result = await send(path, path.endsWith("/users") ? { ...values, permissions, fullAccess, ...(editing ? { userId: editing.id } : {}) } : values, editing && path.endsWith("/users") ? "PATCH" : "POST");
      form.reset();
      if (path.endsWith("/users")) {
        setUsers(current => editing ? current.map(u => u.id === editing.id ? result.data : u) : [...current, result.data]);
        setEditing(null); setPermissions([]); setFullAccess(false);
        setMessage("تم حفظ الحساب وصلاحياته. تعديل الصلاحيات يلغي جلسات التطبيق السابقة؛ يسجّل المستخدم دخوله مجددًا.");
      } else setMessage("تم تغيير كلمة المرور وإلغاء جميع جلسات الويب والموبايل السابقة. استخدم الجديدة عند تسجيل الدخول مرة أخرى.");
    } catch (err) { setError(err instanceof Error ? err.message : "تعذر الحفظ"); }
    finally { setBusy(false); }
  }

  const field = "mt-2 block w-full rounded-xl border border-[#deddea] bg-white px-4 py-3 outline-none focus:border-[#191735]";
  return <div className="space-y-6">
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}
    <section className="rounded-2xl border border-[#e5e4ec] bg-white p-5 shadow-sm sm:p-7">
      <h2 className="text-lg font-bold">تغيير كلمة المرور</h2>
      <p className="mt-1 text-sm text-slate-500">تحتاج كلمة المرور الحالية. الجديدة ١٢ حرفًا على الأقل وبحد أقصى ٧٢ بايت (٣٦ حرفًا عربيًا).</p>
      <form onSubmit={event => submit(event, "/api/mobile/account/password")} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">كلمة المرور الحالية<input name="currentPassword" type="password" autoComplete="current-password" required className={field} /></label>
        <label className="text-sm font-medium">كلمة المرور الجديدة<input name="newPassword" type="password" minLength={12} maxLength={72} autoComplete="new-password" required className={field} /></label>
        <label className="text-sm font-medium">تأكيد كلمة المرور الجديدة<input name="confirmPassword" type="password" minLength={12} autoComplete="new-password" required className={field} /></label>
        <button disabled={busy} className="self-end rounded-xl bg-[#191735] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">حفظ كلمة المرور</button>
      </form>
    </section>
    {owner && <section className="rounded-2xl border border-[#e5e4ec] bg-white p-5 shadow-sm sm:p-7">
      <h2 className="text-lg font-bold">الأدمن والمستخدمون</h2>
      <div className="mt-4 divide-y divide-[#e5e4ec]">{users.map(user => <div key={user.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span><strong>{user.name}</strong><span className="mr-2 text-slate-500" dir="ltr">{user.email}</span></span><span className="text-slate-500">{user.role === "OWNER" ? "أدمن كامل" : "صلاحيات مخصصة"} {user.role !== "OWNER" && <button type="button" disabled={busy} className="mr-3 underline" onClick={() => { setEditing(user); setPermissions(user.permissions.filter(p => p !== "*")); setFullAccess(false); }}>تعديل الصلاحيات</button>} · {user.status === "ACTIVE" ? "نشط" : user.status}</span></div>)}</div>
      <h3 className="mt-6 font-bold">{editing ? `تعديل صلاحيات ${editing.name}` : "إضافة مستخدم"}</h3>
      <form onSubmit={event => submit(event, "/api/mobile/account/users")} className="mt-4 grid gap-4 sm:grid-cols-2">
        {!editing && <><label className="text-sm font-medium">الاسم<input name="name" required minLength={2} maxLength={80} className={field} /></label>
        <label className="text-sm font-medium">البريد الإلكتروني<input name="email" type="email" autoComplete="off" required className={field} /></label>
        <label className="text-sm font-medium">كلمة مرور المستخدم الجديد<input name="password" type="password" minLength={12} maxLength={72} autoComplete="new-password" required className={field} /></label>
        <label className="text-sm font-medium">تأكيد كلمة المرور<input name="confirmPassword" type="password" minLength={12} autoComplete="new-password" required className={field} /></label>
        </>}
        {!editing && <label className="flex gap-2 sm:col-span-2"><input type="checkbox" disabled={busy} checked={fullAccess} onChange={e => setFullAccess(e.target.checked)} />أدمن كامل، يشمل إدارة المستخدمين وكل البيانات</label>}
        {!fullAccess && <PermissionPicker value={permissions} onChange={setPermissions} disabled={busy} />}
        <label className="text-sm font-medium">كلمة مرورك الحالية لتأكيد العملية<input name="currentPassword" type="password" autoComplete="current-password" required className={field} /></label>
        <button disabled={busy} className="self-end rounded-xl bg-[#191735] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{editing ? "حفظ الصلاحيات" : "إنشاء الحساب"}</button>
        {editing && <button type="button" disabled={busy} onClick={() => { setEditing(null); setPermissions([]); }}>إلغاء التعديل</button>}
      </form>
    </section>}
  </div>;
}
