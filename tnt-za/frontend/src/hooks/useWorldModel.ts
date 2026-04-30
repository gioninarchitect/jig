import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export function useWorldState() {
  return useQuery({
    queryKey: ['world-model', 'state'],
    queryFn: () => api.get('/world-model/state').then(r => r.data.state),
    refetchInterval: 30_000,
  });
}

export function useRiskScores() {
  return useQuery({
    queryKey: ['world-model', 'risk'],
    queryFn: () => api.get('/world-model/risk').then(r => r.data.risk),
  });
}

export function useInferences() {
  return useQuery({
    queryKey: ['world-model', 'inferences'],
    queryFn: () => api.get('/world-model/inferences').then(r => r.data.alerts),
  });
}
