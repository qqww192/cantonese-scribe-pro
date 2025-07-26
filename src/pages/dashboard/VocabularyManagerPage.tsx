// src/pages/dashboard/VocabularyManagerPage.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  Search, 
  Filter, 
  Star,
  BookOpen,
  TrendingUp,
  CheckCircle,
  Lightbulb,
  Zap,
  RefreshCw,
  Eye,
  Volume2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Mock vocabulary with AI difficulty analysis
const vocabularyWithAI = [
  {
    id: 1,
    character: "你好",
    yale: "néih hóu",
    jyutping: "nei5 hou2",
    english: "hello",
    aiDifficulty: "Beginner",
    aiConfidence: 98,
    aiReasoning: "Common greeting, simple tones, basic vocabulary",
    frequency: "Very High",
    toneComplexity: "Low",
    strokeCount: 10,
    source: "Daily Conversation",
    mastery: 95,
    timesStudied: 15,
    lastStudied: "2 hours ago"
  },
  {
    id: 2,
    character: "廣東話",
    yale: "gwóng dūng wá",
    jyutping: "gwong2 dung1 waa2",
    english: "Cantonese",
    aiDifficulty: "Intermediate",
    aiConfidence: 87,
    aiReasoning: "Three syllables, mid-level tones, cultural term",
    frequency: "High",
    toneComplexity: "Medium",
    strokeCount: 25,
    source: "Language Learning",
    mastery: 72,
    timesStudied: 8,
    lastStudied: "1 day ago"
  },
  {
    id: 3,
    character: "創新",
    yale: "chong san",
    jyutping: "cong3 san1",
    english: "innovation",
    aiDifficulty: "Advanced",
    aiConfidence: 91,
    aiReasoning: "Abstract concept, business terminology, complex meaning",
    frequency: "Medium",
    toneComplexity: "Medium",
    strokeCount: 18,
    source: "Business Interview",
    mastery: 34,
    timesStudied: 3,
    lastStudied: "1 week ago"
  },
  {
    id: 4,
    character: "學習",
    yale: "hohk jaahp",
    jyutping: "hok6 zaap6",
    english: "to learn, to study",
    aiDifficulty: "Intermediate",
    aiConfidence: 89,
    aiReasoning: "Educational term, moderate frequency, clear meaning",
    frequency: "High",
    toneComplexity: "Medium",
    strokeCount: 24,
    source: "Education Video",
    mastery: 67,
    timesStudied: 6,
    lastStudied: "3 days ago"
  },
  {
    id: 5,
    character: "實踐",
    yale: "saht jin",
    jyutping: "sat6 zin6",
    english: "practice, implement",
    aiDifficulty: "Advanced",
    aiConfidence: 93,
    aiReasoning: "Abstract concept, low frequency, multiple meanings",
    frequency: "Low",
    toneComplexity: "High",
    strokeCount: 22,
    source: "Academic Paper",
    mastery: 23,
    timesStudied: 2,
    lastStudied: "2 weeks ago"
  }
];

