import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { format } from 'date-fns'

// Logo ABJ — lazy-loaded once as base64 for reuse across all export formats
let _logoBase64 = null
let _logoWidth  = 0
let _logoHeight = 0

const loadLogo = () => new Promise((resolve) => {
  if (_logoBase64) { resolve(_logoBase64); return }
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width  = img.naturalWidth
    canvas.height = img.naturalHeight
    canvas.getContext('2d').drawImage(img, 0, 0)
    _logoWidth  = img.naturalWidth
    _logoHeight = img.naturalHeight
    _logoBase64 = canvas.toDataURL('image/png')
    resolve(_logoBase64)
  }
  img.onerror = () => resolve(null)   // graceful fallback if file missing
  img.src = new URL('@/assets/abj.png', import.meta.url).href
})

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmtDate = (d) => { try { return format(new Date(d), 'dd/MM/yyyy') } catch { return d ?? '' } }

// ─── EXCEL EXPORT ─────────────────────────────────────────────────────────────
// Uses ExcelJS (npm install exceljs) for image support in browser
// Falls back to xlsx-js-style if ExcelJS unavailable
export const exportToExcel = async (progressData, totalData, projectName, dateFrom, dateTo, extraInfo = {}, isMonthly = false) => {
  const logo = await loadLogo()

  // ── Try ExcelJS (supports images in browser) ──────────────────────────────
  let ExcelJS
  try { ExcelJS = (await import('exceljs')).default ?? (await import('exceljs')) } catch { ExcelJS = null }

  if (ExcelJS) {
    await _exportToExcelJS(ExcelJS, logo, progressData, totalData, projectName, dateFrom, dateTo, extraInfo, isMonthly)
  } else {
    _exportToXlsxStyle(logo, progressData, totalData, projectName, dateFrom, dateTo, extraInfo, isMonthly)
  }
}

