import { createHash, randomBytes } from 'crypto';

export function makeOrderCode(){
  const d=new Date();
  const yy=String(d.getFullYear()).slice(-2),mm=String(d.getMonth()+1).padStart(2,'0'),dd=String(d.getDate()).padStart(2,'0');
  return `KK-${yy}${mm}${dd}-${randomBytes(3).toString('hex').toUpperCase()}`;
}
export function makeAccessToken(){return randomBytes(24).toString('base64url')}
export function hashAccessToken(token:string){return createHash('sha256').update(token).digest('hex')}
export function paymentSnapshot(row:any){return {id:row.id,type:row.type,label:row.label,account_number:row.account_number||'',account_name:row.account_name||'',instructions:row.instructions||'',qr_image_url:row.qr_image_url||''}}
