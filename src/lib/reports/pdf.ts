import type { AccessPrincipal } from "../rbac";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { reportExportData, type BusinessReport } from "./export-data";
let font: Promise<string> | undefined;
export async function reportPdf(report: BusinessReport, actor?: AccessPrincipal) {
  font ??= readFile(path.join(process.cwd(),"public/fonts/Amiri-Regular.ttf")).then(data=>data.toString("base64"));
  const doc=new jsPDF({orientation:"landscape",unit:"mm",format:"a4",compress:true});
  doc.addFileToVFS("Amiri.ttf",await font);doc.addFont("Amiri.ttf","Amiri","normal");doc.addFont("Amiri.ttf","Amiri","bold");doc.setFont("Amiri");
  const tables=reportExportData(report, actor).tables;
  for(let i=0;i<tables.length;i++){
    if(i)doc.addPage();const table=tables[i];
    doc.setFontSize(19);doc.setTextColor("#211b3d");doc.text(`Auraic - ${table.name}`,282,16,{align:"right"});
    doc.setFontSize(10);doc.text(`${report.range.from} - ${report.range.to} | ${report.currency} | ${report.range.timeZone}`,282,24,{align:"right"});
    autoTable(doc,{startY:30,margin:{top:30,right:15,left:15,bottom:16},
      head:[[...table.columns].reverse()], body:table.rows.length?table.rows.map(row=>row.map(v=>v===null?"—":typeof v==='number'?new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(v):v).reverse()):[["لا توجد بيانات",...Array(table.columns.length-1).fill("")]],
      columnStyles:table.columns.length===9?{0:{cellWidth:25},1:{cellWidth:25},2:{cellWidth:25},3:{cellWidth:25},4:{cellWidth:25},5:{cellWidth:25},6:{cellWidth:25},7:{cellWidth:27},8:{cellWidth:65}}:{},
      styles:{minCellWidth:18,font:"Amiri",fontStyle:"normal",fontSize:table.columns.length>7?9:11,halign:"right",valign:"middle",cellPadding:3,overflow:"linebreak"},
      headStyles:{fillColor:"#211b3d",textColor:"#ffffff",fontStyle:"normal"},alternateRowStyles:{fillColor:"#f4f1f8"},
      didDrawPage:()=>{doc.setFont("Amiri");doc.setFontSize(9);doc.setTextColor("#666666");doc.text(`${table.name} - ${report.currency}`,282,10,{align:"right"});},
    });
  }
  const pages=doc.getNumberOfPages();for(let i=1;i<=pages;i++){doc.setPage(i);doc.setFontSize(9);doc.setTextColor("#666666");doc.text(`Auraic   ${i} / ${pages}`,148,202,{align:"center"});}
  return new Uint8Array(doc.output("arraybuffer"));
}