// ── ExcelJS implementation (with image) ──────────────────────────────────────
async function _exportToExcelJS(ExcelJS, logo, progressData, totalData, projectName, dateFrom, dateTo, extraInfo, isMonthly = false) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Rekap Progress')

  const HDR_FILL = { type:'pattern', pattern:'solid', fgColor:{argb:'FFDCE6F1'} }
  const LGRAY_FILL= { type:'pattern', pattern:'solid', fgColor:{argb:'FFE8E8E8'} }
  const DGRAY_FILL= { type:'pattern', pattern:'solid', fgColor:{argb:'FFD0D0D0'} }
  const ALT_FILL  = { type:'pattern', pattern:'solid', fgColor:{argb:'FFF5F5F5'} }

  const thinBdr  = { style:'thin',   color:{argb:'FF000000'} }
  const thickBdr = { style:'double', color:{argb:'FF000000'} }
  const hairBdr  = { style:'hair',   color:{argb:'FF000000'} }
  const allThin  = { top:thinBdr, bottom:thinBdr, left:thinBdr, right:thinBdr }

  // Column widths (matching WEEKLYWAR)
  ws.columns = [
    {width:7.55},{width:16.44},{width:1.66},{width:21.89},{width:5.11},{width:26.33},
    {width:12},{width:8.43},{width:8.43},{width:16.66},{width:14.33},{width:16.66},{width:12.66},{width:34.66},
  ]

  // ── Logo image — top right (col N = 14, rows 1-4) ─────────────────────────
  if (logo) {
    const b64   = logo.replace(/^data:image\/png;base64,/, '')
    const imgId = wb.addImage({ base64: b64, extension: 'png' })
    ws.addImage(imgId, {
      tl: { col: 13, row: 0 },
      br: { col: 14, row: 4 },
      editAs: 'oneCell',
    })
  }

  // ── Helper: set cell value + style ───────────────────────────────────────
  const sc = (row, col, value, style = {}) => {
    const cell = ws.getCell(row, col)
    cell.value = value ?? ''
    if (style.font)      cell.font      = style.font
    if (style.alignment) cell.alignment = style.alignment
    if (style.border)    cell.border    = style.border
    if (style.fill)      cell.fill      = style.fill
    return cell
  }

  // ── TITLE row 2, cols A–M ─────────────────────────────────────────────────
  ws.mergeCells(2, 1, 5, 13)
  sc(2, 1, isMonthly ? 'REKAPITULASI LAPORAN BULANAN' : 'REKAPITULASI LAPORAN MINGGUAN', {
    font: { name:'Arial', size:20, bold:true },
    alignment: { horizontal:'center', vertical:'middle' },
  })

  // Doc code — col N row 5
  sc(5, 14, 'ABJ/CONS/FM-033 A Rev.04\nTgl Berlaku : 23 Februari 2025', {
    font: { name:'Arial', size:10 },
    alignment: { horizontal:'center', vertical:'top', wrapText:true },
  })

  // ── Row 6 separator ───────────────────────────────────────────────────────
  ws.mergeCells(6, 1, 6, 14)

  // ── Info rows 7–13 ────────────────────────────────────────────────────────
  const infoFont = { name:'Arial', size:11 }
  const infoData = [
    [7, 'Periode',                 fmtDate(dateFrom), true, 's/d', fmtDate(dateTo)],
    [8, 'Nama Proyek',             projectName || ''],
    [9, 'Kode Proyek/Program',     extraInfo?.kodeProyek || ''],
    [10,'Nama Sub-Proyek/Program', extraInfo?.namaSubProyek || ''],
    [11,'Lokasi',                  extraInfo?.lokasi || ''],
    [12,'Nama Kontraktor',         'PT. Bestindo Putra Mandiri'],
    [13,'Nomor PO',                extraInfo?.noPO || ''],
  ]
  infoData.forEach(([r, lbl, val, sep, sv, v2]) => {
    ws.getRow(r).height = 16.95
    sc(r, 1, lbl, { font:infoFont, alignment:{vertical:'center'} })
    sc(r, 3, ':',  { font:infoFont, alignment:{horizontal:'center', vertical:'center'} })
    sc(r, 4, val,  { font:infoFont, alignment:{vertical:'center'} })
    if (sep) {
      sc(r, 5, sv,  { font:infoFont, alignment:{horizontal:'center', vertical:'center'} })
      sc(r, 6, v2,  { font:infoFont, alignment:{vertical:'center'} })
    } else {
      ws.mergeCells(r, 4, r, 6)
    }
  })

  // Row 14 separator
  ws.mergeCells(14, 1, 14, 14)

  // ── Table header rows 16–18 ───────────────────────────────────────────────
  ws.getRow(16).height = 33
  ws.getRow(17).height = 47.25
  ws.getRow(18).height = 12

  const hdrFont = { name:'Arial', size:10, bold:true }
  const hdrAl   = { horizontal:'center', vertical:'middle', wrapText:true }
  const hdrBdr  = { top:thickBdr, bottom:thinBdr, left:thickBdr, right:thinBdr }

  const setHdr = (r, c, val, mergeR2, mergeC2) => {
    ws.mergeCells(r, c, mergeR2 ?? r, mergeC2 ?? c)
    sc(r, c, val, { font:hdrFont, alignment:hdrAl, border:hdrBdr, fill:HDR_FILL })
  }

  setHdr(16, 1, 'No.',             17, 1)
  setHdr(16, 2, 'Uraian Pekerjaan',17, 7)
  setHdr(16, 8, 'Satuan',          17, 8)
  setHdr(16, 9, 'Volume\nBOQ',     17, 9)
  setHdr(16,10, 'Bobot Pekerjaan', 17,10)
  setHdr(16,11, 'Progress',        16,13)
  setHdr(16,14, 'Deviasi\nProgress',17,14)
  // Keterangan — no column 15 in our layout; use col 14 merged
  // sub-headers row 17
  sc(17,11,'Progres Kumulatif s/d Minggu lalu',{font:{name:'Arial',size:10,bold:true},alignment:hdrAl,border:allThin,fill:HDR_FILL})
  sc(17,12,'Progres Minggu ini',               {font:{name:'Arial',size:10,bold:true},alignment:hdrAl,border:allThin,fill:HDR_FILL})
  sc(17,13,'Progres Kumulatif s/d Minggu ini', {font:{name:'Arial',size:10,bold:true},alignment:hdrAl,border:allThin,fill:HDR_FILL})
  // Row 18 numbers
  ;[[1,'1'],[2,'2'],[8,'3'],[9,'4'],[10,'5'],[11,'6'],[12,'7'],[13,'8=6+7'],[14,'9=8-3']].forEach(([c,v])=>{
    sc(18,c,v,{font:{name:'Arial',size:9,bold:true},alignment:{horizontal:'center',vertical:'middle'},border:allThin,fill:HDR_FILL})
  })

  // ── Data rows ─────────────────────────────────────────────────────────────
  const DS = 19
  progressData.forEach((row, i) => {
    const r   = DS + i
    const fill= i % 2 === 1 ? ALT_FILL : undefined
    ws.getRow(r).height = 15
    ws.mergeCells(r, 2, r, 7)

    const dr = (c, val, halign) => sc(r, c, val??'', {
      font: {name:'Arial',size:10}, alignment:{horizontal:halign,vertical:'top',wrapText:true},
      border: allThin, fill,
    })
    dr(1, row.no,          'center')
    dr(2, row.col2,        'left')
    dr(8, row.satuan,      'center')
    dr(9, row.boq,         'right')
    dr(10,row.bobot,       'right')
    dr(11,row.cumlastweek, 'right')
    dr(12,row.thisweek,    'right')
    dr(13,row.cumthisweek, 'right')
    dr(14,'', 'left')
  })

  // Total Upah Kerja
  const tuR = DS + progressData.length
  ws.getRow(tuR).height = 15
  ws.mergeCells(tuR, 2, tuR, 7)
  const tuFill = LGRAY_FILL
  const tuFont = { name:'Arial', size:10, bold:true }
  sc(tuR,1,'',            {fill:tuFill,border:{top:hairBdr,bottom:hairBdr,left:thickBdr,right:thinBdr}})
  sc(tuR,2,'Total Upah Kerja',{font:tuFont,alignment:{horizontal:'right'},fill:tuFill,border:{top:hairBdr,bottom:hairBdr}})
  sc(tuR,8,'',            {fill:tuFill,border:{top:hairBdr,bottom:hairBdr,left:thinBdr,right:thinBdr}})
  sc(tuR,9,0,             {font:tuFont,alignment:{horizontal:'right'},fill:tuFill,border:allThin})
  ;[10,11,12,13,14].forEach(c=>sc(tuR,c,'',{fill:tuFill,border:allThin}))

  // PROGRESS PEKERJAAN
  const ppR = tuR + 1
  ws.getRow(ppR).height = 20
  ws.mergeCells(ppR, 2, ppR, 7)
  const ppFill = DGRAY_FILL
  const ppFont = { name:'Arial', size:10, bold:true }
  const ppBdr  = { top:thickBdr, bottom:thickBdr, left:thickBdr, right:thinBdr }
  sc(ppR,1,'',{fill:ppFill,border:ppBdr})
  sc(ppR,2,'PROGRESS PEKERJAAN',{font:ppFont,alignment:{horizontal:'left'},fill:ppFill,border:{top:thickBdr,bottom:thickBdr}})
  ;[8,9].forEach(c=>sc(ppR,c,'',{fill:ppFill,border:{top:thickBdr,bottom:thickBdr,left:thinBdr,right:thinBdr}}))
  sc(ppR,10,totalData.totalbobot??'',       {font:ppFont,alignment:{horizontal:'right'},fill:ppFill,border:allThin})
  sc(ppR,11,totalData.totalcumlastweek??'', {font:ppFont,alignment:{horizontal:'right'},fill:ppFill,border:allThin})
  sc(ppR,12,totalData.totalthisweek??'',    {font:ppFont,alignment:{horizontal:'right'},fill:ppFill,border:allThin})
  sc(ppR,13,totalData.totalcumthisweek??'', {font:ppFont,alignment:{horizontal:'right'},fill:ppFill,border:allThin})
  sc(ppR,14,'',{fill:ppFill,border:{top:thickBdr,bottom:thickBdr,left:thinBdr,right:thickBdr}})

  // ── Signature rows ────────────────────────────────────────────────────────
  const sigR = ppR + 3
  const sFont= { name:'Arial', size:10 }
  const sAl  = { horizontal:'center' }
  ;[[2,'Diajukan oleh,'],[6,'Diperiksa oleh,'],[11,'Diperiksa oleh,'],[14,'Disetujui oleh,']].forEach(([c,v])=>sc(sigR,c,v,{font:sFont,alignment:sAl}))
  ;[[2,'Kontraktor'],[6,'Pengawas'],[11,'PT. Air Bersih Jakarta'],[14,'PT. Air Bersih Jakarta']].forEach(([c,v])=>sc(sigR+1,c,v,{font:sFont,alignment:sAl}))
  sc(sigR+5, 2, `: ${projectName||''}`, {font:sFont})
  ;[[2,'Nama'],[6,'Nama'],[11,'Nama'],[14,'Nama']].forEach(([c,v])=>sc(sigR+8,c,v,{font:sFont,alignment:sAl}))
  ;[[2,'Project Manager'],[11,'Project Engineer'],[14,'Project Manager']].forEach(([c,v])=>sc(sigR+9,c,v,{font:sFont,alignment:sAl}))

  // ── Row heights ───────────────────────────────────────────────────────────
  ws.getRow(1).height  = 15
  ws.getRow(2).height  = 18
  ws.getRow(5).height  = 46.5
  ws.getRow(6).height  = 9.75
  ws.getRow(14).height = 10.2
  ws.getRow(15).height = 15

  // ── Download ──────────────────────────────────────────────────────────────
  const buf  = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${isMonthly ? 'Laporan_Bulanan' : 'Laporan_Mingguan'}_${format(new Date(),'yyyyMMdd_HHmmss')}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

