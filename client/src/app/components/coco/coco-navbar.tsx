import { Building2, User, LogOut, Briefcase, Users, Bell } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/app/components/ui/sheet";
import { CoCoNotificationsPage } from "./coco-notifications-page";

interface CoCoNavbarProps {
  onNavigate: (page: string) => void;
  userName: string;
  unreadNotifications?: number;
}

export function CoCoNavbar({ onNavigate, userName, unreadNotifications = 0 }: CoCoNavbarProps) {
  const navItems = [
    { id: "home", label: "Home", icon: Building2 },
    { id: "my-companies", label: "My Companies", icon: Briefcase },
    { id: "student-search", label: "Students", icon: Users }
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <Building2 className="h-8 w-8 text-green-600" />
            <span className="text-xl font-bold text-gray-900">PlaceIIT</span>
            <span className="text-sm text-gray-500 hidden md:block">
              | CoCo Portal
            </span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className="text-gray-700 hover:text-green-600 hover:bg-green-50"
                  onClick={() => onNavigate(item.id)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              );
            })}
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-3">
            {/* Notification Bell */}
            <Sheet>
              <SheetTrigger asChild>
                <button
                  className="h-9 w-9 rounded-full bg-green-50 flex items-center justify-center hover:bg-green-100 transition-colors cursor-pointer border-0 outline-none relative"
                >
                  <Bell className="h-5 w-5 text-green-600" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-sm border-2 border-white animate-slow-pulse-red">
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </span>
                  )}
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[400px] sm:w-[500px]">
                <SheetHeader className="mb-4 text-left">
                  <SheetTitle className="text-2xl font-bold flex items-center">
                    <Bell className="h-6 w-6 mr-2 text-green-600" />
                    Notifications
                  </SheetTitle>
                </SheetHeader>
                <div className="h-[calc(100vh-100px)] overflow-y-auto pl-3">
                  <CoCoNotificationsPage />
                </div>
              </SheetContent>
            </Sheet>

            <button
              className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center hover:bg-green-200 transition-colors cursor-pointer border-0 outline-none"
              onClick={() => onNavigate("profile")}
              title={`${userName} - My Profile`}
            >
              <User className="h-5 w-5 text-green-600" />
            </button>

            {/* Logout */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will end your current session and return you to the login screen.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => onNavigate("logout")}
                    className="bg-red-600 focus:ring-red-600 hover:bg-red-700"
                  >
                    Log out
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-200 py-2 flex overflow-x-auto space-x-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                className="text-gray-700 hover:text-green-600 hover:bg-green-50 whitespace-nowrap"
                onClick={() => onNavigate(item.id)}
              >
                <Icon className="h-4 w-4 mr-1" />
                {item.label}
              </Button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
