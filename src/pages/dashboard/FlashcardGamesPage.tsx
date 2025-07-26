// src/pages/dashboard/FlashcardGamesPage.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Gamepad2, 
  Play, 
  Trophy, 
  Target, 
  Zap,
  RotateCcw,
  CheckCircle,
  XCircle,
  Star
} from "lucide-react";

export const FlashcardGamesPage = () => {
  const [currentGame, setCurrentGame] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);

  const gameTypes = [
    {
      id: 'match',
      title: 'Character Match',
      description: 'Match Chinese characters with Yale romanization',
      difficulty: 'Beginner',
      estimatedTime: '5-10 min',
      icon: Target,
      color: 'bg-blue-500'
    },
    {
      id: 'speed',
      title: 'Speed Round',
      description: 'Quick-fire Jyutping pronunciation challenges',
      difficulty: 'Intermediate',
      estimatedTime: '3-5 min',
      icon: Zap,
      color: 'bg-yellow-500'
    },
    {
      id: 'memory',
      title: 'Memory Palace',
      description: 'Remember character sequences and meanings',
      difficulty: 'Advanced',
      estimatedTime: '10-15 min',
      icon: Trophy,
      color: 'bg-purple-500'
    }
  ];

  const recentGames = [
    { game: 'Character Match', score: 850, accuracy: '94%', date: '2 hours ago' },
    { game: 'Speed Round', score: 720, accuracy: '89%', date: '1 day ago' },
    { game: 'Memory Palace', score: 950, accuracy: '96%', date: '2 days ago' }
  ];

  const MockGameInterface = ({ gameType }: { gameType: string }) => {
    const [currentCard, setCurrentCard] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [showResult, setShowResult] = useState(false);

    const flashcards = [
      {
        character: '你好',
        yale: 'néih hóu',
        jyutping: 'nei5 hou2',
        meaning: 'hello',
        options: ['néih hóu', 'néih jóu', 'léih hóu', 'méih hóu']
      },
      {
        character: '多謝',
        yale: 'dō jeh',
        jyutping: 'do1 ze6',
        meaning: 'thank you',
        options: ['dō jeh', 'dō gei', 'tō jeh', 'mō jeh']
      }
    ];

    const handleAnswer = (answer: string) => {
      setSelectedAnswer(answer);
      setShowResult(true);
      
      setTimeout(() => {
        setShowResult(false);
        setSelectedAnswer(null);
        setCurrentCard(prev => (prev + 1) % flashcards.length);
      }, 1500);
    };

    const currentFlashcard = flashcards[currentCard];
    const isCorrect = selectedAnswer === currentFlashcard.yale;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setCurrentGame(null)}>
              ← Back to Games
            </Button>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">Score: {score}</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-500" />
              <span className="font-medium">Streak: {streak}</span>
            </div>
          </div>
          <Progress value={((currentCard + 1) / flashcards.length) * 100} className="w-32" />
        </div>

        <Card className="mx-auto max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-4xl font-bold mb-4">
              {currentFlashcard.character}
            </CardTitle>
            <CardDescription className="text-lg">
              Choose the correct Yale romanization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showResult ? (
              <div className={`text-center p-6 rounded-lg ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                {isCorrect ? (
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                ) : (
                  <XCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                )}
                <h3 className={`text-xl font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                  {isCorrect ? 'Correct!' : 'Incorrect'}
                </h3>
                <p className="text-gray-600 mt-2">
                  {currentFlashcard.character} = {currentFlashcard.yale} ({currentFlashcard.meaning})
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {currentFlashcard.options.map((option, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-16 text-lg"
                    onClick={() => handleAnswer(option)}
                    disabled={showResult}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  if (currentGame) {
    return <MockGameInterface gameType={currentGame} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI-Powered Flashcard Games</h1>
        <p className="text-muted-foreground">
          Interactive games to boost your Cantonese learning with AI-driven challenges
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Games Played</CardTitle>
            <Gamepad2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">47</div>
            <p className="text-xs text-muted-foreground">+5 this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">823</div>
            <p className="text-xs text-muted-foreground">+12% improvement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Streak</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">28</div>
            <p className="text-xs text-muted-foreground">Correct answers in a row</p>
          </CardContent>
        </Card>
      </div>

      {/* Game Types */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Choose Your Game</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {gameTypes.map((game) => (
            <Card key={game.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-lg ${game.color}`}>
                    <game.icon className="h-6 w-6 text-white" />
                  </div>
                  <Badge variant="outline">{game.difficulty}</Badge>
                </div>
                <CardTitle className="text-lg">{game.title}</CardTitle>
                <CardDescription>{game.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{game.estimatedTime}</span>
                  <Button onClick={() => setCurrentGame(game.id)}>
                    <Play className="h-4 w-4 mr-2" />
                    Play
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Games */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Games</CardTitle>
          <CardDescription>Your latest game performances</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentGames.map((game, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Gamepad2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{game.game}</p>
                    <p className="text-sm text-muted-foreground">{game.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{game.score} pts</p>
                  <p className="text-sm text-muted-foreground">{game.accuracy}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};