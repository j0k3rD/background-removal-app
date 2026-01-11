'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Download, X, Image as ImageIcon, FileText, Check, AlertCircle, Sparkles, Maximize2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { ImageCompare } from '@/components/ui-comparison/image-compare'
import { VectorDisplay } from '@/components/ui-comparison/vector-display'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const MAX_IMAGES = 10

type TaskType = 'remove_background' | 'vectorize'
type ScaleType = 2 | 4 | 8
type ProcessingStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILURE'

interface UploadResponse {
  task_id: string
  filename: string
  output_filename: string
  task_type: TaskType
}

interface StatusResponse {
  status: ProcessingStatus
  result: string | number | null
}

interface ImageProcess {
  file: File
  taskId: string | null
  status: ProcessingStatus | null
  originalUrl: string | null
  processedUrl: string | null
  progress: number
  error: string | null
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TaskType>('remove_background')
  const [removeBgImages, setRemoveBgImages] = useState<ImageProcess[]>([])
  const [vectorizeImages, setVectorizeImages] = useState<ImageProcess[]>([])
  const [scale, setScale] = useState<ScaleType>(4)
  const [enhanceBeforeVectorize, setEnhanceBeforeVectorize] = useState(false)

  const getImages = (taskType: TaskType) =>
    taskType === 'remove_background' ? removeBgImages : vectorizeImages

  const setImages = (taskType: TaskType, images: ImageProcess[] | ((prev: ImageProcess[]) => ImageProcess[])) => {
    if (taskType === 'remove_background') {
      setRemoveBgImages(images)
    } else {
      setVectorizeImages(images)
    }
  }

