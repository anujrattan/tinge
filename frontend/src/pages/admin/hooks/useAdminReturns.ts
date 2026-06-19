import { useState, useCallback } from 'react';
import api from '../../../services/api';

export function useAdminReturns() {
  const [returns, setReturns] = useState<any[]>([]);
  const [selectedReturn, setSelectedReturn] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchReturns = useCallback(async (status?: string) => {
    setLoading(true);
    try {
      const res = await api.getAdminReturns(status || undefined);
      setReturns(res.returns || []);
    } catch (error) {
      console.error('Failed to fetch returns:', error);
      setReturns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectReturn = useCallback((row: any) => {
    setSelectedReturn(row);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedReturn(null);
  }, []);

  const updateReturnStatus = useCallback(
    async (returnId: string, payload: Parameters<typeof api.updateReturnStatus>[1]) => {
      setIsSaving(true);
      try {
        const res = await api.updateReturnStatus(returnId, payload);
        if (res.return) {
          setSelectedReturn(res.return);
          setReturns((prev) => prev.map((r) => (r.id === returnId ? res.return : r)));
        }
        return { success: true, message: res.message };
      } catch (error: any) {
        return { success: false, message: error?.message || 'Update failed' };
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  return {
    returns,
    selectedReturn,
    loading,
    isSaving,
    statusFilter,
    setStatusFilter,
    fetchReturns,
    selectReturn,
    clearSelection,
    updateReturnStatus,
  };
};
