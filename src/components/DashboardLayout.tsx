// src/components/DashboardLayout.tsx
import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { 
  BarChart3, 
  FileText, 
  Settings, 
  LogOut, 
  User,
  ChevronRight 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user] = useState({ 
    name: "John Doe", 
    email: "john@example.com",
    avatar: "" 
  });

  const handleSignOut = () => {
    // Clear authentication state (implement your logout logic here)
    localStorage.removeItem('authToken');
    navigate('/auth');
  };

  const menuItems = [
    {
      title: "Usage",
      icon: BarChart3,
      path: "/dashboard/usage",
      description: "View your transcription usage and analytics"
    },
    {
      title: "Saved Files",
      icon: FileText,
      path: "/dashboard/files",
      description: "Access your saved transcriptions"
    },
    {
      title: "Settings",
      icon: Settings,
      path: "/dashboard/settings",
      description: "Manage your account and preferences"
    }
  ];

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar className="border-r">
          <SidebarContent>
            {/* Logo Section */}
            <div className="flex items-center gap-3 px-6 py-4 border-b">
              <img 
                src="/src/assets/logo.png" 
                alt="CantoneseScribe" 
                className="w-8 h-8 object-contain"
              />
              <div className="text-lg font-medium text-gray-900 uppercase tracking-wide">
                CantoneseScribe
              </div>
            </div>

            {/* Navigation Menu */}
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        onClick={() => navigate(item.path)}
                        isActive={location.pathname === item.path}
                        className="w-full justify-start"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        {location.pathname === item.path && (
                          <ChevronRight className="ml-auto h-4 w-4" />
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* User Profile Section */}
            <div className="mt-auto border-t p-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start h-auto p-2">
                    <Avatar className="h-8 w-8 mr-3">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start text-sm">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-muted-foreground text-xs">{user.email}</span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SidebarContent>
        </Sidebar>

        <SidebarInset className="flex flex-col flex-1">
          {/* Top Header */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Dashboard</span>
              {location.pathname !== '/dashboard' && (
                <>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-muted-foreground">
                    {menuItems.find(item => item.path === location.pathname)?.title || 
                     location.pathname.split('/').pop()}
                  </span>
                </>
              )}
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;