  const handleUpload = useCallback(async (file: File, taskType: TaskType) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('task_type', taskType)
    formData.append('scale', scale.toString())
    formData.append('enhance_before', enhanceBeforeVectorize.toString())

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

      setImages(taskType, (prev: ImageProcess[]) => prev.map(img => {
        if (img.file.name === file.name) {
          return {
            ...img,
            taskId: data.task_id,
            status: 'PENDING',
            originalUrl: `${API_URL}/original/${data.filename}`
          }
        }
        return img
      }))
    } catch (err) {
      console.error('Error uploading file:', err)
      const errorMsg = err instanceof Error ? err.message : 'Error uploading file'
      setImages(taskType, (prev: ImageProcess[]) => prev.map(img => {
        if (img.file.name === file.name) {
          return { ...img, error: errorMsg }
        }
        return img
      }))
    }
  }, [scale, enhanceBeforeVectorize])

  const onDropRemoveBg = useCallback(async (acceptedFiles: File[]) => {
    const images = getImages('remove_background')
    const newImages: ImageProcess[] = acceptedFiles.map(file => ({
      file,
      taskId: null,
      status: null as ProcessingStatus | null,
      originalUrl: null,
      processedUrl: null,
      progress: 0,
      error: null
    }))
    
    setRemoveBgImages([...images, ...newImages])
    
    for (const file of acceptedFiles) {
      await handleUpload(file, 'remove_background')
    }
  }, [handleUpload])

  const onDropVectorize = useCallback(async (acceptedFiles: File[]) => {
    const images = getImages('vectorize')
    const newImages: ImageProcess[] = acceptedFiles.map(file => ({
      file,
      taskId: null,
      status: null as ProcessingStatus | null,
      originalUrl: null,
      processedUrl: null,
      progress: 0,
      error: null
    }))

    setVectorizeImages([...images, ...newImages])

    for (const file of acceptedFiles) {
      await handleUpload(file, 'vectorize')
    }
  }, [handleUpload])

  const { getRootProps: getRemoveBgRootProps, getInputProps: getRemoveBgInputProps, isDragActive: isRemoveBgActive } = useDropzone({
    onDrop: onDropRemoveBg,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxSize: 100 * 1024 * 1024,
    multiple: true,
    maxFiles: MAX_IMAGES,
  })

  const { getRootProps: getVectorizeRootProps, getInputProps: getVectorizeInputProps, isDragActive: isVectorizeActive } = useDropzone({
    onDrop: onDropVectorize,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxSize: 100 * 1024 * 1024,
    multiple: true,
    maxFiles: MAX_IMAGES,
  })

  useEffect(() => {
    const checkStatus = async (taskId: string, taskType: TaskType) => {
      try {
        const response = await fetch(`${API_URL}/status/${taskId}`)
        if (!response.ok) return

        const data: StatusResponse = await response.json()

        setImages(taskType, (prev: ImageProcess[]) => prev.map(img => {
          if (img.taskId === taskId) {
            const updates: Partial<ImageProcess> = { status: data.status }

            if (data.status === 'PROCESSING' && typeof data.result === 'number') {
              updates.progress = data.result
            }

            if (data.status === 'SUCCESS' && typeof data.result === 'string') {
              updates.processedUrl = `${API_URL}/result/${data.result}`
              updates.progress = 100
            }

            if (data.status === 'FAILURE') {
              updates.error = 'Error processing image'
              updates.status = null
            }

            return { ...img, ...updates }
          }
          return img
        }))
      } catch (err) {
        console.error('Error checking status:', err)
      }
    }

    const checkAllStatuses = (taskType: TaskType) => {
      const images = getImages(taskType)
      images.forEach(img => {
        if (img.taskId && (img.status === 'PENDING' || img.status === 'PROCESSING')) {
          checkStatus(img.taskId, taskType)
        }
      })
    }

    const intervalRemoveBg = setInterval(() => checkAllStatuses('remove_background'), 2000)
    const intervalVectorize = setInterval(() => checkAllStatuses('vectorize'), 2000)

    return () => {
      clearInterval(intervalRemoveBg)
      clearInterval(intervalVectorize)
    }
  }, [removeBgImages, vectorizeImages])

  const handleRemoveImage = useCallback((index: number, taskType: TaskType) => {
    setImages(taskType, prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleDownload = useCallback(async (url: string, filename: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('Error downloading file:', error)
      window.open(url, '_blank')
    }
  }, [])

  const renderImageCard = (img: ImageProcess, index: number, taskType: TaskType) => {
    const isVectorize = taskType === 'vectorize'
    const isProcessing = img.status === 'PENDING' || img.status === 'PROCESSING'
    const isSuccess = img.status === 'SUCCESS'
    const hasError = img.error !== null

    return (
      <Card key={index} className="border-none shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {isSuccess ? (
                <div className="p-2 bg-green-500/10 rounded-lg shrink-0">
                  <Check className="h-4 w-4 text-green-500" />
                </div>
              ) : hasError ? (
                <div className="p-2 bg-red-500/10 rounded-lg shrink-0">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                </div>
              ) : (
                <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                  {isVectorize ? (
                    <FileText className="h-4 w-4 text-primary" />
                  ) : (
                    <ImageIcon className="h-4 w-4 text-primary" />
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{img.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(img.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveImage(index, taskType)}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {hasError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{img.error}</p>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                {img.status === 'PENDING' && 'Waiting to process...'}
                {img.status === 'PROCESSING' && `Processing... ${img.progress}%`}
              </div>
              <Progress value={img.progress} className="h-2" />
            </div>
          )}

          {img.originalUrl && isSuccess && img.processedUrl && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">
                  {isVectorize ? 'SVG Result' : 'Compare images'}
                </Badge>
                <Button
                  size="sm"
                  onClick={() => handleDownload(
                    img.processedUrl!,
                    img.file.name.replace(/\.[^/.]+$/, isVectorize ? '.svg' : '.png')
                  )}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download {isVectorize ? 'SVG' : 'PNG'}
                </Button>
              </div>
              {isVectorize ? (
                <VectorDisplay svgUrl={img.processedUrl} originalUrl={img.originalUrl || undefined} filename={img.file.name} />
              ) : (
                <ImageCompare
                  leftImage={img.originalUrl}
                  rightImage={img.processedUrl}
                  leftLabel="Original"
                  rightLabel="No Background"
                />
              )}
            </div>
          )}

          {img.originalUrl && !img.processedUrl && !isProcessing && (
            <div className="aspect-video rounded-lg border bg-muted/10 overflow-hidden">
              <img
                src={img.originalUrl}
                alt="Original"
                className="w-full h-full object-contain"
              />
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const canUpload = (taskType: TaskType) => {
    const images = getImages(taskType)
    return images.length < MAX_IMAGES
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="flex justify-end mb-8">
          <ThemeToggle />
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TaskType)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-muted/50">
            <TabsTrigger value="remove_background" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <ImageIcon className="h-4 w-4 mr-2" />
              Remove BG
            </TabsTrigger>
            <TabsTrigger value="vectorize" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <FileText className="h-4 w-4 mr-2" />
              Vectorize
            </TabsTrigger>
          </TabsList>

          <TabsContent value="remove_background" className="space-y-6">
            {canUpload('remove_background') && (
              <Card className="border-none shadow-lg">
                <CardContent className="p-8">
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
                          {isRemoveBgActive ? 'Drop images here' : 'Upload images'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Drag and drop or click to browse (up to {MAX_IMAGES} images)
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        JPG, PNG, WEBP up to 100MB each
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {removeBgImages.length > 0 && (
              <div className="grid gap-4">
                {removeBgImages.map((img, index) => renderImageCard(img, index, 'remove_background'))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="vectorize" className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Enhance before vectorize</span>
                  </div>
                  <Button
                    variant={enhanceBeforeVectorize ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEnhanceBeforeVectorize(!enhanceBeforeVectorize)}
                  >
                    {enhanceBeforeVectorize ? 'ON' : 'OFF'}
                  </Button>
                </div>
                {enhanceBeforeVectorize && (
                  <div className="flex items-center gap-2">
                    <Maximize2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Upscale: </span>
                    <div className="flex gap-1">
                      {[2, 4, 8].map((s) => (
                        <Button
                          key={s}
                          variant={scale === s ? "default" : "outline"}
                          size="sm"
                          onClick={() => setScale(s as ScaleType)}
                          className="h-7 px-3 text-xs"
                        >
                          {s}x
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {canUpload('vectorize') && (
              <Card className="border-none shadow-lg">
                <CardContent className="p-8">
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
                          {isVectorizeActive ? 'Drop images here' : 'Upload images to vectorize'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {enhanceBeforeVectorize
                            ? `Enhance (${scale}x) then convert to SVG vectors (up to ${MAX_IMAGES} images)`
                            : `Convert to high-quality SVG vectors (up to ${MAX_IMAGES} images)`
                          }
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        JPG, PNG, WEBP up to 100MB each
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {vectorizeImages.length > 0 && (
              <div className="grid gap-4">
                {vectorizeImages.map((img, index) => renderImageCard(img, index, 'vectorize'))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}