export const VocabularyManagerPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("aiConfidence");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const difficultyStats = [
    { level: "Beginner", count: 1, color: "bg-green-100 text-green-800", percentage: 20 },
    { level: "Intermediate", count: 2, color: "bg-yellow-100 text-yellow-800", percentage: 40 },
    { level: "Advanced", count: 2, color: "bg-red-100 text-red-800", percentage: 40 }
  ];

  const aiAnalysisMetrics = [
    { label: "Words Analyzed", value: "5", icon: Brain, color: "text-blue-600" },
    { label: "Avg. Confidence", value: "91.6%", icon: CheckCircle, color: "text-green-600" },
    { label: "Needs Review", value: "2", icon: TrendingUp, color: "text-yellow-600" },
    { label: "AI Suggestions", value: "3", icon: Lightbulb, color: "text-purple-600" }
  ];

  const filteredVocabulary = vocabularyWithAI.filter(word => {
    const matchesSearch = word.character.includes(searchTerm) || 
                         word.english.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         word.yale.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = selectedDifficulty === "all" || word.aiDifficulty === selectedDifficulty;
    
    return matchesSearch && matchesDifficulty;
  });

  const sortedVocabulary = [...filteredVocabulary].sort((a, b) => {
    switch (sortBy) {
      case "aiConfidence":
        return b.aiConfidence - a.aiConfidence;
      case "mastery":
        return b.mastery - a.mastery;
      case "difficulty":
        const diffOrder = { "Beginner": 1, "Intermediate": 2, "Advanced": 3 };
        return diffOrder[a.aiDifficulty as keyof typeof diffOrder] - diffOrder[b.aiDifficulty as keyof typeof diffOrder];
      case "needsReview":
        return a.mastery - b.mastery; // Lowest mastery first
      default:
        return 0;
    }
  });

  const runAIAnalysis = () => {
    setIsAnalyzing(true);
    // Simulate AI analysis
    setTimeout(() => {
      setIsAnalyzing(false);
      // In real implementation, this would call your AI service
    }, 3000);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner": return "bg-green-100 text-green-800";
      case "Intermediate": return "bg-yellow-100 text-yellow-800";
      case "Advanced": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "text-green-600";
    if (confidence >= 75) return "text-yellow-600";
    return "text-red-600";
  };

  const getMasteryColor = (mastery: number) => {
    if (mastery >= 80) return "text-green-600";
    if (mastery >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const AIInsightCard = ({ word }: { word: any }) => (
    <div className="p-4 bg-blue-50 rounded-lg space-y-2">
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-blue-600" />
        <span className="font-medium text-blue-900">AI Analysis</span>
        <Badge className={getConfidenceColor(word.aiConfidence) === "text-green-600" ? "bg-green-100 text-green-800" : 
                          getConfidenceColor(word.aiConfidence) === "text-yellow-600" ? "bg-yellow-100 text-yellow-800" : 
                          "bg-red-100 text-red-800"}>
          {word.aiConfidence}% confidence
        </Badge>
      </div>
      <p className="text-sm text-blue-700">{word.aiReasoning}</p>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-blue-600">Frequency:</span>
          <div className="font-medium">{word.frequency}</div>
        </div>
        <div>
          <span className="text-blue-600">Tone Complexity:</span>
          <div className="font-medium">{word.toneComplexity}</div>
        </div>
        <div>
          <span className="text-blue-600">Strokes:</span>
          <div className="font-medium">{word.strokeCount}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Vocabulary Manager</h1>
          <p className="text-muted-foreground">
            Intelligent difficulty categorization and analysis of your vocabulary
          </p>
        </div>
        <Button onClick={runAIAnalysis} disabled={isAnalyzing}>
          {isAnalyzing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Brain className="h-4 w-4 mr-2" />
              Run AI Analysis
            </>
          )}
        </Button>
      </div>

      {/* AI Analysis Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {aiAnalysisMetrics.map((metric, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Difficulty Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            AI Difficulty Analysis
          </CardTitle>
          <CardDescription>
            Words automatically categorized by AI based on complexity factors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            {difficultyStats.map((level, index) => (
              <div key={index} className="text-center p-4 border rounded-lg">
                <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${level.color} mb-2`}>
                  {level.level}
                </div>
                <div className="text-2xl font-bold">{level.count}</div>
                <div className="text-sm text-muted-foreground">words ({level.percentage}%)</div>
                <Progress value={level.percentage} className="mt-2 h-2" />
              </div>
            ))}
          </div>

          <div className="text-sm text-muted-foreground">
            AI considers factors like: character complexity, tone patterns, frequency of use, 
            stroke count, and semantic complexity to determine difficulty levels.
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Vocabulary Library</CardTitle>
          <CardDescription>
            Search, filter, and analyze your AI-categorized vocabulary
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
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aiConfidence">AI Confidence</SelectItem>
                <SelectItem value="mastery">Mastery Level</SelectItem>
                <SelectItem value="difficulty">Difficulty</SelectItem>
                <SelectItem value="needsReview">Needs Review</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Vocabulary List */}
          <div className="space-y-4">
            {sortedVocabulary.map((word) => (
              <Card key={word.id} className="p-4">
                <div className="space-y-4">
                  {/* Main Word Info */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-2xl font-bold">{word.character}</h3>
                        <Badge className={getDifficultyColor(word.aiDifficulty)}>
                          {word.aiDifficulty}
                        </Badge>
                        <Badge variant="outline">{word.source}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-3">
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

                      <div className="flex items-center gap-6 text-xs text-muted-foreground">
                        <span>Studied: {word.timesStudied}x</span>
                        <span>Last: {word.lastStudied}</span>
                        <span className={`font-medium ${getMasteryColor(word.mastery)}`}>
                          Mastery: {word.mastery}%
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Volume2 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* AI Analysis */}
                  <AIInsightCard word={word} />

                  {/* Learning Suggestions */}
                  {word.mastery < 70 && (
                    <div className="p-3 bg-amber-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Lightbulb className="h-4 w-4 text-amber-600" />
                        <span className="font-medium text-amber-900">AI Learning Suggestion</span>
                      </div>
                      <p className="text-amber-700 text-sm">
                        {word.mastery < 50 
                          ? "Focus on basic recognition and pronunciation. Practice with flashcards daily."
                          : "Good progress! Try using this word in sentences and pronunciation practice."
                        }
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {sortedVocabulary.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No vocabulary words match your current filters.
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            AI Study Recommendations
          </CardTitle>
          <CardDescription>
            Personalized suggestions based on difficulty analysis and progress
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-2">Priority: Focus on Advanced Words</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Your advanced vocabulary (實踐, 創新) needs more attention. Current mastery is below 40%.
            </p>
            <Button size="sm">
              <BookOpen className="h-4 w-4 mr-2" />
              Create Study Session
            </Button>
          </div>

          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-2">Review Schedule</h4>
            <p className="text-sm text-muted-foreground mb-2">
              3 words haven't been reviewed in over a week. Schedule regular reviews to maintain mastery.
            </p>
            <Button size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Set Up Reviews
            </Button>
          </div>

          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-2">New Challenge</h4>
            <p className="text-sm text-muted-foreground mb-2">
              You're ready for more intermediate vocabulary! AI detected 85%+ mastery in beginner words.
            </p>
            <Button size="sm" variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              Explore Intermediate
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};