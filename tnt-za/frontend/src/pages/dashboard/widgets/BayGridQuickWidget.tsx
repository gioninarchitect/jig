import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Grid3X3, ArrowRight } from 'lucide-react';
import api from '../../../services/api';

const STRAIN_COLORS: Record<string, string> = {
  'Durban Poison': 'bg-green-500', 'Swazi Gold': 'bg-yellow-500', 'Malawi Gold': 'bg-purple-500',
  'Power Plant': 'bg-red-500', 'Rooibaard': 'bg-orange-500', 'Northern Lights': 'bg-blue-500',
};

export default function BayGridQuickWidget() {
  const { data: greenhouses } = useQuery({
    queryKey: ['greenhouses'],
    queryFn: () => api.get('/baygrid/greenhouses').then(r => r.data.greenhouses),
  });

  if (!greenhouses?.length) {
    return (
      <Link to="/baygrid" className="block bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5 hover:border-primary/30 transition group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Grid3X3 size={20} className="text-primary" />
            <div>
              <h2 className="text-sm font-semibold text-white">BayGrid</h2>
              <p className="text-xs text-white/40">Set up your first greenhouse</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-primary group-hover:translate-x-1 transition-transform" />
        </div>
      </Link>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Grid3X3 size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-white/60">BayGrid</h2>
        </div>
        <Link to="/baygrid" className="text-xs text-primary flex items-center gap-1 hover:text-primary-light">
          View All <ArrowRight size={12} />
        </Link>
      </div>

      <div className="space-y-3">
        {greenhouses.map((gh: any) => {
          const activeBays = gh.bays?.filter((b: any) => b.status !== 'EMPTY') || [];
          const totalBays = gh.bays?.length || 0;
          const harvestReady = gh.bays?.filter((b: any) => b.status === 'HARVESTING') || [];

          return (
            <div key={gh.id}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-white">{gh.name}</span>
                <span className="text-xs text-white/40">{activeBays.length}/{totalBays} bays</span>
              </div>
              {/* Mini bay grid */}
              <div className="flex gap-1">
                {gh.bays?.slice(0, 12).map((bay: any) => {
                  const isEmpty = bay.status === 'EMPTY';
                  const color = bay.currentStrain ? (STRAIN_COLORS[bay.currentStrain] || 'bg-white/30') : '';
                  return (
                    <div key={bay.id}
                      className={`h-6 flex-1 rounded ${isEmpty ? 'border border-dashed border-white/10' : color} ${bay.status === 'HARVESTING' ? 'animate-pulse' : ''}`}
                      title={isEmpty ? 'Empty' : `${bay.name}: ${bay.currentStrain}`} />
                  );
                })}
              </div>
              {harvestReady.length > 0 && (
                <p className="text-xs text-amber-400 mt-1">{harvestReady.length} bay{harvestReady.length > 1 ? 's' : ''} harvest ready</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
