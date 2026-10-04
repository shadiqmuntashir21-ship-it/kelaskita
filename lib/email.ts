import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

type Activation={buyerName:string;email:string;orderCode:string;code:string;pin:string;teacherName:string;schoolName:string;className:string;academicYear:string};

async function guidePdf(a:Activation){
  const pdf=await PDFDocument.create();const page=pdf.addPage([595,842]);const font=await pdf.embedFont(StandardFonts.Helvetica);const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawText('KelasKita',{x:46,y:775,size:22,font:bold,color:rgb(.06,.18,.42)});
  page.drawText('Panduan Aktivasi Lisensi',{x:46,y:744,size:16,font:bold,color:rgb(.10,.16,.25)});
  const lines=[`Halo ${a.buyerName},`,`Pembayaran pesanan ${a.orderCode} sudah dikonfirmasi.`,`Kode Lisensi: ${a.code}`,`PIN: ${a.pin}`,'','Cara masuk:','1. Buka aplikasi KelasKita.','2. Pilih Masuk.','3. Masukkan Kode Lisensi dan PIN.','4. Setelah masuk, lengkapi profil kelas dan data siswa.','','Lisensi ini ditujukan untuk ruang kerja wali kelas yang tertera pada pesanan.'];
  let y=705;for(const line of lines){page.drawText(line,{x:46,y,size:11,font:line.startsWith('Kode')||line.startsWith('PIN')?bold:font,color:rgb(.18,.22,.3),maxWidth:500});y-=24}
  return Buffer.from(await pdf.save()).toString('base64');
}

async function send(to:string,subject:string,html:string,attachments?:any[]){
  const key=process.env.RESEND_API_KEY;if(!key)return {sent:false,error:'RESEND_API_KEY belum dikonfigurasi'};
  const from=process.env.EMAIL_FROM||'KelasKita <noreply@dailyn.my.id>';
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[to],subject,html,attachments})});
  const j=await r.json().catch(()=>({}));if(!r.ok)return {sent:false,error:j.message||'Email belum berhasil dikirim'};return {sent:true,id:j.id};
}

export async function sendPaymentReceivedEmail(order:any){
  return send(order.email,`Konfirmasi Pembayaran KelasKita · ${order.order_code}`,
  `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#182230;max-width:640px"><h2 style="color:#0F2D6B">Konfirmasi pembayaran telah kami terima</h2><p>Halo ${order.buyer_name}, klaim pembayaran untuk pesanan <b>${order.order_code}</b> sudah masuk dan sedang diperiksa.</p><p>Total: <b>${new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(order.amount)||99000)}</b><br>Metode: <b>${order.payment_method_snapshot?.label||'-'}</b></p><p>Setelah pembayaran dikonfirmasi oleh admin, kode lisensi dan PIN KelasKita akan dikirim otomatis ke email ini.</p><p style="color:#667085;font-size:13px">Simpan Order ID sampai akses KelasKita diterima.</p></div>`);
}

export async function notifyOwnerPaymentClaim(order:any){
  const to=process.env.OWNER_NOTIFICATION_EMAIL;if(!to)return {sent:false,error:'OWNER_NOTIFICATION_EMAIL belum dikonfigurasi'};
  return send(to,`KelasKita · Pembayaran perlu diverifikasi · ${order.order_code}`,
  `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#182230"><h2 style="color:#0F2D6B">Pembayaran KelasKita perlu diverifikasi</h2><p><b>${order.buyer_name}</b> telah menekan tombol <b>Saya Sudah Membayar</b>.</p><p>Order: <b>${order.order_code}</b><br>Total: <b>${new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(order.amount)||99000)}</b><br>Metode: <b>${order.payment_method_snapshot?.label||'-'}</b></p><p>Buka Panel Pemilik KelasKita untuk memeriksa mutasi dan mengonfirmasi pembayaran.</p></div>`);
}

export async function sendActivationEmail(a:Activation){
  const pdf=await guidePdf(a);
  return send(a.email,`Akses KelasKita — Lisensi ${a.code}`,
  `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#182230;max-width:640px"><h2 style="color:#0F2D6B">Pembayaran berhasil dikonfirmasi</h2><p>Halo ${a.buyerName}, terima kasih telah memilih <b>KelasKita</b>.</p><p>Pembayaran untuk pesanan <b>${a.orderCode}</b> telah kami terima dan dikonfirmasi.</p><div style="padding:18px;border-radius:14px;background:#F2F6FF"><div style="font-size:13px;color:#667085">Kode Lisensi</div><div style="font-size:22px;font-weight:700;color:#0F2D6B">${a.code}</div><div style="margin-top:12px;font-size:13px;color:#667085">PIN</div><div style="font-size:22px;font-weight:700;color:#2F7BFF">${a.pin}</div></div><p>Masuk melalui halaman <b>Masuk</b> di KelasKita menggunakan kode dan PIN tersebut. Panduan aktivasi terlampir pada email ini.</p><p style="color:#667085;font-size:13px">Jangan membagikan PIN kepada pihak yang tidak berwenang.</p></div>`,[{filename:'Panduan-Aktivasi-KelasKita.pdf',content:pdf}]);
}