// ── xlsx-js-style fallback (no image support in browser) ─────────────────────
function _exportToXlsxStyle(logo, progressData, totalData, projectName, dateFrom, dateTo, extraInfo, isMonthly = false) {
  let XS
  try { XS = require('xlsx-js-style') } catch { XS = XLSX }

  const wb  = XS.utils.book_new()
  const ws  = {}
  const mrg = []

  const addr = (r, c) => XS.utils.encode_cell({ r, c })
  const C = (r, c, v, s = {}) => { ws[addr(r,c)] = { v: v ?? '', t: typeof v === 'number' ? 'n' : 's', s } }
  const M = (r1,c1,r2,c2) => mrg.push({ s:{r:r1,c:c1}, e:{r:r2,c:c2} })
  const S = ({ bold=false, sz=10, nm='Arial', h, v, wrap, t, b, l, r, fill } = {}) => {
    const s = { font: { name:nm, sz, bold } }
    if (h||v||wrap) s.alignment = { horizontal:h, vertical:v??'center', wrapText:wrap??false }
    if (t||b||l||r) {
      const bdr = x => x ? { style:x, color:{rgb:'000000'} } : {}
      s.border = { top:bdr(t), bottom:bdr(b), left:bdr(l), right:bdr(r) }
    }
    if (fill) s.fill = { patternType:'solid', fgColor:{rgb:fill} }
    return s
  }

  const DB='double', TH='thin', HR='hair'
  const HDR_BG='FFDCE6F1', LGRAY='FFE8E8E8', DGRAY='FFD0D0D0', ALT='FFF5F5F5'

  C(1,0,isMonthly ? 'REKAPITULASI LAPORAN BULANAN' : 'REKAPITULASI LAPORAN MINGGUAN',S({bold:true,sz:20,h:'center',v:'center'}))
  M(1,0,4,12)
  C(4,13,'ABJ/CONS/FM-033 A Rev.04\nTgl Berlaku : 23 Februari 2025',S({sz:10,h:'center',v:'top',wrap:true}))
  C(5,0,'',{}); M(5,0,5,13)

  const iS=S({sz:11,v:'center'}), iSL=S({sz:11,v:'center',h:'left'})
  const infoRows=[
    [6,'Periode',null,fmtDate(dateFrom),true,'s/d',fmtDate(dateTo)],
    [7,'Nama Proyek',8,projectName||''],
    [8,'Kode Proyek/Program',5,extraInfo?.kodeProyek||''],
    [9,'Nama Sub-Proyek/Program',5,extraInfo?.namaSubProyek||''],
    [10,'Lokasi',5,extraInfo?.lokasi||''],
    [11,'Nama Kontraktor',5,'PT. Bestindo Putra Mandiri'],
    [12,'Nomor PO',5,extraInfo?.noPO||''],
  ]
  infoRows.forEach(([r,lbl,mec,val,sep,sv,v2])=>{
    C(r,0,lbl,iS); C(r,2,':',iS); C(r,3,val,iSL)
    if(sep){C(r,4,sv,S({sz:11,v:'center',h:'center'}));C(r,5,v2,iSL)}
    else if(mec) M(r,3,r,mec-1)
  })
  C(13,0,'',{}); M(13,0,13,13)

  const HD=(t,b,l,r)=>S({bold:true,sz:10,h:'center',v:'center',wrap:true,t,b,l,r,fill:HDR_BG})
  C(15,0,'No.',HD(DB,null,DB,TH));M(15,0,16,0)
  C(15,1,'Uraian Pekerjaan',HD(DB,null,TH,TH));M(15,1,16,5)
  C(15,6,'Satuan',HD(DB,null,TH,TH));M(15,6,16,6)
  C(15,7,'Volume\nBOQ',HD(DB,null,TH,TH));M(15,7,16,7)
  C(15,8,'Bobot Pekerjaan',HD(DB,null,TH,TH));M(15,8,16,8)
  C(15,9,'Progress',HD(DB,TH,TH,TH));M(15,9,15,11)
  C(15,12,'Deviasi\nProgress',HD(DB,null,TH,TH));M(15,12,16,12)
  C(15,13,'Keterangan',HD(DB,null,TH,DB));M(15,13,16,13)
  ;[2,3,4,5].forEach(c=>{C(15,c,'',S({fill:HDR_BG,t:DB}))})
  ;[10,11].forEach(c=>{C(15,c,'',S({fill:HDR_BG,t:DB,b:TH}))})
  C(16,9,'Progres Kumulatif s/d Minggu lalu',HD(TH,TH,TH,TH))
  C(16,10,'Progres Minggu ini',HD(TH,TH,TH,TH))
  C(16,11,'Progres Kumulatif s/d Minggu ini',HD(TH,TH,TH,TH))
  C(16,0,'',S({fill:HDR_BG,l:DB,r:TH}))
  ;[2,3,4,5].forEach(c=>C(16,c,'',S({fill:HDR_BG})))
  C(16,5,'',S({fill:HDR_BG,r:TH}))
  ;[6,7,8].forEach(c=>C(16,c,'',S({fill:HDR_BG,l:TH,r:TH})))
  C(16,12,'',S({fill:HDR_BG,l:TH,r:TH}))
  C(16,13,'',S({fill:HDR_BG,l:TH,r:DB}))
  const NS=(l,r)=>S({bold:true,sz:9,h:'center',v:'center',t:TH,l,r,fill:HDR_BG})
  ;[[0,1,DB,TH],[1,2,TH,TH],[6,3,TH,TH],[7,4,TH,TH],[8,5,TH,TH],[9,6,TH,TH],[10,7,TH,TH],[11,'8=6+7',TH,null],[12,'9=8-3',TH,TH],[13,10,TH,DB]].forEach(([c,v,l,r])=>C(17,c,v,NS(l,r)))
  ;[2,3,4].forEach(c=>C(17,c,'',S({fill:HDR_BG,t:TH})))
  C(17,5,'',S({fill:HDR_BG,t:TH,r:TH}))

  const DSR=18
  progressData.forEach((row,i)=>{
    const r=DSR+i, bg=i%2===1?ALT:'FFFFFFFF'
    M(r,1,r,5)
    const dc=(c,v,h,l,rt)=>C(r,c,v??'',S({sz:10,v:'top',wrap:true,h,t:TH,b:TH,l,r:rt,fill:bg}))
    dc(0,row.no,'center',DB,TH); dc(1,row.col2,'left',TH,TH)
    ;[2,3,4].forEach(c=>C(r,c,'',S({t:TH,b:TH,fill:bg})))
    C(r,5,'',S({t:TH,b:TH,r:TH,fill:bg}))
    dc(6,row.satuan,'center',TH,TH); dc(7,row.boq,'right',TH,TH)
    dc(8,row.bobot,'right',TH,TH); dc(9,row.cumlastweek,'right',TH,TH)
    dc(10,row.thisweek,'right',TH,TH); dc(11,row.cumthisweek,'right',TH,TH)
    dc(12,'',null,TH,TH); dc(13,'',null,TH,DB)
  })
  const LD=DSR+progressData.length-1,tuR2=LD+1,ppR2=LD+2,btR=LD+3
  M(tuR2,1,tuR2,5)
  C(tuR2,0,'',S({sz:10,t:HR,b:HR,l:DB,r:TH,fill:LGRAY}))
  C(tuR2,1,'Total Upah Kerja',S({bold:true,sz:10,t:HR,b:HR,l:TH,h:'right',fill:LGRAY}))
  ;[2,3,4].forEach(c=>C(tuR2,c,'',S({t:HR,b:HR,fill:LGRAY})))
  C(tuR2,5,'',S({t:HR,b:HR,fill:LGRAY}))
  C(tuR2,6,0,S({bold:true,sz:10,t:HR,b:HR,l:TH,r:TH,h:'right',fill:LGRAY}))
  ;[7,8].forEach(c=>C(tuR2,c,'',S({bold:true,sz:10,t:HR,b:HR,l:TH,r:TH,fill:LGRAY})))
  ;[9,10,11,12].forEach(c=>C(tuR2,c,'',S({sz:10,t:HR,b:HR,l:TH,r:TH,fill:LGRAY})))
  C(tuR2,13,'',S({sz:10,t:HR,b:HR,l:TH,r:DB,fill:LGRAY}))
  M(ppR2,1,ppR2,5)
  C(ppR2,0,'',S({sz:10,t:DB,b:DB,l:DB,r:TH,fill:DGRAY}))
  C(ppR2,1,'PROGRESS PEKERJAAN',S({bold:true,sz:10,t:DB,b:DB,l:TH,h:'left',fill:DGRAY}))
  ;[2,3,4].forEach(c=>C(ppR2,c,'',S({t:DB,b:DB,fill:DGRAY})))
  C(ppR2,5,'',S({t:DB,b:DB,r:TH,fill:DGRAY}))
  ;[6,7].forEach(c=>C(ppR2,c,'',S({t:DB,b:DB,l:TH,r:TH,fill:DGRAY})))
  C(ppR2,8,totalData.totalbobot??'',S({sz:10,t:TH,b:TH,l:TH,r:TH,h:'right',fill:DGRAY}))
  C(ppR2,9,totalData.totalcumlastweek??'',S({sz:10,t:TH,b:TH,l:TH,r:TH,h:'right',fill:DGRAY}))
  C(ppR2,10,totalData.totalthisweek??'',S({sz:10,t:TH,b:TH,l:TH,r:TH,h:'right',fill:DGRAY}))
  C(ppR2,11,totalData.totalcumthisweek??'',S({sz:10,t:TH,b:TH,l:TH,r:TH,h:'right',fill:DGRAY}))
  C(ppR2,12,'',S({t:DB,b:DB,l:TH,r:TH,fill:DGRAY}))
  C(ppR2,13,'',S({t:DB,b:DB,l:TH,r:DB,fill:DGRAY}))
  C(btR,0,'',S({t:DB,l:DB}))
  ;[1,2,3,4,5,6,7,8,9,10,11,12].forEach(c=>C(btR,c,'',S({t:DB})))
  C(btR,13,'',S({t:DB,r:DB}))
  const sigR2=btR+2,sC=S({sz:10,h:'center'})
  ;[[1,'Diajukan oleh,'],[5,'Diperiksa oleh,'],[10,'Diperiksa oleh,'],[13,'Disetujui oleh,']].forEach(([c,v])=>C(sigR2,c,v,sC))
  ;[[1,'Kontraktor'],[5,'Pengawas'],[10,'PT. Air Bersih Jakarta'],[13,'PT. Air Bersih Jakarta']].forEach(([c,v])=>C(sigR2+1,c,v,sC))
  C(sigR2+5,1,`: ${projectName||''}`,S({sz:10}))
  ;[[1,'Nama'],[5,'Nama'],[10,'Nama'],[13,'Nama']].forEach(([c,v])=>C(sigR2+8,c,v,sC))
  ;[[1,'Project Manager'],[10,'Project Engineer'],[13,'Project Manager']].forEach(([c,v])=>C(sigR2+9,c,v,sC))

  ws['!ref']   =XS.utils.encode_range({r:0,c:0},{r:sigR2+10,c:13})
  ws['!merges']=mrg
  ws['!cols']  =[{wch:7.55},{wch:16.44},{wch:1.66},{wch:21.89},{wch:5.11},{wch:26.33},{wch:12},{wch:8.43},{wch:8.43},{wch:16.66},{wch:14.33},{wch:16.66},{wch:12.66},{wch:34.66}]
  const rh={0:15,1:18,2:17.4,4:46.5,5:9.75,6:16.95,7:16.95,8:16.95,9:16.95,10:16.95,11:16.95,12:16.95,13:10.2,14:15,15:33,16:47.25,17:12}
  for(let i=0;i<progressData.length;i++) rh[DSR+i]=15
  rh[tuR2]=15;rh[ppR2]=20;rh[btR]=8
  ws['!rows']=Array.from({length:sigR2+11},(_,i)=>rh[i]?{hpt:rh[i]}:{})
  XS.utils.book_append_sheet(wb,ws,'Rekap Progress')
  XS.writeFile(wb,`${isMonthly ? 'Laporan_Bulanan' : 'Laporan_Mingguan'}_${format(new Date(),'yyyyMMdd_HHmmss')}.xlsx`)
}


