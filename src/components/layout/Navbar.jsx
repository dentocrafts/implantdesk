import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Package, Settings, LogOut, ChevronDown, Stethoscope } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDispatchNote } from '@/context/DispatchContext';
import { useSettings } from '@/context/SettingsContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const { user, profile, signOut, isAdmin } = useAuth();
  const { totalItems } = useDispatchNote();
  const { settings } = useSettings();
  const { canManageComponents } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();

  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'DR';

  // #3 reordered: Catalog | Dispatch | Stock | History | Admin
  const navLinks = [
    { to: '/catalog',  label: 'Catalog'  },
    { to: '/slip',     label: 'Dispatch' },
    { to: '/stock',    label: 'Stock'    },
    { to: '/history',  label: 'History'  },
    { to: '/admin',    label: (isAdmin || canManageComponents) ? 'Admin' : 'Settings' },
  ];

  // #4 exact-match active so /slip highlights Dispatch correctly
  function isActive(to) {
    return location.pathname === to || location.pathname.startsWith(to + '/');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur-sm shadow-sm print:hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/catalog" className="flex items-center gap-2 shrink-0">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={settings.labName}
                className="h-8 w-8 rounded-md object-contain"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
                <Stethoscope className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
            <span className="font-semibold text-foreground tracking-tight">{settings.labName}</span>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  'relative px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  isActive(link.to)
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                )}
              >
                {link.label}
                {link.to === '/slip' && totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2 h-9">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm text-muted-foreground max-w-[120px] truncate">
                    {profile?.full_name || user?.email}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>
                  <div className="font-medium">{profile?.full_name || 'User'}</div>
                  <div className="text-xs text-muted-foreground font-normal">{profile?.clinic_name}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/stock')}>
                  <Package className="h-4 w-4 mr-2" />
                  Stock Management
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/admin?tab=settings')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
