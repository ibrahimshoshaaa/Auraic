"use client";
import { useState } from "react";
export function ReportExports({period,from,to}:{period:string;from:string;to:string}){
  const [busy,setBusy]=useState("");const [error,setError]=useState("");
  async function download(format:"pdf"|"xlsx"){
    setBusy(format);setError("");try{
      const query=new URLSearchParams({format,period,from,to});
      const response=await fetch(`/api/reports/export?${query}`,{cache:"no-store"});
      if(!response.ok){const body=await response.json();throw Error(body.error||"تعذر التصدير");}
      const blob=await response.blob();const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`auraic-report-${from}-${to}.${format}`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    }catch(e){setError(e instanceof Error?e.message:"تعذر تصدير التقرير");}finally{setBusy("");}
  }
  return <div><div className="flex flex-wrap gap-2">{(["pdf","xlsx"] as const).map(format=><button key={format} type="button" disabled={!!busy} onClick={()=>download(format)} className="rounded-xl border border-[#211b3d] bg-white px-4 py-2 text-sm font-semibold text-[#211b3d] disabled:opacity-50">{busy===format?"جارٍ تجهيز الملف…":format==="pdf"?"تصدير PDF":"تصدير Excel"}</button>)}</div><p className="mt-2 text-xs text-slate-500">كل أقسام التقرير للفترة المختارة، مع العملة وملاحظات الحساب.</p>{error&&<p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}</div>;
}
