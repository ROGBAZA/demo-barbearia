import { useTenant } from "@/contexts/TenantContext";
import { useFuncionarios } from "@/hooks/useDatabase";

export type PlanType = 'free' | 'plus' | 'elite' | 'default' | 'trialing';

export function usePlanLimits() {
    const { tenant } = useTenant();
    const { data: funcionarios } = useFuncionarios();

    // Verificação de Trial
    const isTrialExpired = tenant?.trial_ends_at
        ? new Date() > new Date(tenant.trial_ends_at)
        : false;

    const subscriptionStatus = tenant?.subscription_status || 'trialing';
    const isActive = subscriptionStatus === 'active' || (!isTrialExpired && subscriptionStatus === 'trialing');

    const checkEmployeeLimit = () => {
        // Apenas barbeiros contam para o limite do plano.
        // Gerentes, Recepcionistas e Admins são ilimitados.
        const barbeirosCount = funcionarios?.filter(f => f.cargo === 'barbeiro').length || 0;
        const max = tenant?.max_employees || 2;

        return {
            reached: barbeirosCount >= max,
            current: barbeirosCount,
            max: max,
            isActive
        };
    };

    return {
        planName: (tenant?.plano || 'FREE').toUpperCase(),
        isTrialExpired,
        subscriptionStatus,
        isActive,
        checkEmployeeLimit,
        trialEndsAt: tenant?.trial_ends_at
    };
}
