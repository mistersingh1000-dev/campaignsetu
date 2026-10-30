import { plans } from "./site";
import { crmOffers } from "./crm-plans";
export const purchasablePlans = [...plans,...crmOffers];
const legacyMonths:Record<string,number>={monthly:1,quarterly:3,halfyear:6,yearly:12,"3year":36,"5year":60,"10year":120,lifetime:1200};
export function planMonths(id:string){return crmOffers.find(p=>p.id===id)?.months || legacyMonths[id] || 0;}
