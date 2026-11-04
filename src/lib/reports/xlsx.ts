import type { AccessPrincipal } from "../rbac";
import ExcelJS from "exceljs";
import { reportExportData, type BusinessReport } from "./export-data";
export async function reportXlsx(report: BusinessReport, actor?: AccessPrincipal) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Auraic";
  for (const table of reportExportData(report, actor).tables) {
    const sheet = workbook.addWorksheet(table.name, { views:[{state:"frozen",ySplit:4,rightToLeft:true}], pageSetup:{orientation:"landscape",fitToPage:true,fitToWidth:1,fitToHeight:0} });
    const cols=table.columns.length;
    sheet.addRow([`Auraic - ${table.name}`]); sheet.mergeCells(1,1,1,Math.max(cols,2));
    sheet.addRow([`${report.range.from} - ${report.range.to} | ${report.range.timeZone} | ${report.currency}`]);sheet.mergeCells(2,1,2,Math.max(cols,2));
    sheet.addRow([]); const header=sheet.addRow(table.columns);
    header.font={bold:true,color:{argb:"FFFFFFFF"}};header.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF211B3D"}}; header.height=32;
    for (const row of table.rows) sheet.addRow(row);
    if (table.rows.length) sheet.autoFilter={from:{row:4,column:1},to:{row:table.rows.length+4,column:cols}};
    sheet.eachRow((row,index)=>{
      row.alignment={vertical:"middle",horizontal:"right",wrapText:true};
      if(index>4){row.height=32;row.font={name:"Arial",size:11};if(index%2)row.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFF4F1F8"}};
        row.eachCell(cell=>{if(typeof cell.value==='number')cell.numFmt='#,##0.00';});}
    });
    sheet.getRow(1).font={name:"Arial",size:18,bold:true,color:{argb:"FF211B3D"}};sheet.getRow(1).height=32;sheet.getRow(2).height=25;
    sheet.columns.forEach((column,index)=>{column.width=cols===1?115:index<2?32:20;});
    if(cols===1)sheet.eachRow((row,index)=>{if(index>4)row.height=52;});
    sheet.eachRow((row,index)=>{if(index>4){let lines=1;row.eachCell((cell,col)=>{if(typeof cell.value==='string')lines=Math.max(lines,Math.ceil(cell.value.length/Math.max(8,(sheet.getColumn(col).width??20)*0.8)));});row.height=Math.min(409,Math.max(row.height??32,lines*16));}});
    sheet.pageSetup.printTitlesRow="1:4";
    sheet.headerFooter.oddFooter="Auraic - &P / &N";
  }
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
