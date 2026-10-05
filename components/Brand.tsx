import Link from 'next/link';
export default function Brand({href='/',compact=false,inverse=false}:{href?:string;compact?:boolean;inverse?:boolean}){
  return <Link href={href} className={`kk-brand brand ${compact?'kk-brand-compact':''} ${inverse?'kk-brand-inverse inverse':''}`} aria-label="KelasKita">
    <img className="kk-brand-mark brand-mark" src="/brand/kelaskita-mark.png" alt=""/>
    {!compact&&<span className="kk-brand-word brand-word"><b>Kelas</b><strong>Kita</strong></span>}
  </Link>
}
