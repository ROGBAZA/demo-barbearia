import { Tenant } from '@/contexts/TenantContext';

declare global {
  interface Window {
    tenant?: Tenant;
  }
}

export {};
