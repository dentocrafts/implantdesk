import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, ShoppingCart, ArrowRight, CheckCircle } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import DentalPlaceholder from '@/components/common/DentalPlaceholder';
import EmptyState from '@/components/common/EmptyState';
import { useCart } from '@/context/CartContext';
import { usePlaceOrder } from '@/hooks/useOrders';
import { formatCurrency, getStockStatus } from '@/lib/utils';
import { toast } from 'sonner';

function CartItemRow({ item, onUpdateQty, onRemove }) {
  const { component, quantity } = item;
  const stock = getStockStatus(component.stock_qty);

  return (
    <div className="flex gap-3 py-4 border-b border-border last:border-0">
      {/* Image */}
      <div className="h-16 w-16 shrink-0 rounded-md overflow-hidden bg-muted">
        {component.image_url
          ? <img src={component.image_url} alt={component.name} className="h-full w-full object-cover" />
          : <DentalPlaceholder />
        }
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="font-medium text-sm leading-tight truncate">{component.name}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {component.system} · {component.abutment_type} · GH {component.gingival_height_mm}mm
            </p>
            <p className="font-mono text-xs text-muted-foreground mt-0.5">{component.component_code}</p>
          </div>
          <button
            onClick={() => onRemove(component.id)}
            className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between mt-2">
          {/* Qty controls */}
          <div className="flex items-center rounded-md border border-border overflow-hidden">
            <button
              onClick={() => onUpdateQty(component.id, quantity - 1)}
              className="px-2.5 py-1 text-sm hover:bg-accent transition-colors"
            >
              −
            </button>
            <span className="px-3 py-1 text-sm font-medium min-w-[3ch] text-center">{quantity}</span>
            <button
              onClick={() => onUpdateQty(component.id, quantity + 1)}
              className="px-2.5 py-1 text-sm hover:bg-accent transition-colors"
            >
              +
            </button>
          </div>

          {/* Subtotal */}
          <span className="font-semibold text-primary text-sm">
            {formatCurrency(component.price * quantity)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Cart() {
  const { items, removeItem, updateQuantity, clearCart, totalAmount } = useCart();
  const placeOrder = usePlaceOrder();
  const navigate = useNavigate();
  const [notes, setNotes] = useState('');
  const [orderId, setOrderId] = useState(null);

  if (orderId) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Order Placed!</h2>
          <p className="text-muted-foreground mb-1">Your order has been received.</p>
          <p className="font-mono text-sm text-muted-foreground mb-6">
            Order ID: {orderId.slice(0, 8).toUpperCase()}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/catalog')}>
              Continue Shopping
            </Button>
            <Button onClick={() => navigate('/orders')}>
              View Orders
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!items.length) {
    return (
      <Layout>
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          description="Browse the catalog and add implant components to your cart."
          action={
            <Button onClick={() => navigate('/catalog')}>
              Browse Catalog
            </Button>
          }
        />
      </Layout>
    );
  }

  async function handlePlaceOrder() {
    try {
      const order = await placeOrder.mutateAsync({
        items,
        notes,
        totalAmount,
      });
      clearCart();
      setOrderId(order.id);
    } catch (err) {
      toast.error('Failed to place order: ' + err.message);
    }
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <h2 className="text-xl font-bold mb-6">Your Cart</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items */}
          <div className="lg:col-span-2 space-y-0">
            <div className="rounded-lg border border-border bg-card px-4">
              {items.map(item => (
                <CartItemRow
                  key={item.component.id}
                  item={item}
                  onUpdateQty={updateQuantity}
                  onRemove={removeItem}
                />
              ))}
            </div>

            {/* Notes */}
            <div className="mt-4 space-y-1.5">
              <Label htmlFor="notes">Special Instructions (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any specific requirements, packaging instructions, or notes for this order…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border border-border bg-card p-4 sticky top-20">
              <h3 className="font-semibold mb-4">Order Summary</h3>

              <div className="space-y-2 mb-4">
                {items.map(item => (
                  <div key={item.component.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground truncate mr-2">
                      {item.quantity}× {item.component.name}
                    </span>
                    <span className="shrink-0">{formatCurrency(item.component.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <Separator className="my-3" />

              <div className="flex justify-between font-bold text-lg mb-4">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(totalAmount)}</span>
              </div>

              <Button
                className="w-full gap-2"
                size="lg"
                onClick={handlePlaceOrder}
                disabled={placeOrder.isPending}
              >
                {placeOrder.isPending ? 'Placing Order…' : 'Place Order'}
                {!placeOrder.isPending && <ArrowRight className="h-4 w-4" />}
              </Button>

              <button
                onClick={clearCart}
                className="w-full mt-3 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Clear cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
