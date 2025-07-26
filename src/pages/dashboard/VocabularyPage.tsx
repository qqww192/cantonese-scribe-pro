// src/pages/dashboard/VocabularyPage.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Brain, 
  Search, 
  Filter, 
  Star,
  BookOpen,
  TrendingUp,
  Clock,
  CheckCircle,
  Volume2,
  Eye
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const VocabularyPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const vocabularyStats = [
    { label: "Total Words", value: "1,247", icon: BookOpen, color: "text-blue-600" },
    { label: "Mastered", value: "523", icon: CheckCircle, color: "text-green-600" },
    { label: "Learning", value: "624", icon: TrendingUp, color: "text-yellow-600" },
    { label: "New", value: "100", icon: Star, color: "text-purple-600" }
  ];

  const difficultyLevels = [
    { level: "Beginner", count: 423, color: "bg-green-100 text-green-800" },
    { level: "Intermediate", count: 567, color: "bg-yellow-100 text-yellow-800" },
    { level: "Advanced", count: 257, color: "bg-red-100 text-red-800" }
  ];

  const vocabularyWords = [
    {
      id: 1,
      character: "學習",
      yale: "hohk jaahp",
      jyutping: "hok6 zaap6",
      english: "to learn, to study",
      difficulty: "Beginner",
      category: "Education",
      mastery: 85,
      lastReviewed: "2 hours ago",
      timesReviewed: 12,
      source: "Cantonese Lesson 05"
    },
    {
      id: 2,
      character: "朋友",
      yale: "pàhng yáuh",
      jyutping: "pang4 jau5",
      english: "friend",
      difficulty: "Beginner",
      category: "Relationships",
      mastery: 92,
      lastReviewed: "1 day ago",
      timesReviewed: 18,
      source: "Daily Conversation"
    },
    {
      id: 3,
      character: "電腦",
      yale: "dihn nóuh",
      jyutping: "din6 nou5",
      english: "computer",
      difficulty: "Intermediate",
      category: "Technology",
      mastery: 67,
      lastReviewed: "3 days ago",
      timesReviewed: 8,
      source: "Tech News Video"
    },
    {
      id: 4,
      character: "創新",
      yale: "chong san",
      jyutping: "cong3 san1",
      english: "innovation, to innovate",
      difficulty: "Advanced",
      category: "Business",
      mastery: 34,
      lastReviewed: "1 week ago",
      timesReviewed: 3,
      source: "Business Interview"
    }
  ];

  const categories = [
    "Education", "Relationships", "Technology", "Business", "Food", "Travel", 
    "Health", "Entertainment", "Family", "Work"
  ];

  const getMasteryColor = (mastery: number) => {
    if (mastery >= 80) return "text-green-600";
    if (mastery >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner": return "bg-green-100 text-green-800";
      case "Intermediate": return "bg-yellow-100 text-yellow-800";
      case "Advanced": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const filteredWords = vocabularyWords.filter(word => {
    const matchesSearch = word.character.includes(searchTerm) || 
                         word.english.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         word.yale.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = selectedDifficulty === "all" || word.difficulty === selectedDifficulty;
    const matchesCategory = selectedCategory === "all" || word.category === selectedCategory;
    
    return matchesSearch && matchesDifficulty && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Smart Vocabulary Manager</h1>
        <p className="text-muted-foreground">
          AI-categorized vocabulary with difficulty analysis and mastery tracking
        </p>
      </div>

      {/* Vocabulary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {vocabularyStats.map((stat, index) => (
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

      {/* Difficulty Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            AI Difficulty Analysis
          </CardTitle>
          <CardDescription>
            Words automatically categorized by AI based on complexity and usage patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {difficultyLevels.map((level, index) => (
              <div key={index} className="text-center p-4 border rounded-lg">
                <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${level.color} mb-2`}>
                  {level.level}
                </div>
                <div className="text-2xl font-bold">{level.count}</div>
                <div className="text-sm text-muted-foreground">words</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Vocabulary Library</CardTitle>
          <CardDescription>
            Search and filter your personalized vocabulary collection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by character, pronunciation, or meaning..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="Beginner">Beginner</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vocabulary List */}
          <div className="space-y-3">
            {filteredWords.map((word) => (
              <div key={word.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">{word.character}</h3>
                      <Badge className={getDifficultyColor(word.difficulty)}>
                        {word.difficulty}
                      </Badge>
                      <Badge variant="outline">{word.category}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Yale:</span>
                        <span className="ml-2 font-medium">{word.yale}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Jyutping:</span>
                        <span className="ml-2 font-medium">{word.jyutping}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">English:</span>
                        <span className="ml-2">{word.english}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 mt-3 text-xs text-muted-foreground">
                      <span>Source: {word.source}</span>
                      <span>Reviewed: {word.lastReviewed}</span>
                      <span>Count: {word.timesReviewed}x</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">Mastery:</span>
                      <span className={`text-sm font-medium ${getMasteryColor(word.mastery)}`}>
                        {word.mastery}%
                      </span>
                    </div>
                    
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline">
                        <Volume2 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredWords.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No vocabulary words match your current filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};