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
        const searchTerm = filters.search.trim();
        // Strip a trailing "mm" so "2mm" → 2, "4.5mm" → 4.5
        const numStr  = searchTerm.replace(/mm$/i, '').trim();
        const num     = parseFloat(numStr);
        const isNum   = numStr !== '' && !isNaN(num) && isFinite(num);

        const textPart = `name.ilike.%${searchTerm}%,component_code.ilike.%${searchTerm}%,manufacturer_code.ilike.%${searchTerm}%`;
        const numPart  = isNum ? `,gingival_height_mm.eq.${num},platform_diameter.eq.${num}` : '';
        query = query.or(textPart + numPart);
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

// Returns distinct filter options derived from whatever is actually in the DB
// for the given category ('component' | 'screw').
export function useFilterOptions(category) {
  return useQuery({
    queryKey: ['filter-options', category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('implant_components')
        .select('system, abutment_type, platform_diameter, gingival_height_mm, material')
        .eq('is_active', true)
        .eq('category', category);
      if (error) throw error;

      const unique  = arr => [...new Set(arr.filter(Boolean))].sort();
      const uniqueN = arr => [...new Set(arr.filter(v => v != null))].sort((a, b) => a - b);

      return {
        systems:           unique(data.map(c => c.system)),
        abutmentTypes:     unique(data.map(c => c.abutment_type)),
        materials:         unique(data.map(c => c.material)),
        gingivalHeights:   uniqueN(data.map(c => c.gingival_height_mm)),
        platformDiameters: uniqueN(data.map(c => c.platform_diameter)),
      };
    },
    staleTime: 5 * 60 * 1000, // cache for 5 min
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

function invalidateAll(qc) {
  qc.invalidateQueries({ queryKey: ['components'] });
  qc.invalidateQueries({ queryKey: ['filter-options'] });
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
    onSuccess: () => invalidateAll(qc),
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
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('implant_components').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteComponents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids) => {
      const { error } = await supabase.from('implant_components').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateComponents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, updates }) => {
      const { error } = await supabase.from('implant_components').update(updates).in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc),
  });
}
