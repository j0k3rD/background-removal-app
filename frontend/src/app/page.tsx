'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Download, X, Image as ImageIcon, FileText, Sparkles } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { ImageCompare } from '@/components/ui-comparison/image-compare'
import { VectorDisplay } from '@/components/ui-comparison/vector-display'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type TaskType = 'remove_background' | 'vectorize'

interface UploadResponse {
  task_id: string
  filename: string
  output_filename: string
  task_type: TaskType
}

interface StatusResponse {
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILURE'
  result: string | number | null
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TaskType>('remove_background')
  const [removeBgFile, setRemoveBgFile] = useState<File | null>(null)
  const [vectorizeFile, setVectorizeFile] = useState<File | null>(null)
  const [removeBgTaskId, setRemoveBgTaskId] = useState<string | null>(null)
  const [vectorizeTaskId, setVectorizeTaskId] = useState<string | null>(null)
  const [removeBgStatus, setRemoveBgStatus] = useState<StatusResponse['status'] | null>(null)
  const [vectorizeStatus, setVectorizeStatus] = useState<StatusResponse['status'] | null>(null)
  const [removeBgOriginal, setRemoveBgOriginal] = useState<string | null>(null)
  const [vectorizeOriginal, setVectorizeOriginal] = useState<string | null>(null)
  const [removeBgProcessed, setRemoveBgProcessed] = useState<string | null>(null)
  const [vectorizeProcessed, setVectorizeProcessed] = useState<string | null>(null)
  const [removeBgProgress, setRemoveBgProgress] = useState<number>(0)
  const [vectorizeProgress, setVectorizeProgress] = useState<number>(0)

  const handleUpload = useCallback(async (file: File, taskType: TaskType) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('task_type', taskType)

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Error uploading file')
      }

      const data: UploadResponse = await response.json()

