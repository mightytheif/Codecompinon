import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { User, Building, Heart, Bell, Loader2, AlertTriangle } from "lucide-react";
import { useFavorites } from "@/hooks/use-favorites";
import { usePropertyFeedback } from "@/hooks/use-property-feedback";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

export function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { favorites } = useFavorites();
  const { unreadFeedback, totalUnread, loading: feedbackLoading, refreshFeedback } = usePropertyFeedback();
  const isLandlord = user?.displayName?.split("|")[1] === "landlord";

  // Force refresh notifications when component mounts and every 30 seconds
  useEffect(() => {
    if (user && isLandlord) {
      // Initial refresh
      refreshFeedback();
      
      // Set up polling for real-time updates
      const interval = setInterval(() => {
        refreshFeedback();
      }, 30000); // Check every 30 seconds
      
      return () => clearInterval(interval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLandlord]);

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <img
              src="/assets/SAKANY_LOGO.svg"
              alt="SAKANY Logo"
              className="h-10 w-auto"
              onError={(e) => {
                e.currentTarget.src = "/assets/fallback-logo.svg";
                console.error("Error loading logo image");
              }}
            />
          </div>
        </Link>

        <NavigationMenu>
          <NavigationMenuList>
            {user && (
              <>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link href="/search" className={navigationMenuTriggerStyle()}>
                      Search
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link href="/lifestyle" className={navigationMenuTriggerStyle()}>
                      Lifestyle Match
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                {isAdmin && (
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Link href="/admin/dashboard" className={navigationMenuTriggerStyle()}>
                        Admin Dashboard
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                )}
              </>
            )}
            {user && (
              <>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link href="/messages" className={navigationMenuTriggerStyle()}>
                      Messages
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link href="/favorites" className={navigationMenuTriggerStyle()}>
                      <div className="flex items-center gap-1">
                        Favorites
                        {favorites.length > 0 && (
                          <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium rounded-full bg-primary text-primary-foreground">
                            {favorites.length}
                          </span>
                        )}
                      </div>
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                {isLandlord && (
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Link href="/my-properties" className={navigationMenuTriggerStyle()}>
                        <div className="flex items-center gap-1">
                          Notifications
                          {totalUnread > 0 && (
                            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium rounded-full bg-primary text-primary-foreground">
                              {totalUnread}
                            </span>
                          )}
                        </div>
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                )}
              </>
            )}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="flex gap-4 items-center">
          {user ? (
            <>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled>
                    Signed in as {user.displayName?.split("|")[0]}
                    {isAdmin && " (Admin)"}
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile">Profile Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => logout()}>
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {isLandlord && (
                <div className="flex gap-2">
                  <Link href="/my-properties">
                    <Button variant="outline" className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      My Properties
                    </Button>
                  </Link>
                  <Link href="/properties/add">
                    <Button className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      List Property
                    </Button>
                  </Link>
                </div>
              )}
            </>
          ) : (
            <>
              <Link href="/auth">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/auth">
                <Button>Register</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
