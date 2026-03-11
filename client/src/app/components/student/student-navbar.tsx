import { Bell, Briefcase, User, Phone, LogOut } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/app/components/ui/dropdown-menu";

interface StudentNavbarProps {
  onNavigate: (page: string) => void;
  userName: string;
  unreadNotifications?: number;
}

export function StudentNavbar({ onNavigate, userName, unreadNotifications = 0 }: StudentNavbarProps) {
  const navItems = [
    { id: "home", label: "Home", icon: Briefcase },
    { id: "my-companies", label: "My Companies", icon: Briefcase },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "contact", label: "Contact Us", icon: Phone }
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <Briefcase className="h-8 w-8 text-indigo-600" />
            <span className="text-xl font-bold text-gray-900">PlaceIIT</span>
            <span className="text-sm text-gray-500 hidden md:block">
              | Student Portal
            </span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isNotifications = item.id === "notifications";
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className="text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 relative"
                  onClick={() => onNavigate(item.id)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                  {isNotifications && unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-3">
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
                  <p className="text-xs text-gray-500">Student</p>
                </div>
                <DropdownMenuItem onClick={() => onNavigate("profile")}>
                  <User className="h-4 w-4 mr-2" />
                  My Profile
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Logout */}
            <Button
              variant="ghost"
              size="icon"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => onNavigate("logout")}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-200 py-2 flex overflow-x-auto space-x-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isNotifications = item.id === "notifications";
            return (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                className="text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 whitespace-nowrap relative"
                onClick={() => onNavigate(item.id)}
              >
                <Icon className="h-4 w-4 mr-1" />
                {item.label}
                {isNotifications && unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}