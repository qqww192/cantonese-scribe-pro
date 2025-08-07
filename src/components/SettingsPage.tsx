import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  VideoIcon, 
  Bell, 
  FileText,
  Trash2,
  Lock,
  Eye,
  EyeOff
} from "lucide-react";

const SettingsPage = () => {
  const navigate = useNavigate();
  
  const [userInfo, setUserInfo] = useState({
    name: "John Doe",
    email: "john@example.com",
    plan: "Learner Pro",
    videosProcessed: 8,
    totalMinutes: 127,
    nextBilling: "2024-02-15"
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const [notifications, setNotifications] = useState({
    emailUpdates: true,
    processingComplete: true,
    lowTranscriptionTime: true
  });

  const [exportSettings, setExportSettings] = useState({
    defaultFormat: "SRT",
    includeTimestamps: true,
    includeConfidence: false
  });

  const handleSaveAccount = () => {
    alert("Account information saved successfully!");
  };

  const handlePasswordChange = () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      alert("Please fill in all password fields.");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("New passwords do not match.");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      alert("Password must be at least 8 characters long.");
      return;
    }

    alert("Password changed successfully!");
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  const handleSaveNotifications = () => {
    alert("Notification preferences saved successfully!");
  };

  const handleSaveExportSettings = () => {
    alert("Export preferences saved successfully!");
  };

  const handleDeleteAccount = () => {
    const confirmed = confirm("Are you sure you want to delete your account? This action cannot be undone.");
    if (confirmed) {
      alert("Account deletion requested. You will receive an email confirmation.");
    }
  };

  const togglePasswordVisibility = (field: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field as keyof typeof prev]
    }));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">
            Manage your account and preferences
          </p>
        </div>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
            <CardDescription>
              Update your personal information and account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={userInfo.name}
                  onChange={(e) => setUserInfo(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={userInfo.email}
                  onChange={(e) => setUserInfo(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
            </div>
            <div className="pt-2">
              <Button onClick={handleSaveAccount} className="bg-blue-600 hover:bg-blue-700 text-white">
                Save Account Information
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your account password for security
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPasswords.current ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Enter your current password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility('current')}
                >
                  {showPasswords.current ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Enter new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => togglePasswordVisibility('new')}
                  >
                    {showPasswords.new ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => togglePasswordVisibility('confirm')}
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Password Requirements:</strong>
              </p>
              <ul className="text-sm text-blue-700 mt-1 list-disc list-inside">
                <li>At least 8 characters long</li>
                <li>Mix of uppercase and lowercase letters recommended</li>
                <li>Include numbers and special characters for better security</li>
              </ul>
            </div>
            
            <Button onClick={handlePasswordChange} className="bg-blue-600 hover:bg-blue-700 text-white">
              Change Password
            </Button>
          </CardContent>
        </Card>

        {/* Subscription & Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <VideoIcon className="h-5 w-5" />
              Subscription & Usage
            </CardTitle>
            <CardDescription>
              View your subscription and transcription usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">Current Plan</div>
                  <div className="text-sm text-gray-600">Active subscription</div>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {userInfo.plan}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{userInfo.videosProcessed}</div>
                  <div className="text-sm text-gray-600">Videos Processed</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{userInfo.totalMinutes}m</div>
                  <div className="text-sm text-gray-600">Minutes Used</div>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg bg-blue-50">
                <div className="text-sm font-medium text-blue-900 mb-1">Next Billing Date</div>
                <div className="text-sm text-blue-700">{userInfo.nextBilling}</div>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/pricing')}
                >
                  Change Plan
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/pricing')}
                >
                  Buy More Time
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Choose what notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Email Updates</div>
                  <div className="text-sm text-gray-600">Receive product updates and news</div>
                </div>
                <Button
                  variant={notifications.emailUpdates ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNotifications(prev => ({ ...prev, emailUpdates: !prev.emailUpdates }))}
                >
                  {notifications.emailUpdates ? "On" : "Off"}
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Processing Complete</div>
                  <div className="text-sm text-gray-600">Get notified when video transcription is finished</div>
                </div>
                <Button
                  variant={notifications.processingComplete ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNotifications(prev => ({ ...prev, processingComplete: !prev.processingComplete }))}
                >
                  {notifications.processingComplete ? "On" : "Off"}
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Low Transcription Time Warning</div>
                  <div className="text-sm text-gray-600">Alert when available transcription time is running low</div>
                </div>
                <Button
                  variant={notifications.lowTranscriptionTime ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNotifications(prev => ({ ...prev, lowTranscriptionTime: !prev.lowTranscriptionTime }))}
                >
                  {notifications.lowTranscriptionTime ? "On" : "Off"}
                </Button>
              </div>
            </div>
            
            <div className="pt-2">
              <Button onClick={handleSaveNotifications} className="bg-blue-600 hover:bg-blue-700 text-white">
                Save Notification Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Export Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Export Preferences
            </CardTitle>
            <CardDescription>
              Configure your default export format and options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="format">Default Export Format</Label>
              <select
                id="format"
                className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={exportSettings.defaultFormat}
                onChange={(e) => setExportSettings(prev => ({ ...prev, defaultFormat: e.target.value }))}
              >
                <option value="SRT">SRT (SubRip)</option>
                <option value="VTT">VTT (WebVTT)</option>
                <option value="TXT">TXT (Plain Text)</option>
                <option value="CSV">CSV (Spreadsheet)</option>
              </select>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Include Timestamps</div>
                  <div className="text-sm text-gray-600">Add timing information to exported files</div>
                </div>
                <Button
                  variant={exportSettings.includeTimestamps ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExportSettings(prev => ({ ...prev, includeTimestamps: !prev.includeTimestamps }))}
                >
                  {exportSettings.includeTimestamps ? "On" : "Off"}
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Include Confidence Scores</div>
                  <div className="text-sm text-gray-600">Show accuracy ratings in exported transcriptions</div>
                </div>
                <Button
                  variant={exportSettings.includeConfidence ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExportSettings(prev => ({ ...prev, includeConfidence: !prev.includeConfidence }))}
                >
                  {exportSettings.includeConfidence ? "On" : "Off"}
                </Button>
              </div>
            </div>
            
            <div className="pt-2">
              <Button onClick={handleSaveExportSettings} className="bg-blue-600 hover:bg-blue-700 text-white">
                Save Export Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions for your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                <div className="font-medium text-red-800 mb-2">Delete Account</div>
                <div className="text-sm text-red-700 mb-3">
                  Permanently delete your account and all transcription data. This action cannot be undone.
                </div>
                <Button variant="destructive" onClick={handleDeleteAccount}>
                  Delete Account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;