// ─── PDF EXPORT — PORTRAIT A4 ─────────────────────────────────────────────────
export const exportToPDF = async (progressData, totalData, projectName, dateFrom, dateTo, extraInfo = {}, isMonthly = false) => {
  const logo = await loadLogo()

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const PW  = doc.internal.pageSize.getWidth()
  const PH  = doc.internal.pageSize.getHeight()
  const ML  = 15, MR = 15
  const UW  = PW - ML - MR
  const now = format(new Date(), 'dd/MM/yyyy HH:mm:ss')

  const f = (bold, sz) => doc.setFont('helvetica', bold ? 'bold' : 'normal').setFontSize(sz)

  // ── Draw page header (first page only) ────────────────────────────────────
  const drawHeader = () => {
    // Logo ABJ — top RIGHT, stacked above doc code text
    const LH = 12
    let LW = 0
    if (logo) {
      LW = LH * (_logoWidth / _logoHeight)
      doc.addImage(logo, 'PNG', ML + UW - LW, 10, LW, LH)
    }

    // Doc code — top right, just below logo
    f(false, 7)
    const dcY = 10 + LH + 2
    doc.text('ABJ/CONS/FM-033 A Rev.04',      ML + UW, dcY,     { align: 'right' })
    doc.text('Tgl Berlaku : 23 Februari 2025', ML + UW, dcY + 4, { align: 'right' })

    // Title — centered across full width
    f(true, 13)
    doc.text(isMonthly ? 'REKAPITULASI LAPORAN BULANAN' : 'REKAPITULASI LAPORAN MINGGUAN', ML + UW / 2, 18, { align: 'center' })

    // Thick + thin separator — below the right-column block
    const sepY = dcY + 8
    doc.setLineWidth(1.0); doc.line(ML, sepY,   ML + UW, sepY)
    doc.setLineWidth(0.3); doc.line(ML, sepY+1, ML + UW, sepY+1)

    // Info block
    f(false, 8.5)
    const lx = ML, cx = ML + 47, vx = ML + 50
    let iy = sepY + 5

    const rows = [
      ['Periode',                 `${fmtDate(dateFrom)}   s/d   ${fmtDate(dateTo)}`],
      ['Nama Proyek',             projectName || ''],
      ['Kode Proyek/Program',     extraInfo?.kodeProyek || ''],
      ['Nama Sub-Proyek/Program', extraInfo?.namaSubProyek || ''],
      ['Lokasi',                  extraInfo?.lokasi || ''],
      ['Nama Kontraktor',         'PT. Bestindo Putra Mandiri'],
      ['Nomor PO',                extraInfo?.noPO || ''],
    ]
    rows.forEach(([lbl, val]) => {
      doc.text(lbl,    lx, iy)
      doc.text(':',    cx, iy)
      doc.text(val||'',vx, iy)
      iy += 4.6
    })

    // Thick + thin separator below info
    const sy = iy + 1
    doc.setLineWidth(1.0); doc.line(ML, sy,   ML + UW, sy)
    doc.setLineWidth(0.3); doc.line(ML, sy+1, ML + UW, sy+1)

    return sy + 3.5
  }

  const firstY = drawHeader()

  // ── Column widths ─────────────────────────────────────────────────────────
  const cNo=7, cUr=48, cSat=12, cBOQ=12, cBob=13, cCL=14, cTW=11, cCT=14, cDev=11
  const cKet = UW - cNo - cUr - cSat - cBOQ - cBob - cCL - cTW - cCT - cDev
  const COL_W = [cNo, cUr, cSat, cBOQ, cBob, cCL, cTW, cCT, cDev, cKet]

  const HDR_BG = [220, 230, 241]
  const LGRAY  = [232, 232, 232]
  const DGRAY  = [208, 208, 208]
  const ALT    = [245, 245, 245]
  const BLACK  = [0, 0, 0]

  const HS = (extra={}) => ({
    fontStyle:'bold', halign:'center', valign:'middle', fontSize:6,
    fillColor:HDR_BG, textColor:BLACK, lineColor:BLACK, lineWidth:0.3,
    cellPadding:{top:1.5,bottom:1.5,left:1.5,right:1.5}, ...extra
  })

  const headRows = [
    [
      {content:'No.',               rowSpan:3, styles:HS()},
      {content:'Uraian\nPekerjaan', rowSpan:3, styles:HS()},
      {content:'Satuan',            rowSpan:3, styles:HS()},
      {content:'Volume\nBOQ',       rowSpan:3, styles:HS()},
      {content:'Bobot\nPekerjaan',  rowSpan:3, styles:HS()},
      {content:'Progress',          colSpan:3, styles:HS()},
      {content:'Deviasi\nProgress', rowSpan:3, styles:HS()},
      {content:'Keterangan',        rowSpan:3, styles:HS()},
    ],
    [
      {content:'Progres Kumulatif\ns/d Minggu lalu', styles:HS({fontSize:5.5})},
      {content:'Progres\nMinggu ini',                styles:HS({fontSize:5.5})},
      {content:'Progres Kumulatif\ns/d Minggu ini',  styles:HS({fontSize:5.5})},
    ],
    [
      {content:'6',     styles:HS({fontSize:6})},
      {content:'7',     styles:HS({fontSize:6})},
      {content:'8=6+7', styles:HS({fontSize:6})},
    ],
  ]

  const DS_style = (h='left', bg=null) => ({
    halign:h, valign:'top', fontSize:7, textColor:BLACK,
    lineColor:[160,160,160], lineWidth:0.2,
    fillColor: bg || [255,255,255],
    cellPadding:{top:1.5,bottom:1.5,left:1.5,right:1.5},
  })

  const bodyRows = progressData.map((row, i) => {
    const bg = i % 2 === 1 ? ALT : null
    return [
      {content:row.no??'',          styles:DS_style('center',bg)},
      {content:row.col2??'',        styles:DS_style('left',bg)},
      {content:row.satuan??'',      styles:DS_style('center',bg)},
      {content:row.boq??'',         styles:DS_style('right',bg)},
      {content:row.bobot??'',       styles:DS_style('right',bg)},
      {content:row.cumlastweek??'', styles:DS_style('right',bg)},
      {content:row.thisweek??'',    styles:DS_style('right',bg)},
      {content:row.cumthisweek??'', styles:DS_style('right',bg)},
      {content:'',                  styles:DS_style('right',bg)},
      {content:'',                  styles:DS_style('left',bg)},
    ]
  })

  bodyRows.push(Array(10).fill(null).map((_,i)=>({
    content: i===1?'Total Upah Kerja': i===3?'0':'',
    styles: { fontStyle:'bold', halign:i===1?'left':i===3?'right':'center',
              valign:'middle', fontSize:7, fillColor:LGRAY,
              lineColor:BLACK, lineWidth:0.4,
              cellPadding:{top:2,bottom:2,left:1.5,right:1.5} }
  })))

  const ppV = ['','PROGRESS PEKERJAAN','','',
    totalData.totalbobot??'', totalData.totalcumlastweek??'',
    totalData.totalthisweek??'', totalData.totalcumthisweek??'','','']
  bodyRows.push(ppV.map((v,i)=>({
    content: v,
    styles: { fontStyle:'bold', halign:i===1?'left':i>=4&&i<=7?'right':'center',
              valign:'middle', fontSize:7, fillColor:DGRAY,
              lineColor:BLACK, lineWidth:0.6,
              cellPadding:{top:2,bottom:2,left:1.5,right:1.5} }
  })))

  doc.autoTable({
    startY: firstY,
    head:   headRows,
    body:   bodyRows,
    theme:  'grid',
    columnStyles: Object.fromEntries(COL_W.map((w,i)=>[i,{cellWidth:w}])),
    headStyles:  { fillColor:HDR_BG, textColor:BLACK, lineColor:BLACK, lineWidth:0.3, minCellHeight:4 },
    bodyStyles:  { fontSize:7, lineColor:[160,160,160], lineWidth:0.2, textColor:BLACK,
                   valign:'top', cellPadding:{top:1.5,bottom:1.5,left:1.5,right:1.5} },
    tableLineColor: BLACK,
    tableLineWidth: 0.8,
    margin: { left:ML, right:MR, top:15, bottom:18 },
    didDrawPage: () => {
      f(false, 6.5)
      doc.setTextColor(100,100,100)
      doc.text(`Dicetak: ${now}`, ML, PH - 8)
      const pg  = doc.internal.getCurrentPageInfo().pageNumber
      const tot = doc.internal.getNumberOfPages()
      doc.text(`Halaman ${pg} dari ${tot}`, ML + UW/2, PH - 8, {align:'center'})
      doc.setTextColor(0,0,0)
    },
  })

  // ── Signature section ─────────────────────────────────────────────────────
  const finalY = doc.lastAutoTable.finalY
  const sigW   = UW / 4
  let sy = finalY + 8
  if (sy + 42 > PH - 18) { doc.addPage(); sy = ML + 10 }

  const sigCols = [
    { label:'Diajukan oleh,',  org:'Kontraktor',             title:'Project Manager',  showProyek:true  },
    { label:'Diperiksa oleh,', org:'Pengawas',               title:'',                 showProyek:false },
    { label:'Diperiksa oleh,', org:'PT. Air Bersih Jakarta', title:'Project Engineer', showProyek:false },
    { label:'Disetujui oleh,', org:'PT. Air Bersih Jakarta', title:'Project Manager',  showProyek:false },
  ]
  f(false, 8)
  sigCols.forEach(({ label, org, title, showProyek }, idx) => {
    const cx = ML + idx * sigW + sigW / 2
    doc.text(label, cx, sy,       { align:'center' })
    doc.text(org,   cx, sy + 4.5, { align:'center' })
    if (showProyek) {
      f(false, 7)
      doc.text(`: ${projectName || ''}`, ML + idx * sigW + 2, sy + 15)
      f(false, 8)
    }
    doc.setLineWidth(0.4)
    doc.line(ML + idx * sigW + 2, sy + 26, ML + (idx + 1) * sigW - 2, sy + 26)
    doc.text('Nama', cx, sy + 30, { align:'center' })
    if (title) doc.text(title, cx, sy + 35, { align:'center' })
  })

  doc.save(`${isMonthly ? 'Laporan_Bulanan' : 'Laporan_Mingguan'}_${format(new Date(),'yyyyMMdd_HHmmss')}.pdf`)
}

