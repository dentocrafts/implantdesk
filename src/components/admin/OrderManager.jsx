import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useAllOrders, useUpdateOrderStatus } from '@/hooks/useOrders';
import { formatCurrency, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';

const STATUS_OPTIONS = ['pending', 'confirmed', 'shipped', 'delivered'];
const STATUS_VARIANTS = {
  pending: 'warning',
  confirmed: 'info',
  shipped: 'default',
  delivered: 'success',
};

export default function OrderManager() {
  const { data: orders, isLoading } = useAllOrders();
  const updateStatus = useUpdateOrderStatus();
  const [expanded, setExpanded] = useState(new Set());

  function toggleExpand(id) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleStatusChange(orderId, status) {
    await updateStatus.mutateAsync({ id: orderId, status });
    toast.success(`Order status updated to ${status}`);
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>Order ID</TableHead>
            <TableHead className="hidden sm:table-cell">Clinic</TableHead>
            <TableHead className="hidden md:table-cell">Date</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 6 }).map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                ))}
              </TableRow>
            ))
          ) : orders?.map(order => (
            <>
              <TableRow
                key={order.id}
                className="cursor-pointer"
                onClick={() => toggleExpand(order.id)}
              >
                <TableCell>
                  {expanded.has(order.id)
                    ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  }
                </TableCell>
                <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}…</TableCell>
                <TableCell className="hidden sm:table-cell text-sm">
                  {order.profiles?.clinic_name || order.profiles?.full_name || '—'}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {format(new Date(order.created_at), 'dd MMM yyyy')}
                </TableCell>
                <TableCell className="font-medium text-primary text-sm">
                  {formatCurrency(order.total_amount)}
                </TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                  <Select
                    defaultValue={order.status}
                    onValueChange={v => handleStatusChange(order.id, v)}
                  >
                    <SelectTrigger className="h-7 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => (
                        <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>

              {/* Expanded items */}
              {expanded.has(order.id) && (
                <TableRow key={`${order.id}-items`} className="bg-muted/30 hover:bg-muted/30">
                  <TableCell colSpan={6} className="p-0">
                    <div className="px-8 py-3 space-y-1.5">
                      {order.notes && (
                        <p className="text-xs text-muted-foreground italic mb-2">Note: {order.notes}</p>
                      )}
                      {order.order_items?.map(item => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {item.quantity}× {item.implant_components?.name || 'Unknown'}
                          </span>
                          <span className="font-medium">
                            {formatCurrency(item.unit_price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>
      {!isLoading && !orders?.length && (
        <div className="py-10 text-center text-sm text-muted-foreground">No orders yet.</div>
      )}
    </div>
  );
}
