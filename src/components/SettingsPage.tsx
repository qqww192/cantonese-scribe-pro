import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  CreditCard, 
  Bell, 
  FileText,
  Trash2
} from "lucide-react";

const SettingsPage = () => {
  const [userInfo, setUserInfo] = useState({
    name: "John Doe",
    email: "john@example.com",
    plan: "Learner Pro",
    credits: 5,
    nextBilling: "2024-02-15"
  });

  const [notifications, setNotifications] = useState({
    emailUpdates: true,
    processingComplete: true,
    lowCredits: true
  });

  const [exportSettings, setExportSettings] = useState({
    defaultFormat: "SRT",
    includeTimestamps: true,
    includeConfidence: false
  });

  const handleSave = () => {
    // Save settings logic
    alert("Settings saved successfully!");
  };

  const handleDeleteAccount = () => {
    const confirmed = confirm("Are you sure you want to delete your account? This action cannot be undone.");
    if (confirmed) {
      alert("Account deletion requested. You will receive an email confirmation.");
    }
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
          </CardContent>
        </Card>

        {/* Subscription & Credits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription & Credits
            </CardTitle>
            <CardDescription>
              Manage your subscription and view credit usage
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
                  <div className="text-2xl font-bold text-blue-600">{userInfo.credits}</div>
                  <div className="text-sm text-gray-600">Credits Remaining</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm font-medium">{userInfo.nextBilling}</div>
                  <div className="text-sm text-gray-600">Next Billing Date</div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button variant="outline">
                  Upgrade Plan
                </Button>
                <Button variant="outline">
                  Buy More Credits
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
              Notifications
            </CardTitle>
            <CardDescription>
              Choose what notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
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
                  <div className="text-sm text-gray-600">Get notified when transcription is done</div>
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
                  <div className="font-medium">Low Credits Warning</div>
                  <div className="text-sm text-gray-600">Alert when credits are running low</div>
                </div>
                <Button
                  variant={notifications.lowCredits ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNotifications(prev => ({ ...prev, lowCredits: !prev.lowCredits }))}
                >
                  {notifications.lowCredits ? "On" : "Off"}
                </Button>
              </div>
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
              Set your default export format and options
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
                  <div className="text-sm text-gray-600">Add timing information to exports</div>
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
                  <div className="text-sm text-gray-600">Show accuracy ratings in exports</div>
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
          </CardContent>
        </Card>

        {/* Save Settings */}
        <div className="flex justify-between items-center">
          <Button
            onClick={handleSave}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            Save Changes
          </Button>
        </div>

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
                  Permanently delete your account and all associated data. This action cannot be undone.
                </div>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                >
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