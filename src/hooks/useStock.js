import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function useStockMovements(componentId) {
  return useQuery({
    queryKey: ['stock_movements', componentId],
    queryFn: async () => {
      let query = supabase
        .from('stock_movements')
        .select('*, implant_components(name, component_code, system, category)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (componentId) query = query.eq('component_id', componentId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useAllStockMovements() {
  return useQuery({
    queryKey: ['stock_movements', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*, implant_components(name, component_code, system, category)')
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) throw error;
      return data;
    },
  });
}

export function useLogBatchStockMovements() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ components, type, quantity }) => {
      const rows = components.map(c => ({
        component_id: c.id,
        type,
        quantity,
        notes: null,
        created_by: user.id,
      }));
      const { error: moveError } = await supabase.from('stock_movements').insert(rows);
      if (moveError) throw moveError;
      if (type !== 'received') {
        const delta = type === 'out' ? -quantity : quantity;
        await Promise.all(components.map(c =>
          supabase
            .from('implant_components')
            .update({ stock_qty: Math.max(0, c.stock_qty + delta) })
            .eq('id', c.id)
        ));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock_movements'] });
      qc.invalidateQueries({ queryKey: ['components'] });
    },
  });
}

/**
 * Batch-dispatches items from the dispatch slip.
 * Each item may have its own qty; stock is reduced per item.
 */
export function useDispatchStock() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ items, caseId, doctorName, patientName, notes: dispatchNotes }) => {
      const noteText = [
        caseId      && `Case: ${caseId}`,
        doctorName  && `Dr: ${doctorName.trim()}`,
        patientName && `Patient: ${patientName.trim()}`,
        dispatchNotes && dispatchNotes.trim(),
      ].filter(Boolean).join(' · ') || 'Dispatched via slip';

      const movementRows = items.map(item => ({
        component_id: item.id,
        type:         'out',
        quantity:     item.qty,
        notes:        noteText,
        stock_type:   item.stock_type || 'sale',
        created_by:   user.id,
      }));

      const { error: moveErr } = await supabase.from('stock_movements').insert(movementRows);
      if (moveErr) throw moveErr;

      await Promise.all(items.map(item =>
        supabase
          .from('implant_components')
          .update({ stock_qty: Math.max(0, (item.stock_qty ?? 0) - item.qty) })
          .eq('id', item.id)
      ));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock_movements'] });
      qc.invalidateQueries({ queryKey: ['components'] });
    },
  });
}

export function useLogStockMovement() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ component_id, type, quantity, notes, current_stock }) => {
      const { error: moveError } = await supabase
        .from('stock_movements')
        .insert({ component_id, type, quantity, notes, created_by: user.id });
      if (moveError) throw moveError;

      // out      = outward (sent to doctor)   → decreases stock
      // in       = inward (returned by doctor) → increases stock
      // received = order log only             → does NOT touch stock_qty
      if (type !== 'received') {
        const delta = type === 'out' ? -quantity : quantity;
        const new_stock = Math.max(0, current_stock + delta);
        const { error: updateError } = await supabase
          .from('implant_components')
          .update({ stock_qty: new_stock })
          .eq('id', component_id);
        if (updateError) throw updateError;
        return { new_stock };
      }

      return { new_stock: current_stock };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock_movements'] });
      qc.invalidateQueries({ queryKey: ['components'] });
    },
  });
}
