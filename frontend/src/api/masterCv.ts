import { apiGet, apiPut } from './client';
import type { MasterCv } from '../types/masterCv';

export function getMasterCv(): Promise<MasterCv> {
  return apiGet<MasterCv>('/api/master-cv');
}

export function saveMasterCv(masterCv: MasterCv): Promise<MasterCv> {
  return apiPut<MasterCv>('/api/master-cv', masterCv);
}
