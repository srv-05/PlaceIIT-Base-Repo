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
import { Search, Users, Building2, LogOut, User, Bell } from "lucide-react";
import { APCNotificationsPage } from "@/app/components/apc/apc-notifications-page";

interface APCNavbarProps {
  onNavigate?: (page: string) => void;
  userName?: string;
  isMainAdmin?: boolean;
  unreadNotifications?: number;
}

export function APCNavbar({ onNavigate, userName = "Admin", isMainAdmin, unreadNotifications = 0 }: APCNavbarProps) {
  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-8 py-3.5">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => onNavigate?.('home')}
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <span className="text-2xl font-bold text-indigo-600">PlaceIIT</span>
            <span className="text-sm text-gray-500 hidden md:block">
              | APC Portal
            </span>
          </button>
          
          <div className="flex items-center space-x-8">
            <button 
              onClick={() => onNavigate?.('home')}
              className="text-gray-500 hover:text-gray-900 transition-colors font-medium"
            >
              Home
            </button>
            
            <button 
              onClick={() => onNavigate?.('student-search')}
              className="text-gray-500 hover:text-gray-900 transition-colors font-medium"
            >
              Students
            </button>
            
            <button 
              onClick={() => onNavigate?.('manage-cocos')}
              className="text-gray-500 hover:text-gray-900 transition-colors font-medium"
            >
              CoCos
            </button>
            
            <button 
              onClick={() => onNavigate?.('manage-companies')}
              className="text-gray-500 hover:text-gray-900 transition-colors font-medium"
            >
              Companies
            </button>
            
            <button 
              onClick={() => onNavigate?.('queries')}
              className="text-gray-500 hover:text-gray-900 transition-colors font-medium"
            >
              Queries
            </button>

            {isMainAdmin && (
              <button 
                onClick={() => onNavigate?.('manage-apcs')}
                className="text-emerald-600 hover:text-emerald-700 transition-colors font-medium flex items-center gap-1"
              >
                APCs
              </button>
            )}
            
            <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-200">
              {/* Notification Bell */}
              <Sheet>
                <SheetTrigger asChild>
                  <button
                    className="h-9 w-9 rounded-full bg-indigo-50 flex items-center justify-center hover:bg-indigo-100 transition-colors cursor-pointer border-0 outline-none relative"
                  >
                    <Bell className="h-5 w-5 text-indigo-600" />
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
                      <Bell className="h-6 w-6 mr-2 text-indigo-600" />
                      Notifications
                    </SheetTitle>
                  </SheetHeader>
                  <div className="h-[calc(100vh-100px)] overflow-y-auto pl-3">
                    <APCNotificationsPage />
                  </div>
                </SheetContent>
              </Sheet>

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center hover:bg-indigo-200 transition-colors cursor-pointer border-0 outline-none">
                    <User className="h-5 w-5 text-indigo-600" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-2 border-b">
                    <p className="text-sm font-medium text-gray-900">{userName}</p>
                    <p className="text-xs text-gray-500">Administrator</p>
                  </div>
                  <DropdownMenuItem onClick={() => onNavigate?.("profile")}>
                    <User className="h-4 w-4 mr-2" />
                    My Profile
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

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
                      onClick={() => onNavigate?.("logout")}
                      className="bg-red-600 focus:ring-red-600 hover:bg-red-700"
                    >
                      Log out
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