      if (taskType === 'remove_background') {
        setRemoveBgTaskId(data.task_id)
        setRemoveBgStatus('PENDING')
        setRemoveBgOriginal(`${API_URL}/original/${data.filename}`)
      } else {
        setVectorizeTaskId(data.task_id)
        setVectorizeStatus('PENDING')
        setVectorizeOriginal(`${API_URL}/original/${data.filename}`)
      }
    } catch (err) {
      console.error('Error uploading file:', err)
      if (taskType === 'remove_background') {
        setRemoveBgFile(null)
      } else {
        setVectorizeFile(null)
      }
    }
  }, [])

  const onDropRemoveBg = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    setRemoveBgFile(file)
    setRemoveBgProgress(0)
    await handleUpload(file, 'remove_background')
  }, [handleUpload])

  const onDropVectorize = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    setVectorizeFile(file)
    setVectorizeProgress(0)
    await handleUpload(file, 'vectorize')
  }, [handleUpload])

  const { getRootProps: getRemoveBgRootProps, getInputProps: getRemoveBgInputProps, isDragActive: isRemoveBgActive } = useDropzone({
    onDrop: onDropRemoveBg,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxSize: 100 * 1024 * 1024,
    multiple: false,
  })

  const { getRootProps: getVectorizeRootProps, getInputProps: getVectorizeInputProps, isDragActive: isVectorizeActive } = useDropzone({
    onDrop: onDropVectorize,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxSize: 100 * 1024 * 1024,
    multiple: false,
  })

  useEffect(() => {
    const checkStatus = async (taskId: string, setStatus: (status: StatusResponse['status'] | null) => void, setProgress: (progress: number) => void, setProcessed: (url: string | null) => void, isVectorize: boolean) => {
      try {
        const response = await fetch(`${API_URL}/status/${taskId}`)
        if (!response.ok) return

        const data: StatusResponse = await response.json()
        setStatus(data.status)

        if (data.status === 'PROCESSING' && typeof data.result === 'number') {
          setProgress(data.result)
        }

        if (data.status === 'SUCCESS' && typeof data.result === 'string') {
          setProcessed(`${API_URL}/result/${data.result}`)
          setProgress(100)
        }

        if (data.status === 'FAILURE') {
          setStatus(null)
        }
      } catch (err) {
        console.error('Error checking status:', err)
      }
    }

    if (removeBgTaskId) {
      const interval = setInterval(() => {
        checkStatus(removeBgTaskId, setRemoveBgStatus, setRemoveBgProgress, setRemoveBgProcessed, false)
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [removeBgTaskId])

  useEffect(() => {
    const checkStatus = async (taskId: string, setStatus: (status: StatusResponse['status'] | null) => void, setProgress: (progress: number) => void, setProcessed: (url: string | null) => void, isVectorize: boolean) => {
      try {
        const response = await fetch(`${API_URL}/status/${taskId}`)
        if (!response.ok) return

        const data: StatusResponse = await response.json()
        setStatus(data.status)

        if (data.status === 'PROCESSING' && typeof data.result === 'number') {
          setProgress(data.result)
        }

        if (data.status === 'SUCCESS' && typeof data.result === 'string') {
          setProcessed(`${API_URL}/result/${data.result}`)
          setProgress(100)
        }

        if (data.status === 'FAILURE') {
          setStatus(null)
        }
      } catch (err) {
        console.error('Error checking status:', err)
      }
    }

    if (vectorizeTaskId) {
      const interval = setInterval(() => {
        checkStatus(vectorizeTaskId, setVectorizeStatus, setVectorizeProgress, setVectorizeProcessed, true)
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [vectorizeTaskId])

  const handleReset = useCallback((taskType: TaskType) => {
    if (taskType === 'remove_background') {
      setRemoveBgFile(null)
      setRemoveBgTaskId(null)
      setRemoveBgStatus(null)
      setRemoveBgOriginal(null)
      setRemoveBgProcessed(null)
      setRemoveBgProgress(0)
    } else {
      setVectorizeFile(null)
      setVectorizeTaskId(null)
      setVectorizeStatus(null)
      setVectorizeOriginal(null)
      setVectorizeProcessed(null)
      setVectorizeProgress(0)
    }
  }, [])

  const handleDownload = useCallback((url: string, filename: string) => {
    window.open(url, '_blank')
  }, [])

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Image Processor
            </h1>
          </div>
          <ThemeToggle />
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TaskType)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-muted/50">
            <TabsTrigger value="remove_background" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <ImageIcon className="h-4 w-4 mr-2" />
              Remove Background
            </TabsTrigger>
            <TabsTrigger value="vectorize" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <FileText className="h-4 w-4 mr-2" />
              Vectorize
            </TabsTrigger>
          </TabsList>

          <TabsContent value="remove_background" className="space-y-6">
            <Card className="border-none shadow-lg">
              <CardContent className="p-8">
                {!removeBgFile ? (
                  <div
                    {...getRemoveBgRootProps()}
                    className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 ${
                      isRemoveBgActive
                        ? 'border-primary bg-primary/5 scale-[1.02]'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <input {...getRemoveBgInputProps()} />
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-primary/10 rounded-full">
                        <Upload className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold mb-1">
                          {isRemoveBgActive ? 'Drop your image here' : 'Upload an image'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Drag and drop or click to browse
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        JPG, PNG, WEBP up to 100MB
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <ImageIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{removeBgFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(removeBgFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleReset('remove_background')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {removeBgStatus && removeBgStatus !== 'SUCCESS' && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                          {removeBgStatus === 'PENDING' && 'Waiting to process...'}
                          {removeBgStatus === 'PROCESSING' && `Processing image... ${removeBgProgress}%`}
                        </div>
                        <Progress value={removeBgProgress} className="h-2" />
                      </div>
                    )}

                    {removeBgOriginal && removeBgProcessed && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            Compare original vs processed
                          </Badge>
                          <Button
                            size="sm"
                            onClick={() => handleDownload(removeBgProcessed, removeBgFile.name)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download PNG
                          </Button>
                        </div>
                        <ImageCompare
                          leftImage={removeBgOriginal}
                          rightImage={removeBgProcessed}
                          leftLabel="Original"
                          rightLabel="No Background"
                        />
                      </div>
                    )}

                    {removeBgOriginal && !removeBgProcessed && (
                      <div className="aspect-video rounded-lg border bg-muted/10 overflow-hidden">
                        <img
                          src={removeBgOriginal}
                          alt="Original"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vectorize" className="space-y-6">
            <Card className="border-none shadow-lg">
              <CardContent className="p-8">
                {!vectorizeFile ? (
                  <div
                    {...getVectorizeRootProps()}
                    className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 ${
                      isVectorizeActive
                        ? 'border-primary bg-primary/5 scale-[1.02]'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <input {...getVectorizeInputProps()} />
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-primary/10 rounded-full">
                        <Upload className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold mb-1">
                          {isVectorizeActive ? 'Drop your image here' : 'Upload an image to vectorize'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Convert to high-quality SVG vector
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        JPG, PNG, WEBP up to 100MB
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{vectorizeFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(vectorizeFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleReset('vectorize')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {vectorizeStatus && vectorizeStatus !== 'SUCCESS' && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                          {vectorizeStatus === 'PENDING' && 'Waiting to process...'}
                          {vectorizeStatus === 'PROCESSING' && `Vectorizing... ${vectorizeProgress}%`}
                        </div>
                        <Progress value={vectorizeProgress} className="h-2" />
                      </div>
                    )}

                    {vectorizeOriginal && vectorizeProcessed && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            SVG Vector Result
                          </Badge>
                          <Button
                            size="sm"
                            onClick={() => handleDownload(vectorizeProcessed, vectorizeFile.name.replace(/\.[^/.]+$/, '.svg'))}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download SVG
                          </Button>
                        </div>
                        <VectorDisplay svgUrl={vectorizeProcessed} filename={vectorizeFile.name} />
                      </div>
                    )}

                    {vectorizeOriginal && !vectorizeProcessed && (
                      <div className="aspect-video rounded-lg border bg-muted/10 overflow-hidden">
                        <img
                          src={vectorizeOriginal}
                          alt="Original"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}