// ─── WORD EXPORT (.docx) ──────────────────────────────────────────────────────
// Requires: npm install docx
export const exportToWord = async (progressData, totalData, projectName, dateFrom, dateTo, extraInfo = {}, isMonthly = false) => {
  const logo = await loadLogo()

  const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
    AlignmentType, WidthType, BorderStyle, ShadingType, VerticalAlign,
    PageNumber, Footer,
  } = await import('docx')

  // ── Page: A4 portrait, 15mm margins ──────────────────────────────────────
  const PAGE_W  = 11906
  const PAGE_H  = 16838
  const MARGIN  = 851          // 15 mm
  const CONTENT = PAGE_W - MARGIN * 2   // 10204 DXA

  // ── Helpers ───────────────────────────────────────────────────────────────
  const bdr  = (sz=4, color='000000', style=BorderStyle.SINGLE) => ({ style, size:sz, color })
  const noBdr = () => ({ style:BorderStyle.NONE, size:0, color:'FFFFFF' })
  const allBdr = (sz=4) => ({ top:bdr(sz), bottom:bdr(sz), left:bdr(sz), right:bdr(sz) })
  const shade  = (fill) => ({ fill, type:ShadingType.CLEAR, color:'auto' })

  const txt = (text, { bold=false, sz=16, font='Arial', color='000000' }={}) =>
    new TextRun({ text:String(text??''), bold, size:sz, font, color })

  const para = (runs, align=AlignmentType.LEFT) =>
    new Paragraph({
      children: Array.isArray(runs)?runs:[runs],
      alignment: align,
      spacing: { before:0, after:0 },
    })

  const mkCell = (children, { w, bg='FFFFFF', vAlign=VerticalAlign.TOP,
    borders=allBdr(), margins={top:40,bottom:40,left:60,right:60},
    colSpan, rowSpan }={}) =>
    new TableCell({
      children: Array.isArray(children)?children:[children],
      width:        w ? { size:w, type:WidthType.DXA } : undefined,
      shading:      shade(bg),
      verticalAlign: vAlign,
      borders,
      margins,
      columnSpan:   colSpan,
      rowSpan,
    })

  // ── Column widths (sum = 10204) ───────────────────────────────────────────
  // No | Uraian | Satuan | BOQ | Bobot | CumLast | ThisWk | CumThis | Deviasi | Ket
  const cW = [560, 2700, 760, 760, 840, 1000, 880, 1000, 780, 924]

  // ── Table header ──────────────────────────────────────────────────────────
  const HDR_BG = 'DCE6F1'
  const LGRAY  = 'E8E8E8'
  const DGRAY  = 'D0D0D0'
  const ALT_BG = 'F5F5F5'

  const hBdr = () => ({ top:bdr(8), bottom:bdr(6), left:bdr(4), right:bdr(4) })
  const hS = (extra={}) => ({ bg:HDR_BG, vAlign:VerticalAlign.CENTER, borders:hBdr(),
    margins:{top:40,bottom:40,left:60,right:60}, ...extra })
  const hPara = (text, align=AlignmentType.CENTER) =>
    para(txt(text,{bold:true,sz:14}), align)

  const hRow1 = new TableRow({ tableHeader:true, children:[
    mkCell(hPara('No.'),               {...hS(), w:cW[0], rowSpan:3}),
    mkCell(hPara('Uraian\nPekerjaan'), {...hS(), w:cW[1], rowSpan:3}),
    mkCell(hPara('Satuan'),            {...hS(), w:cW[2], rowSpan:3}),
    mkCell(hPara('Volume\nBOQ'),       {...hS(), w:cW[3], rowSpan:3}),
    mkCell(hPara('Bobot\nPekerjaan'),  {...hS(), w:cW[4], rowSpan:3}),
    mkCell(hPara('Progress'),          {...hS(), w:cW[5]+cW[6]+cW[7], colSpan:3}),
    mkCell(hPara('Deviasi\nProgress'), {...hS(), w:cW[8], rowSpan:3}),
    mkCell(hPara('Keterangan'),        {...hS(), w:cW[9], rowSpan:3}),
  ]})

  const hRow2 = new TableRow({ tableHeader:true, children:[
    mkCell(hPara('Progres Kumulatif\ns/d Minggu lalu'), {...hS(), w:cW[5]}),
    mkCell(hPara('Progres\nMinggu ini'),                {...hS(), w:cW[6]}),
    mkCell(hPara('Progres Kumulatif\ns/d Minggu ini'),  {...hS(), w:cW[7]}),
  ]})

  const hRow3 = new TableRow({ tableHeader:true, children:[
    mkCell(hPara('6'),      {...hS(), w:cW[5]}),
    mkCell(hPara('7'),      {...hS(), w:cW[6]}),
    mkCell(hPara('8=6+7'), {...hS(), w:cW[7]}),
  ]})

  // ── Data rows ─────────────────────────────────────────────────────────────
  const dataRows = progressData.map((row, i) => {
    const bg = i % 2 === 1 ? ALT_BG : 'FFFFFF'
    const dS = { bg, vAlign:VerticalAlign.TOP, borders:allBdr(3),
                 margins:{top:30,bottom:30,left:60,right:60} }
    const dp = (text, align=AlignmentType.LEFT) => para(txt(text,{sz:14}), align)
    return new TableRow({ children:[
      mkCell(dp(row.no??'',          AlignmentType.CENTER), {...dS, w:cW[0]}),
      mkCell(dp(row.col2??'',        AlignmentType.LEFT),   {...dS, w:cW[1]}),
      mkCell(dp(row.satuan??'',      AlignmentType.CENTER), {...dS, w:cW[2]}),
      mkCell(dp(row.boq??'',         AlignmentType.RIGHT),  {...dS, w:cW[3]}),
      mkCell(dp(row.bobot??'',       AlignmentType.RIGHT),  {...dS, w:cW[4]}),
      mkCell(dp(row.cumlastweek??'', AlignmentType.RIGHT),  {...dS, w:cW[5]}),
      mkCell(dp(row.thisweek??'',    AlignmentType.RIGHT),  {...dS, w:cW[6]}),
      mkCell(dp(row.cumthisweek??'', AlignmentType.RIGHT),  {...dS, w:cW[7]}),
      mkCell(dp(''), {...dS, w:cW[8]}),
      mkCell(dp(''), {...dS, w:cW[9]}),
    ]})
  })

  // Total Upah Kerja
  const tuS = { bg:LGRAY, vAlign:VerticalAlign.CENTER, borders:allBdr(5),
                margins:{top:40,bottom:40,left:60,right:60} }
  const tuRow = new TableRow({ children:[
    mkCell(para(txt('',{bold:true,sz:14})),                                   {...tuS,w:cW[0]}),
    mkCell(para(txt('Total Upah Kerja',{bold:true,sz:14}),AlignmentType.RIGHT),{...tuS,w:cW[1]}),
    mkCell(para(txt('',{bold:true,sz:14})),                                   {...tuS,w:cW[2]}),
    mkCell(para(txt('0',{bold:true,sz:14}),AlignmentType.RIGHT),              {...tuS,w:cW[3]}),
    ...Array(6).fill(null).map((_,i)=>mkCell(para(txt('',{sz:14})),{...tuS,w:cW[4+i]})),
  ]})

  // PROGRESS PEKERJAAN
  const ppS = { bg:DGRAY, vAlign:VerticalAlign.CENTER, borders:allBdr(8),
                margins:{top:40,bottom:40,left:60,right:60} }
  const ppRow = new TableRow({ children:[
    mkCell(para(txt('',{bold:true,sz:14})),                                            {...ppS,w:cW[0]}),
    mkCell(para(txt('PROGRESS PEKERJAAN',{bold:true,sz:14}),AlignmentType.LEFT),       {...ppS,w:cW[1]}),
    mkCell(para(txt('',{bold:true,sz:14})),                                            {...ppS,w:cW[2]}),
    mkCell(para(txt('',{bold:true,sz:14})),                                            {...ppS,w:cW[3]}),
    mkCell(para(txt(totalData.totalbobot??'',       {bold:true,sz:14}),AlignmentType.RIGHT),{...ppS,w:cW[4]}),
    mkCell(para(txt(totalData.totalcumlastweek??'', {bold:true,sz:14}),AlignmentType.RIGHT),{...ppS,w:cW[5]}),
    mkCell(para(txt(totalData.totalthisweek??'',    {bold:true,sz:14}),AlignmentType.RIGHT),{...ppS,w:cW[6]}),
    mkCell(para(txt(totalData.totalcumthisweek??'', {bold:true,sz:14}),AlignmentType.RIGHT),{...ppS,w:cW[7]}),
    mkCell(para(txt('',{bold:true,sz:14})),                                            {...ppS,w:cW[8]}),
    mkCell(para(txt('',{bold:true,sz:14})),                                            {...ppS,w:cW[9]}),
  ]})

  const mainTable = new Table({
    width: { size:CONTENT, type:WidthType.DXA },
    columnWidths: cW,
    rows: [hRow1, hRow2, hRow3, ...dataRows, tuRow, ppRow],
  })

  // ── Logo image run ────────────────────────────────────────────────────────
  let logoRun = null
  if (logo) {
    const b64   = logo.replace(/^data:image\/png;base64,/, '')
    const bin   = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i=0; i<bin.length; i++) bytes[i] = bin.charCodeAt(i)
    // ~28mm height; width = proportional
    const LH_PX = 106  // ~28mm @ 96dpi
    const LW_PX = Math.round(LH_PX * (_logoWidth / _logoHeight))
    logoRun = new ImageRun({
      type: 'png',
      data: bytes,
      transformation: { width:LW_PX, height:LH_PX },
      altText: { title:'ABJ Logo', description:'Air Bersih Jakarta', name:'abj' },
    })
  }

  // ── Header (logo | title | doc-code) as borderless 3-col table ───────────
  const noB = { top:noBdr(), bottom:noBdr(), left:noBdr(), right:noBdr() }
  const headerTable = new Table({
    width: { size:CONTENT, type:WidthType.DXA },
    columnWidths: [CONTENT-1800, 1800],
    borders: { ...noB, insideH:noBdr(), insideV:noBdr() },
    rows: [new TableRow({ children:[
      // Left: Title
      new TableCell({
        children: [para(txt(isMonthly ? 'REKAPITULASI LAPORAN BULANAN' : 'REKAPITULASI LAPORAN MINGGUAN',{bold:true,sz:26}),AlignmentType.CENTER)],
        borders: noB, shading:shade('FFFFFF'), verticalAlign:VerticalAlign.CENTER,
      }),
      // Right: Logo stacked above doc code
      new TableCell({
        children: [
          new Paragraph({
            children: logoRun?[logoRun]:[new TextRun('')],
            alignment: AlignmentType.RIGHT,
            spacing: { before:0, after:60 },
          }),
          para(txt('ABJ/CONS/FM-033 A Rev.04',{sz:14}), AlignmentType.RIGHT),
          para(txt('Tgl Berlaku : 23 Februari 2025',{sz:14}), AlignmentType.RIGHT),
        ],
        borders: noB, shading:shade('FFFFFF'), verticalAlign:VerticalAlign.TOP,
      }),
    ]})]
  })

  // ── Info block ────────────────────────────────────────────────────────────
  const infoData = [
    ['Periode',                 `${fmtDate(dateFrom)}   s/d   ${fmtDate(dateTo)}`],
    ['Nama Proyek',             projectName || ''],
    ['Kode Proyek/Program',     extraInfo?.kodeProyek || ''],
    ['Nama Sub-Proyek/Program', extraInfo?.namaSubProyek || ''],
    ['Lokasi',                  extraInfo?.lokasi || ''],
    ['Nama Kontraktor',         'PT. Bestindo Putra Mandiri'],
    ['Nomor PO',                extraInfo?.noPO || ''],
  ]
  const infoTable = new Table({
    width: { size:CONTENT, type:WidthType.DXA },
    columnWidths: [2600, 200, CONTENT-2800],
    borders: { ...noB, insideH:noBdr(), insideV:noBdr() },
    rows: infoData.map(([lbl,val]) => new TableRow({ children:[
      new TableCell({ children:[para(txt(lbl,{sz:18}))],
        borders:noB, shading:shade('FFFFFF'), margins:{top:20,bottom:20,left:0,right:0} }),
      new TableCell({ children:[para(txt(':',{sz:18}),AlignmentType.CENTER)],
        borders:noB, shading:shade('FFFFFF'), margins:{top:20,bottom:20,left:0,right:0} }),
      new TableCell({ children:[para(txt(val,{sz:18}))],
        borders:noB, shading:shade('FFFFFF'), margins:{top:20,bottom:20,left:60,right:0} }),
    ]})),
  })

  // ── Separators ────────────────────────────────────────────────────────────
  const hrDouble = () => new Paragraph({
    children: [new TextRun('')],
    border: { bottom: { style:BorderStyle.DOUBLE, size:6, color:'000000', space:1 } },
    spacing: { before:60, after:60 },
  })

  // ── Signature table ───────────────────────────────────────────────────────
  const sigW4 = Math.floor(CONTENT / 4)
  const sigData = [
    { label:'Diajukan oleh,',  org:'Kontraktor',             title:'Project Manager',  proyek:`: ${projectName||''}` },
    { label:'Diperiksa oleh,', org:'Pengawas',               title:'',                 proyek:'' },
    { label:'Diperiksa oleh,', org:'PT. Air Bersih Jakarta', title:'Project Engineer', proyek:'' },
    { label:'Disetujui oleh,', org:'PT. Air Bersih Jakarta', title:'Project Manager',  proyek:'' },
  ]
  const sigColW = [sigW4, sigW4, sigW4, CONTENT - sigW4*3]

  const sigRow1 = new TableRow({ children: sigData.map(({label,org}) =>
    new TableCell({
      children: [para(txt(label,{sz:16}),AlignmentType.CENTER), para(txt(org,{sz:16}),AlignmentType.CENTER)],
      borders:noB, shading:shade('FFFFFF'), margins:{top:40,bottom:0,left:60,right:60},
    })
  )})

  const sigRow2 = new TableRow({ children: sigData.map(({proyek}) =>
    new TableCell({
      children: [para(txt(proyek,{sz:14}))],
      borders:noB, shading:shade('FFFFFF'), margins:{top:0,bottom:0,left:60,right:60},
    })
  )})

  const sigRow3 = new TableRow({ height:{value:1200,rule:'exact'}, children: sigData.map(() =>
    new TableCell({
      children: [para(txt(''))],
      borders: { top:noBdr(), left:noBdr(), right:noBdr(), bottom:bdr(6) },
      shading:shade('FFFFFF'), margins:{top:0,bottom:0,left:120,right:120},
    })
  )})

  const sigRow4 = new TableRow({ children: sigData.map(({title}) =>
    new TableCell({
      children: [
        para(txt('Nama',{sz:16}),AlignmentType.CENTER),
        ...(title?[para(txt(title,{sz:16}),AlignmentType.CENTER)]:[]),
      ],
      borders:noB, shading:shade('FFFFFF'), margins:{top:40,bottom:40,left:60,right:60},
    })
  )})

  const sigTable = new Table({
    width: { size:CONTENT, type:WidthType.DXA },
    columnWidths: sigColW,
    rows: [sigRow1, sigRow2, sigRow3, sigRow4],
  })

  // ── Footer ────────────────────────────────────────────────────────────────
  const now = format(new Date(), 'dd/MM/yyyy HH:mm:ss')
  const docFooter = new Footer({
    children: [new Paragraph({
      children: [
        txt(`Dicetak: ${now}  |  Halaman `, {sz:12,color:'888888'}),
        new TextRun({ children:[PageNumber.CURRENT], size:12, color:'888888' }),
        txt(' dari ', {sz:12,color:'888888'}),
        new TextRun({ children:[PageNumber.TOTAL_PAGES], size:12, color:'888888' }),
      ],
    })],
  })

  // ── Assemble ──────────────────────────────────────────────────────────────
  const doc = new Document({
    styles: { default: { document: { run: { font:'Arial', size:18 } } } },
    sections: [{
      properties: {
        page: {
          size:   { width:PAGE_W, height:PAGE_H },
          margin: { top:MARGIN, right:MARGIN, bottom:MARGIN, left:MARGIN },
        },
      },
      footers: { default: docFooter },
      children: [
        headerTable,
        hrDouble(),
        infoTable,
        hrDouble(),
        mainTable,
        new Paragraph({ children:[new TextRun('')], spacing:{before:400,after:0} }),
        sigTable,
      ],
    }],
  })

  const blob = await Packer.toBlob(doc)
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${isMonthly ? 'Laporan_Bulanan' : 'Laporan_Mingguan'}_${format(new Date(),'yyyyMMdd_HHmmss')}.docx`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── PRINT ────────────────────────────────────────────────────────────────────
export const printReport = async (progressData, totalData, projectName, dateFrom, dateTo, extraInfo = {}, isMonthly = false) => {
  const logo = await loadLogo()
  const pw   = window.open('', '', 'width=900,height=1200')

  const logoHtml = logo
    ? `<img src="${logo}" alt="ABJ"/>`
    : ''

  const infoRows = [
    ['Periode',                 `${fmtDate(dateFrom)}&nbsp;&nbsp;s/d&nbsp;&nbsp;${fmtDate(dateTo)}`],
    ['Nama Proyek',             projectName||''],
    ['Kode Proyek/Program',     extraInfo?.kodeProyek||''],
    ['Nama Sub-Proyek/Program', extraInfo?.namaSubProyek||''],
    ['Lokasi',                  extraInfo?.lokasi||''],
    ['Nama Kontraktor',         'PT. Bestindo Putra Mandiri'],
    ['Nomor PO',                extraInfo?.noPO||''],
  ]

  const html = `<!DOCTYPE html><html><head>
