import { Button } from "@/app/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/app/components/ui/dropdown-menu";
import { Search, Users, Building2, LogOut, User } from "lucide-react";

interface APCNavbarProps {
  onNavigate?: (page: string) => void;
  userName?: string;
}

export function APCNavbar({ onNavigate, userName = "Admin" }: APCNavbarProps) {
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
            
            <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-200">
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
              <Button
                variant="ghost"
                size="icon"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => onNavigate?.("logout")}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
