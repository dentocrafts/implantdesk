import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, RefreshCw, Package } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/common/EmptyState';
import { useOrders } from '@/hooks/useOrders';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';

const STATUS_VARIANTS = {
  pending: 'warning',
  confirmed: 'info',
  shipped: 'default',
  delivered: 'success',
};

const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
};

function OrderRow({ order }) {
  const [expanded, setExpanded] = useState(false);
  const { reorderItems } = useCart();
  const navigate = useNavigate();

  function handleReorder() {
    reorderItems(order.order_items || []);
    toast.success('Items added to cart');
    navigate('/cart');
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          {expanded
            ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          }
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                #{order.id.slice(0, 8).toUpperCase()}
              </span>
              <Badge variant={STATUS_VARIANTS[order.status] || 'secondary'} className="text-xs">
                {STATUS_LABELS[order.status] || order.status}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {format(new Date(order.created_at), 'dd MMM yyyy, h:mm a')}
              {' · '}
              {order.order_items?.length || 0} item{order.order_items?.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <span className="font-bold text-primary shrink-0 ml-3">{formatCurrency(order.total_amount)}</span>
      </button>

      {/* Expanded items */}
      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          {order.notes && (
            <p className="text-xs text-muted-foreground italic bg-muted/50 rounded px-3 py-2">
              Note: {order.notes}
            </p>
          )}

          <div className="space-y-2">
            {order.order_items?.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <span className="font-medium">{item.quantity}×</span>
                  {' '}
                  <span className="text-muted-foreground truncate">
                    {item.implant_components?.name || 'Unknown component'}
                  </span>
                  {item.implant_components && (
                    <span className="text-xs text-muted-foreground ml-2 font-mono">
                      {item.implant_components.component_code}
                    </span>
                  )}
                </div>
                <span className="shrink-0 font-medium">{formatCurrency(item.unit_price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReorder}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reorder
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Orders() {
  const { data: orders, isLoading } = useOrders();

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <h2 className="text-xl font-bold mb-6">Order History</h2>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4">
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        ) : orders?.length ? (
          <div className="space-y-3">
            {orders.map(order => (
              <OrderRow key={order.id} order={order} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Package}
            title="No orders yet"
            description="Once you place an order, it will appear here."
          />
        )}
      </div>
    </Layout>
  );
}