<title>${isMonthly ? 'Rekapitulasi Laporan Bulanan' : 'Rekapitulasi Laporan Mingguan'}</title>
<style>
  @page { size:A4 portrait; margin:15mm; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:Arial,sans-serif; font-size:8pt; color:#000; }

  .hdr { display:flex; align-items:center; justify-content:space-between;
         padding-bottom:5px; border-bottom:2px solid #000; margin-bottom:1px; }
  .hdr h1   { font-size:13pt; font-weight:bold; text-align:center; flex:1; padding:0 6px; }
  .hdr-right { display:flex; flex-direction:column; align-items:flex-end; flex:0 0 auto; }
  .hdr-logo  { margin-bottom:3px; }
  .hdr-logo img { height:14mm; width:auto; display:block; }
  .doc-code  { font-size:6.5pt; text-align:right; white-space:nowrap; line-height:1.6; }
  .sep-thin { border-top:0.5px solid #000; margin-bottom:3px; }

  .info { width:100%; border-collapse:collapse; margin:2px 0 3px; }
  .info td { padding:1px 2px; font-size:8pt; white-space:nowrap; }
  .info .lbl { width:47mm; }
  .info .col { width:5mm; text-align:center; }

  .sep2 { border-top:2px solid #000; margin:2px 0 0; }
  .sep3 { border-top:0.5px solid #000; margin:0 0 3px; }

  table.main { width:100%; border-collapse:collapse; font-size:6.5pt; border:0.9px solid #000; }
  .main th, .main td { border:0.25px solid #888; padding:1.5px 2px; }
  .main th { background:#dce6f1; font-weight:bold; text-align:center;
             vertical-align:middle; font-size:6pt; line-height:1.3; }
  .main td { vertical-align:top; }
  .main th:first-child, .main td:first-child { border-left:0.9px solid #000; }
  .main th:last-child,  .main td:last-child  { border-right:0.9px solid #000; }
  .main thead tr:first-child th { border-top:0.9px solid #000; }
  .main thead tr:last-child  th { border-bottom:0.7px solid #000; }
  .main tbody tr:last-child  td { border-bottom:0.9px solid #000; }
  .main tbody tr:nth-child(even) { background:#f5f5f5; }
  .row-tu td { font-weight:bold; background:#e8e8e8 !important;
               border-top:0.7px solid #000 !important; border-bottom:0.7px solid #000 !important; }
  .row-pp td { font-weight:bold; background:#d0d0d0 !important;
               border-top:0.9px solid #000 !important; border-bottom:0.9px solid #000 !important; }

  .tc { text-align:center; } .tr { text-align:right; } .tl { text-align:left; }

  .sigs { display:flex; justify-content:space-between; margin-top:10mm; page-break-inside:avoid; }
  .sig  { flex:1; text-align:center; font-size:8pt; padding:0 3mm; }
  .sig-org    { margin-top:1px; }
  .sig-proyek { font-size:7pt; text-align:left; margin-top:4mm; min-height:10mm; padding-left:2mm; }
  .sig .ln    { border-top:0.6px solid #333; margin:18mm auto 2mm; width:90%; }
  .sig-title  { margin-top:1px; }

  .footer { margin-top:5px; font-size:6.5pt; color:#666; display:flex; justify-content:space-between; }

  @media print { body { print-color-adjust:exact; -webkit-print-color-adjust:exact; } }
</style></head><body>

<div class="hdr">
  <h1>${isMonthly ? 'REKAPITULASI LAPORAN BULANAN' : 'REKAPITULASI LAPORAN MINGGUAN'}</h1>
  <div class="hdr-right">
    <div class="hdr-logo">${logoHtml}</div>
    <div class="doc-code">ABJ/CONS/FM-033 A Rev.04<br>Tgl Berlaku : 23 Februari 2025</div>
  </div>
</div>
<div class="sep-thin"></div>

<table class="info">
${infoRows.map(([l,v])=>`<tr><td class="lbl">${l}</td><td class="col">:</td><td>${v}</td></tr>`).join('\n')}
</table>
<div class="sep2"></div><div class="sep3"></div>

<table class="main">
  <thead>
    <tr>
      <th rowspan="3" style="width:4%">No.</th>
      <th rowspan="3" style="width:26%">Uraian Pekerjaan</th>
      <th rowspan="3" style="width:7%">Satuan</th>
      <th rowspan="3" style="width:7%">Volume BOQ</th>
      <th rowspan="3" style="width:8%">Bobot Pekerjaan</th>
      <th colspan="3">Progress</th>
      <th rowspan="3" style="width:6%">Deviasi Progress</th>
      <th rowspan="3">Keterangan</th>
    </tr>
    <tr>
      <th style="width:9%">Progres Kumulatif s/d Minggu lalu</th>
      <th style="width:7%">Progres Minggu ini</th>
      <th style="width:9%">Progres Kumulatif s/d Minggu ini</th>
    </tr>
    <tr><th>6</th><th>7</th><th>8=6+7</th></tr>
  </thead>
  <tbody>
${progressData.map(r=>`    <tr>
      <td class="tc">${r.no??''}</td>
      <td class="tl">${r.col2??''}</td>
      <td class="tc">${r.satuan??''}</td>
      <td class="tr">${r.boq??''}</td>
      <td class="tr">${r.bobot??''}</td>
      <td class="tr">${r.cumlastweek??''}</td>
      <td class="tr">${r.thisweek??''}</td>
      <td class="tr">${r.cumthisweek??''}</td>
      <td></td><td></td>
    </tr>`).join('\n')}
    <tr class="row-tu">
      <td></td><td class="tl">Total Upah Kerja</td>
      <td></td><td class="tr">0</td><td colspan="6"></td>
    </tr>
    <tr class="row-pp">
      <td></td><td class="tl">PROGRESS PEKERJAAN</td><td></td><td></td>
      <td class="tr">${totalData.totalbobot??''}</td>
      <td class="tr">${totalData.totalcumlastweek??''}</td>
      <td class="tr">${totalData.totalthisweek??''}</td>
      <td class="tr">${totalData.totalcumthisweek??''}</td>
      <td></td><td></td>
    </tr>
  </tbody>
</table>

<div class="sigs">
  <div class="sig">
    <div>Diajukan oleh,</div>
    <div class="sig-org">Kontraktor</div>
    <div class="sig-proyek">: ${projectName||''}</div>
    <div class="ln"></div>
    <div>Nama</div>
    <div class="sig-title">Project Manager</div>
  </div>
  <div class="sig">
    <div>Diperiksa oleh,</div>
    <div class="sig-org">Pengawas</div>
    <div class="sig-proyek"></div>
    <div class="ln"></div>
    <div>Nama</div>
    <div class="sig-title">&nbsp;</div>
  </div>
  <div class="sig">
    <div>Diperiksa oleh,</div>
    <div class="sig-org">PT. Air Bersih Jakarta</div>
    <div class="sig-proyek"></div>
    <div class="ln"></div>
    <div>Nama</div>
    <div class="sig-title">Project Engineer</div>
  </div>
  <div class="sig">
    <div>Disetujui oleh,</div>
    <div class="sig-org">PT. Air Bersih Jakarta</div>
    <div class="sig-proyek"></div>
    <div class="ln"></div>
    <div>Nama</div>
    <div class="sig-title">Project Manager</div>
  </div>
</div>

<div class="footer">
  <span>Dicetak: ${format(new Date(),'dd/MM/yyyy HH:mm:ss')}</span>
</div>

<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),300)}<\/script>
</body></html>`

  pw.document.write(html)
  pw.document.close()
}