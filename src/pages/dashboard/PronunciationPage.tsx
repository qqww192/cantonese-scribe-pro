// src/pages/dashboard/PronunciationPage.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Mic, 
  MicOff, 
  Volume2, 
  RotateCcw,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Target,
  Play,
  Square,
  Award,
  Headphones
} from "lucide-react";

export const PronunciationPage = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentWord, setCurrentWord] = useState(0);
  const [sessionScore, setSessionScore] = useState(0);

  const pronunciationStats = [
    { label: "Accuracy Score", value: "87%", icon: Target, color: "text-green-600" },
    { label: "Words Practiced", value: "342", icon: Mic, color: "text-blue-600" },
    { label: "Session Streak", value: "12", icon: TrendingUp, color: "text-purple-600" },
    { label: "Achievements", value: "8", icon: Award, color: "text-yellow-600" }
  ];

  const practiceWords = [
    {
      character: "廣東話",
      yale: "gwóng dūng wá",
      jyutping: "gwong2 dung1 waa2",
      english: "Cantonese",
      difficulty: "Intermediate",
      tones: [2, 1, 2],
      tips: "Focus on the rising tone in '廣' and falling tone in '東'"
    },
    {
      character: "飲茶",
      yale: "yám chàh",
      jyutping: "jam2 caa4",
      english: "dim sum / drink tea",
      difficulty: "Beginner",
      tones: [2, 4],
      tips: "The second syllable has a low falling tone"
    },
    {
      character: "香港",
      yale: "hēung góng",
      jyutping: "hoeng1 gong2",
      english: "Hong Kong",
      difficulty: "Beginner",
      tones: [1, 2],
      tips: "First tone is high and level, second is rising"
    }
  ];

  const recentPractice = [
    { word: "你好", score: 94, accuracy: "Excellent", date: "5 min ago" },
    { word: "多謝", score: 87, accuracy: "Good", date: "10 min ago" },
    { word: "再見", score: 91, accuracy: "Very Good", date: "15 min ago" }
  ];

  const currentPracticeWord = practiceWords[currentWord];

  const handleRecording = () => {
    setIsRecording(!isRecording);
    
    // Simulate recording and AI feedback
    if (isRecording) {
      setTimeout(() => {
        setIsRecording(false);
        // Mock AI analysis result
        const mockScore = Math.floor(Math.random() * 30) + 70; // 70-100
        setSessionScore(mockScore);
      }, 3000);
    }
  };

  const getAccuracyColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-yellow-600";
    return "text-red-600";
  };

  const getAccuracyLabel = (score: number) => {
    if (score >= 95) return "Excellent";
    if (score >= 85) return "Very Good";
    if (score >= 75) return "Good";
    if (score >= 65) return "Fair";
    return "Needs Practice";
  };

  const ToneVisualization = ({ tones }: { tones: number[] }) => {
    const toneShapes = {
      1: "M 0 20 L 40 20", // High level
      2: "M 0 35 L 40 10", // Rising
      3: "M 0 25 L 20 35 L 40 15", // Dipping
      4: "M 0 10 L 40 35", // Falling
      5: "M 0 25 L 40 25", // Low level
      6: "M 0 35 L 40 30"  // Low falling
    };

    return (
      <div className="flex gap-2 items-center">
        {tones.map((tone, index) => (
          <div key={index} className="flex flex-col items-center">
            <svg width="40" height="40" className="border rounded">
              <path
                d={toneShapes[tone as keyof typeof toneShapes]}
                stroke="#3b82f6"
                strokeWidth="2"
                fill="none"
              />
            </svg>
            <span className="text-xs mt-1">Tone {tone}</span>
          </div>
        ))}
      </div>
    );
  };

  const AIFeedback = ({ score }: { score: number }) => {
    if (score === 0) return null;

    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            {score >= 85 ? (
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
            )}
            AI Pronunciation Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Overall Accuracy:</span>
            <span className={`font-bold ${getAccuracyColor(score)}`}>
              {score}% - {getAccuracyLabel(score)}
            </span>
          </div>
          
          <Progress value={score} className="h-2" />
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Tone Accuracy:</span>
              <span className="text-green-600">92%</span>
            </div>
            <div className="flex justify-between">
              <span>Consonant Clarity:</span>
              <span className="text-yellow-600">83%</span>
            </div>
            <div className="flex justify-between">
              <span>Vowel Pronunciation:</span>
              <span className="text-green-600">89%</span>
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-1">AI Suggestion:</h4>
            <p className="text-blue-700 text-sm">
              Try emphasizing the rising tone more clearly in the second syllable. 
              Your consonants are clear, but the tone contour could be more pronounced.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Pronunciation Practice</h1>
        <p className="text-muted-foreground">
          Practice Cantonese pronunciation with real-time AI feedback and tone analysis
        </p>
      </div>

      {/* Pronunciation Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {pronunciationStats.map((stat, index) => (
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

      {/* Main Practice Interface */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Practice Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Practice Session</span>
              <Badge variant="outline">
                {currentWord + 1} of {practiceWords.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Listen, practice, and get AI feedback on your pronunciation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Word Display */}
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold">{currentPracticeWord.character}</h2>
              <div className="space-y-2">
                <div>
                  <span className="text-muted-foreground">Yale: </span>
                  <span className="font-medium text-lg">{currentPracticeWord.yale}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Jyutping: </span>
                  <span className="font-medium text-lg">{currentPracticeWord.jyutping}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">English: </span>
                  <span className="text-lg">{currentPracticeWord.english}</span>
                </div>
              </div>
              
              <Badge className={
                currentPracticeWord.difficulty === "Beginner" ? "bg-green-100 text-green-800" :
                currentPracticeWord.difficulty === "Intermediate" ? "bg-yellow-100 text-yellow-800" :
                "bg-red-100 text-red-800"
              }>
                {currentPracticeWord.difficulty}
              </Badge>
            </div>

            {/* Tone Visualization */}
            <div className="text-center">
              <h3 className="text-sm font-medium mb-2">Tone Pattern:</h3>
              <div className="flex justify-center">
                <ToneVisualization tones={currentPracticeWord.tones} />
              </div>
            </div>

            {/* Audio Controls */}
            <div className="flex justify-center gap-3">
              <Button variant="outline">
                <Volume2 className="h-4 w-4 mr-2" />
                Listen
              </Button>
              <Button variant="outline">
                <Headphones className="h-4 w-4 mr-2" />
                Slow
              </Button>
              <Button variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                Repeat
              </Button>
            </div>

            {/* Recording Interface */}
            <div className="text-center space-y-4">
              <Button
                size="lg"
                onClick={handleRecording}
                className={`w-32 h-32 rounded-full ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {isRecording ? (
                  <Square className="h-8 w-8 text-white" />
                ) : (
                  <Mic className="h-8 w-8 text-white" />
                )}
              </Button>
              
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRecording ? "Recording... Speak now!" : "Click to start recording"}
                </p>
                {isRecording && (
                  <Progress value={66} className="w-32 mx-auto mt-2" />
                )}
              </div>
            </div>

            {/* Pronunciation Tip */}
            <div className="p-3 bg-amber-50 rounded-lg">
              <h4 className="font-medium text-amber-900 mb-1">💡 Pronunciation Tip:</h4>
              <p className="text-amber-700 text-sm">{currentPracticeWord.tips}</p>
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setCurrentWord(Math.max(0, currentWord - 1))}
                disabled={currentWord === 0}
              >
                Previous
              </Button>
              <Button 
                onClick={() => setCurrentWord(Math.min(practiceWords.length - 1, currentWord + 1))}
                disabled={currentWord === practiceWords.length - 1}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI Feedback & Recent Practice */}
        <div className="space-y-6">
          <AIFeedback score={sessionScore} />
          
          {/* Recent Practice */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Practice</CardTitle>
              <CardDescription>Your latest pronunciation attempts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentPractice.map((practice, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{practice.word}</p>
                      <p className="text-sm text-muted-foreground">{practice.date}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${getAccuracyColor(practice.score)}`}>
                        {practice.score}%
                      </p>
                      <p className="text-sm text-muted-foreground">{practice.accuracy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};