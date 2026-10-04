import { getOwnerSession } from '@/lib/auth';
import OwnerLogin from '@/components/OwnerLogin';
import OwnerPanel from '@/components/OwnerPanel';
export default async function Pemilik(){return await getOwnerSession()?<OwnerPanel/>:<OwnerLogin/>}
