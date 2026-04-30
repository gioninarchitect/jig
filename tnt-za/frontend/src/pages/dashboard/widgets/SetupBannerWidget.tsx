import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useRBAC } from '../../../hooks/useRBAC';
import api from '../../../services/api';

export default function SetupBannerWidget() {
  const { hasMinLevel } = useRBAC();

  const { data: onboardingData } = useQuery({
    queryKey: ['onboarding-status'],
    queryFn: () => api.get('/onboarding/status').then(r => r.data),
    enabled: hasMinLevel(2),
  });

  if (!hasMinLevel(2) || !onboardingData || onboardingData.complete) return null;

  return (
    <Link to="/onboarding" className="block">
      <div className="bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/30 rounded-2xl p-4 sm:p-5 flex items-center gap-4 hover:border-primary transition group">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
          <Sparkles size={22} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold text-sm sm:text-base">Set up your facility</div>
          <div className="text-white/50 text-xs sm:text-sm">Configure zones, strains, equipment, and team</div>
        </div>
        <ArrowRight size={20} className="text-primary group-hover:translate-x-1 transition-transform flex-shrink-0" />
      </div>
    </Link>
  );
}
