import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useComponents(filters = {}) {
  return useQuery({
    queryKey: ['components', filters],
    queryFn: async () => {
      let query = supabase
        .from('implant_components')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,component_code.ilike.%${filters.search}%,manufacturer_code.ilike.%${filters.search}%`
        );
      }
      if (filters.systems?.length) {
        query = query.in('system', filters.systems);
      }
      if (filters.abutmentTypes?.length) {
        query = query.in('abutment_type', filters.abutmentTypes);
      }
      if (filters.materials?.length) {
        query = query.in('material', filters.materials);
      }
      if (filters.gingivalHeights?.length) {
        query = query.in('gingival_height_mm', filters.gingivalHeights);
      }
      if (filters.platformDiameters?.length) {
        query = query.in('platform_diameter', filters.platformDiameters);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useAllComponents() {
  return useQuery({
    queryKey: ['components', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('implant_components')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useComponent(id) {
  return useQuery({
    queryKey: ['component', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('implant_components')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (component) => {
      const { data, error } = await supabase
        .from('implant_components')
        .insert(component)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['components'] }),
  });
}

export function useUpdateComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('implant_components')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['components'] }),
  });
}

export function useDeleteComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('implant_components').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['components'] }),
  });
}
