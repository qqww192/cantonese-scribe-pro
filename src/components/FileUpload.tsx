import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Upload, FileAudio, Video, Link, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const FileUpload = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => {
      const isValidType = file.type.startsWith('audio/') || file.type.startsWith('video/');
      if (!isValidType) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported audio or video file.`,
          variant: "destructive"
        });
        return false;
      }
      return true;
    });
    
    setFiles(prev => [...prev, ...validFiles]);
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.aac'],
      'video/*': ['.mp4', '.mov', '.avi', '.mkv']
    },
    multiple: true
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      // Here you would validate and process the URL
      toast({
        title: "URL added",
        description: "Media URL has been added for processing.",
        variant: "default"
      });
      setUrlInput("");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* File Upload Area */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2 font-ui">
              {isDragActive ? 'Drop your files here' : 'Upload Audio or Video Files'}
            </h3>
            <p className="text-muted-foreground mb-4 font-ui">
              Drag and drop your MP3, MP4, or other media files here, or click to browse
            </p>
            <Button variant="outline" className="font-ui">
              Choose Files
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* URL Input */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 font-ui flex items-center">
            <Link className="mr-2 h-5 w-5" />
            Or paste a media URL
          </h3>
          <div className="flex space-x-2">
            <Input
              placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 font-ui"
            />
            <Button onClick={handleUrlSubmit} disabled={!urlInput.trim()} className="font-ui">
              Add URL
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2 font-ui">
            Supports YouTube, Vimeo, and direct media links
          </p>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 font-ui">Selected Files</h3>
            <div className="space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    {file.type.startsWith('audio/') ? (
                      <FileAudio className="h-5 w-5 text-accent" />
                    ) : (
                      <Video className="h-5 w-5 text-accent" />
                    )}
                    <div>
                      <p className="font-medium font-ui">{file.name}</p>
                      <p className="text-sm text-muted-foreground font-ui">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <Button className="w-full font-ui" disabled={files.length === 0}>
                Start Transcription ({files.length} file{files.length !== 1 ? 's' : ''})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FileUpload;