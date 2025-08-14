/**
 * Download Progress Indicator for CantoneseScribe
 * Shows download progress with notifications and cancellation options
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  CheckCircle, 
  AlertCircle, 
  X,
  FileText,
  Loader2
} from 'lucide-react';
import { DownloadProgress } from '@/services/downloadService';
import { cn } from '@/lib/utils';

interface DownloadProgressIndicatorProps {
  downloads: DownloadProgress[];
  onCancel?: (jobId: string) => void;
  onCancelAll?: () => void;
  className?: string;
  showMini?: boolean;
}

const getFormatIcon = (format: string) => {
  switch (format.toLowerCase()) {
    case 'srt':
    case 'vtt':
      return '🎬';
    case 'txt':
      return '📄';
    case 'csv':
      return '📊';
    case 'json':
      return '🔧';
    default:
      return '📁';
  }
};

const getStatusColor = (status: DownloadProgress['status']) => {
  switch (status) {
    case 'preparing':
      return 'bg-blue-100 text-blue-800';
    case 'downloading':
      return 'bg-orange-100 text-orange-800';
    case 'complete':
      return 'bg-green-100 text-green-800';
    case 'error':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusText = (status: DownloadProgress['status']) => {
  switch (status) {
    case 'preparing':
      return 'Preparing...';
    case 'downloading':
      return 'Downloading...';
    case 'complete':
      return 'Complete';
    case 'error':
      return 'Failed';
    default:
      return 'Unknown';
  }
};

// Mini version for floating notifications
const MiniDownloadIndicator: React.FC<DownloadProgressIndicatorProps> = ({
  downloads,
  onCancel,
  onCancelAll,
  className
}) => {
  const activeDownloads = downloads.filter(d => d.status === 'downloading' || d.status === 'preparing');
  const completedDownloads = downloads.filter(d => d.status === 'complete');
  const failedDownloads = downloads.filter(d => d.status === 'error');

  if (downloads.length === 0) return null;

  return (
    <div className={cn("fixed bottom-4 right-4 z-50 space-y-2", className)}>
      {activeDownloads.map(download => (
        <Card key={download.jobId} className="w-80 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg" role="img" aria-label={`${download.format} file`}>
                  {getFormatIcon(download.format)}
                </span>
                <span className="font-medium text-sm">
                  {download.format.toUpperCase()} Export
                </span>
                {download.status === 'downloading' && (
                  <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getStatusColor(download.status)}>
                  {getStatusText(download.status)}
                </Badge>
                {onCancel && download.status === 'downloading' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCancel(download.jobId)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Progress value={download.progress} className="h-2" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{download.progress}%</span>
                {download.status === 'downloading' && (
                  <span>Downloading...</span>
                )}
              </div>
            </div>
            
            {download.error && (
              <p className="text-xs text-red-600 mt-2">{download.error}</p>
            )}
          </CardContent>
        </Card>
      ))}
      
      {/* Summary for completed/failed downloads */}
      {(completedDownloads.length > 0 || failedDownloads.length > 0) && activeDownloads.length === 0 && (
        <Card className="w-80 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                <span className="font-medium text-sm">Downloads</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancelAll}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            
            <div className="mt-2 space-y-1">
              {completedDownloads.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>{completedDownloads.length} completed</span>
                </div>
              )}
              
              {failedDownloads.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  <span>{failedDownloads.length} failed</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Full version for download management page
const FullDownloadIndicator: React.FC<DownloadProgressIndicatorProps> = ({
  downloads,
  onCancel,
  onCancelAll,
  className
}) => {
  if (downloads.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <Download className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">No active downloads</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Download className="h-5 w-5" />
            Downloads ({downloads.length})
          </h3>
          
          {onCancelAll && downloads.some(d => d.status === 'downloading') && (
            <Button variant="outline" size="sm" onClick={onCancelAll}>
              Cancel All
            </Button>
          )}
        </div>
        
        <div className="space-y-4">
          {downloads.map(download => (
            <div key={download.jobId} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl" role="img" aria-label={`${download.format} file`}>
                    {getFormatIcon(download.format)}
                  </span>
                  
                  <div>
                    <div className="font-medium">
                      {download.format.toUpperCase()} Export
                    </div>
                    <div className="text-sm text-gray-500">
                      Job ID: {download.jobId}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getStatusColor(download.status)}>
                    {getStatusText(download.status)}
                  </Badge>
                  
                  {onCancel && download.status === 'downloading' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCancel(download.jobId)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              {(download.status === 'downloading' || download.status === 'preparing') && (
                <div className="space-y-2">
                  <Progress value={download.progress} className="h-2" />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>{download.progress}%</span>
                    <span>{getStatusText(download.status)}</span>
                  </div>
                </div>
              )}
              
              {download.status === 'complete' && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Download completed successfully</span>
                </div>
              )}
              
              {download.status === 'error' && download.error && (
                <div className="flex items-start gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  <span>{download.error}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const DownloadProgressIndicator: React.FC<DownloadProgressIndicatorProps> = (props) => {
  return props.showMini ? (
    <MiniDownloadIndicator {...props} />
  ) : (
    <FullDownloadIndicator {...props} />
  );
};

export default DownloadProgressIndicator;