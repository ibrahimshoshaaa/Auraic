"use client";
import { permissionGroups, selectedPermissions } from "@/lib/permissions";
export function PermissionPicker({ value, onChange, disabled = false }: { value: string[]; onChange: (next: string[]) => void; disabled?: boolean }) {
  return <fieldset disabled={disabled} className="space-y-4 rounded-xl border p-4 sm:col-span-2">
    <legend className="px-2 font-bold">صلاحيات الحساب</legend>
    <p className="text-sm text-slate-500">المتاح فقط هو ما تختاره هنا. بعض العمليات تحتاج صلاحيات مرتبطة؛ تظهر محددة معها. إلغاء صلاحية يلغي العمليات التي تعتمد عليها.</p>
    {permissionGroups.map(group => <div key={group.label}><h4 className="mb-2 font-semibold">{group.label}</h4><div className="grid gap-3 sm:grid-cols-2">{group.items.map(([key, label]) => <label key={key} className="flex items-start gap-2 text-sm"><input className="mt-1 size-4 accent-[#191735]" type="checkbox" checked={value.includes(key)} onChange={event => onChange(selectedPermissions(value, key, event.target.checked))} />{label}</label>)}</div></div>)}
  </fieldset>;
}
