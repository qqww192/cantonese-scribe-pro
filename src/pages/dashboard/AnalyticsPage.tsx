// src/pages/dashboard/AnalyticsPage.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Calendar,
  Target,
  Award,
  Clock,
  Brain,
  Zap,
  BookOpen,
  Mic,
  Gamepad2,
  BarChart3,
  ChevronRight
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const AnalyticsPage = () => {
  const [timeRange, setTimeRange] = useState("7d");

  const overallStats = [
    { label: "Study Streak", value: "23 days", icon: Calendar, color: "text-orange-600" },
    { label: "Total Study Time", value: "47.5h", icon: Clock, color: "text-blue-600" },
    { label: "Words Mastered", value: "523", icon: Target, color: "text-green-600" },
    { label: "Achievements", value: "12", icon: Award, color: "text-purple-600" }
  ];

  const weeklyProgress = [
    { day: "Mon", studyTime: 45, wordsLearned: 12, pronunciation: 87 },
    { day: "Tue", studyTime: 60, wordsLearned: 15, pronunciation: 91 },
    { day: "Wed", studyTime: 30, wordsLearned: 8, pronunciation: 83 },
    { day: "Thu", studyTime: 75, wordsLearned: 18, pronunciation: 94 },
    { day: "Fri", studyTime: 50, wordsLearned: 14, pronunciation: 89 },
    { day: "Sat", studyTime: 90, wordsLearned: 22, pronunciation: 96 },
    { day: "Sun", studyTime: 65, wordsLearned: 16, pronunciation: 92 }
  ];

  const skillBreakdown = [
    { skill: "Vocabulary Recognition", level: 92, change: "+5%", color: "bg-blue-500" },
    { skill: "Pronunciation Accuracy", level: 87, change: "+8%", color: "bg-green-500" },
    { skill: "Tone Recognition", level: 79, change: "+12%", color: "bg-yellow-500" },
    { skill: "Reading Comprehension", level: 85, change: "+3%", color: "bg-purple-500" },
    { skill: "Listening Comprehension", level: 81, change: "+7%", color: "bg-red-500" }
  ];

  const activityBreakdown = [
    { activity: "Flashcard Games", time: "12.5h", percentage: 26, color: "bg-blue-500" },
    { activity: "Pronunciation Practice", time: "10.2h", percentage: 21, color: "bg-green-500" },
    { activity: "Vocabulary Study", time: "8.7h", percentage: 18, color: "bg-yellow-500" },
    { activity: "Video Transcription", time: "7.3h", percentage: 15, color: "bg-purple-500" },
    { activity: "Analytics Review", time: "4.8h", percentage: 10, color: "bg-red-500" },
    { activity: "Other", time: "4.0h", percentage: 10, color: "bg-gray-500" }
  ];

  const achievements = [
    { title: "Streak Master", description: "Study for 21 days straight", date: "3 days ago", icon: Calendar },
    { title: "Pronunciation Pro", description: "Achieve 95% accuracy in pronunciation", date: "1 week ago", icon: Mic },
    { title: "Vocabulary Ace", description: "Master 500 vocabulary words", date: "2 weeks ago", icon: Brain },
    { title: "Game Champion", description: "Score 1000+ in flashcard games", date: "3 weeks ago", icon: Gamepad2 }
  ];

  const learningRecommendations = [
    {
      title: "Focus on Tone Practice",
      description: "Your tone recognition is improving but could use more practice. Try 15 minutes daily.",
      priority: "High",
      estimatedTime: "15 min/day"
    },
    {
      title: "Review Advanced Vocabulary",
      description: "You haven't reviewed advanced words in 3 days. Quick review recommended.",
      priority: "Medium", 
      estimatedTime: "10 min"
    },
    {
      title: "Try New Game Mode",
      description: "Memory Palace game could help with retention. Based on your learning style.",
      priority: "Low",
      estimatedTime: "20 min"
    }
  ];

  const WeeklyChart = () => (
    <div className="space-y-4">
      <div className="flex justify-between text-sm">
        <span>Study Time (minutes)</span>
        <span>Max: 90 min</span>
      </div>
      <div className="flex items-end justify-between h-32 gap-2">
        {weeklyProgress.map((day, index) => (
          <div key={index} className="flex flex-col items-center gap-2">
            <div className="flex flex-col items-center text-xs text-muted-foreground">
              <span>{day.wordsLearned}</span>
              <span className="text-[10px]">words</span>
            </div>
            <div 
              className="w-8 bg-blue-500 rounded-t"
              style={{ height: `${(day.studyTime / 90) * 80}px` }}
            />
            <span className="text-xs font-medium">{day.day}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "bg-red-100 text-red-800";
      case "Medium": return "bg-yellow-100 text-yellow-800"; 
      case "Low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Learning Analytics</h1>
          <p className="text-muted-foreground">
            Personalized insights and progress tracking powered by AI analysis
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 days</SelectItem>
            <SelectItem value="30d">30 days</SelectItem>
            <SelectItem value="90d">90 days</SelectItem>
            <SelectItem value="1y">1 year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overall Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        {overallStats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Weekly Progress Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Weekly Study Progress
          </CardTitle>
          <CardDescription>
            Your daily study time and vocabulary acquisition over the past week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WeeklyChart />
        </CardContent>
      </Card>

      {/* Skill Breakdown and Activity Time */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Skill Proficiency */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Skill Proficiency
            </CardTitle>
            <CardDescription>
              AI-analyzed skill levels based on your performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {skillBreakdown.map((skill, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{skill.skill}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{skill.level}%</span>
                    <span className="text-green-600 text-xs">{skill.change}</span>
                  </div>
                </div>
                <Progress value={skill.level} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Activity Time Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Time Distribution
            </CardTitle>
            <CardDescription>
              How you spend your learning time across different activities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activityBreakdown.map((activity, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${activity.color}`} />
                  <span className="text-sm">{activity.activity}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{activity.time}</div>
                  <div className="text-xs text-muted-foreground">{activity.percentage}%</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* AI Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            AI Learning Recommendations
          </CardTitle>
          <CardDescription>
            Personalized suggestions based on your learning patterns and progress
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {learningRecommendations.map((rec, index) => (
            <div key={index} className="flex items-start justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium">{rec.title}</h3>
                  <Badge className={getPriorityColor(rec.priority)}>
                    {rec.priority}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                <span className="text-xs text-muted-foreground">
                  Estimated time: {rec.estimatedTime}
                </span>
              </div>
              <Button size="sm" variant="outline">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recent Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Award className="h-5 w-5 mr-2" />
            Recent Achievements
          </CardTitle>
          <CardDescription>
            Milestones you've unlocked in your learning journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {achievements.map((achievement, index) => (
              <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <achievement.icon className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{achievement.title}</h3>
                  <p className="text-sm text-muted-foreground">{achievement.description}</p>
                  <span className="text-xs text-muted-foreground">{achievement.date}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};