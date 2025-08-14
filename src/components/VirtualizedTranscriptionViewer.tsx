/**
 * Virtualized Transcription Viewer for CantoneseScribe
 * Efficiently renders large transcription datasets with smooth scrolling
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Copy, 
  Search, 
  ChevronDown, 
  ChevronUp,
  Play,
  Pause,
  SkipBack,
  SkipForward
} from 'lucide-react';
import { TranscriptionItem } from '@/services/transcriptionService';

interface VirtualizedTranscriptionViewerProps {
  items: TranscriptionItem[];
  onItemClick?: (item: TranscriptionItem) => void;
  onCopy?: (text: string) => void;
  className?: string;
  height?: number;
  showTimestamps?: boolean;
  showConfidence?: boolean;
  showSpeaker?: boolean;
  enableSearch?: boolean;
  enableNavigation?: boolean;
  currentTime?: number; // For video sync
  onSeek?: (time: number) => void;
}

interface ItemRendererProps {
  index: number;
  style: React.CSSProperties;
  data: {
    items: TranscriptionItem[];
    filteredIndices: number[];
    searchTerm: string;
    onItemClick?: (item: TranscriptionItem) => void;
    onCopy?: (text: string) => void;
    showTimestamps: boolean;
    showConfidence: boolean;
    showSpeaker: boolean;
    currentTime?: number;
    onSeek?: (time: number) => void;
    formatTime: (seconds: number) => string;
    getConfidenceInfo: (confidence: number) => { text: string; color: string };
    highlightText: (text: string, searchTerm: string) => React.ReactNode;
  };
}

// Individual transcription item renderer
const ItemRenderer: React.FC<ItemRendererProps> = ({ index, style, data }) => {
  const {
    items,
    filteredIndices,
    searchTerm,
    onItemClick,
    onCopy,
    showTimestamps,
    showConfidence,
    showSpeaker,
    currentTime,
    onSeek,
    formatTime,
    getConfidenceInfo,
    highlightText
  } = data;

  const actualIndex = filteredIndices[index];
  const item = items[actualIndex];
  
  if (!item) return null;

  const confidenceInfo = getConfidenceInfo(item.confidence);
  const isActive = currentTime !== undefined && 
    currentTime >= item.start_time && 
    currentTime <= item.end_time;

  const handleCopy = () => {
    const text = [
      item.chinese,
      item.yale || '',
      item.jyutping || '',
      item.english || ''
    ].filter(Boolean).join('\n');
    
    if (onCopy) {
      onCopy(text);
    }
  };

  const handleSeek = () => {
    if (onSeek) {
      onSeek(item.start_time);
    }
  };

  return (
    <div style={style} className="p-2">
      <Card 
        className={`transition-all duration-200 hover:shadow-md group ${
          isActive ? 'ring-2 ring-orange-500 bg-orange-50' : 'hover:bg-gray-50'
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3 flex-wrap">
              {showTimestamps && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSeek}
                  className="text-sm font-mono text-gray-500 hover:text-orange-600 px-2 py-1 h-auto"
                >
                  <Play className="h-3 w-3 mr-1" />
                  {formatTime(item.start_time)} - {formatTime(item.end_time)}
                </Button>
              )}
              
              {showConfidence && (
                <Badge 
                  variant="outline" 
                  className={`text-xs ${confidenceInfo.color}`}
                >
                  {confidenceInfo.text} ({Math.round(item.confidence * 100)}%)
                </Badge>
              )}
              
              {showSpeaker && item.speaker && (
                <Badge variant="secondary" className="text-xs">
                  Speaker {item.speaker}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-8 w-8 p-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
              
              {onItemClick && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onItemClick(item)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-lg font-medium text-gray-900 font-transcription leading-relaxed">
              {searchTerm ? highlightText(item.chinese, searchTerm) : item.chinese}
            </div>
            
            {item.yale && (
              <div className="text-sm text-blue-600 font-mono">
                Yale: {searchTerm ? highlightText(item.yale, searchTerm) : item.yale}
              </div>
            )}
            
            {item.jyutping && (
              <div className="text-sm text-green-600 font-mono">
                Jyutping: {searchTerm ? highlightText(item.jyutping, searchTerm) : item.jyutping}
              </div>
            )}
            
            {item.english && (
              <div className="text-sm text-gray-600 italic">
                {searchTerm ? highlightText(item.english, searchTerm) : item.english}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const VirtualizedTranscriptionViewer: React.FC<VirtualizedTranscriptionViewerProps> = ({
  items,
  onItemClick,
  onCopy,
  className = '',
  height = 600,
  showTimestamps = true,
  showConfidence = true,
  showSpeaker = true,
  enableSearch = true,
  enableNavigation = true,
  currentTime,
  onSeek
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const listRef = useRef<List>(null);

  // Utility functions
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const getConfidenceInfo = useCallback((confidence: number) => {
    if (confidence >= 0.9) {
      return { text: 'Excellent', color: 'bg-green-100 text-green-800' };
    } else if (confidence >= 0.8) {
      return { text: 'Good', color: 'bg-yellow-100 text-yellow-800' };
    } else if (confidence >= 0.7) {
      return { text: 'Fair', color: 'bg-orange-100 text-orange-800' };
    } else {
      return { text: 'Poor', color: 'bg-red-100 text-red-800' };
    }
  }, []);

  const highlightText = useCallback((text: string, term: string): React.ReactNode => {
    if (!term.trim()) return text;
    
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900 rounded px-1">
          {part}
        </mark>
      ) : (
        part
      )
    );
  }, []);

  // Filter items based on search term
  const filteredIndices = useMemo(() => {
    if (!searchTerm.trim()) {
      return items.map((_, index) => index);
    }

    const searchLower = searchTerm.toLowerCase();
    return items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => 
        item.chinese.toLowerCase().includes(searchLower) ||
        item.yale?.toLowerCase().includes(searchLower) ||
        item.jyutping?.toLowerCase().includes(searchLower) ||
        item.english?.toLowerCase().includes(searchLower)
      )
      .map(({ index }) => index);
  }, [items, searchTerm]);

  // Scroll to current time
  useEffect(() => {
    if (currentTime !== undefined && listRef.current) {
      const currentItemIndex = items.findIndex(item => 
        currentTime >= item.start_time && currentTime <= item.end_time
      );
      
      if (currentItemIndex !== -1) {
        const filteredIndex = filteredIndices.indexOf(currentItemIndex);
        if (filteredIndex !== -1) {
          listRef.current.scrollToItem(filteredIndex, 'center');
          setCurrentIndex(filteredIndex);
        }
      }
    }
  }, [currentTime, items, filteredIndices]);

  // Navigation handlers
  const handlePrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      listRef.current?.scrollToItem(newIndex, 'center');
      
      const actualIndex = filteredIndices[newIndex];
      const item = items[actualIndex];
      if (onSeek && item) {
        onSeek(item.start_time);
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < filteredIndices.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      listRef.current?.scrollToItem(newIndex, 'center');
      
      const actualIndex = filteredIndices[newIndex];
      const item = items[actualIndex];
      if (onSeek && item) {
        onSeek(item.start_time);
      }
    }
  };

  const itemData = {
    items,
    filteredIndices,
    searchTerm,
    onItemClick,
    onCopy,
    showTimestamps,
    showConfidence,
    showSpeaker,
    currentTime,
    onSeek,
    formatTime,
    getConfidenceInfo,
    highlightText
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          {enableSearch && (
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search transcription..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
          
          <div className="text-sm text-gray-500">
            {filteredIndices.length === items.length 
              ? `${items.length} segments`
              : `${filteredIndices.length} of ${items.length} segments`
            }
          </div>
        </div>
        
        {enableNavigation && filteredIndices.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            
            <span className="text-sm text-gray-500 px-2">
              {currentIndex + 1} / {filteredIndices.length}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={currentIndex >= filteredIndices.length - 1}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Virtualized List */}
      <div className="border rounded-lg overflow-hidden">
        {filteredIndices.length > 0 ? (
          <List
            ref={listRef}
            height={height}
            itemCount={filteredIndices.length}
            itemSize={200} // Estimated height per item
            itemData={itemData}
            overscanCount={5} // Render extra items for smoother scrolling
            className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
          >
            {ItemRenderer}
          </List>
        ) : (
          <div className="flex items-center justify-center py-12 text-gray-500">
            {searchTerm ? (
              <div className="text-center">
                <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No results found for "{searchTerm}"</p>
                <Button 
                  variant="link" 
                  onClick={() => setSearchTerm('')}
                  className="mt-2"
                >
                  Clear search
                </Button>
              </div>
            ) : (
              <p>No transcription segments to display</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VirtualizedTranscriptionViewer;