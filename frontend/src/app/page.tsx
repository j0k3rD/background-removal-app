'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Loader2, Download, X, Image as ImageIcon, FileText } from 'lucide-react'
import ImageCompare from 'react-compare-image'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.100.80:8000'

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
  const [taskType, setTaskType] = useState<TaskType>('remove_background')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [status, setStatus] = useState<StatusResponse['status'] | null>(null)
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [processedImage, setProcessedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number>(0)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setError(null)
    setUploadedFile(file)
    setStatus(null)
    setOriginalImage(null)
    setProcessedImage(null)
    setProgress(0)

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
      setTaskId(data.task_id)
      setStatus('PENDING')
      setOriginalImage(`${API_URL}/original/${data.filename}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error uploading file')
      setUploadedFile(null)
    }
  }, [taskType])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
    },
    maxSize: 100 * 1024 * 1024,
    multiple: false,
  })

  useEffect(() => {
    if (!taskId) return

    const checkStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/status/${taskId}`)
        if (!response.ok) return

        const data: StatusResponse = await response.json()
        setStatus(data.status)

        if (data.status === 'PROCESSING' && typeof data.result === 'number') {
          setProgress(data.result)
        }

        if (data.status === 'SUCCESS' && typeof data.result === 'string') {
          setProcessedImage(`${API_URL}/result/${data.result}`)
          setProgress(100)
        }

        if (data.status === 'FAILURE') {
          setError('Error processing image')
          setStatus(null)
        }
      } catch (err) {
        console.error('Error checking status:', err)
      }
    }

    const interval = setInterval(checkStatus, 2000)
    checkStatus()

    return () => clearInterval(interval)
  }, [taskId])

  const handleReset = () => {
    setUploadedFile(null)
    setTaskId(null)
    setStatus(null)
    setOriginalImage(null)
    setProcessedImage(null)
    setError(null)
    setProgress(0)
  }

  const isVectorize = taskType === 'vectorize'

  const handleDownload = () => {
    if (processedImage) {
      window.open(processedImage, '_blank')
    }
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">
          Procesador de Imágenes con IA
        </h1>

        <div className="mb-8 flex justify-center gap-4">
          <button
            onClick={() => setTaskType('remove_background')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
              taskType === 'remove_background'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ImageIcon className="h-5 w-5" />
            Eliminar Fondo
          </button>
          <button
            onClick={() => setTaskType('vectorize')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
              taskType === 'vectorize'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FileText className="h-5 w-5" />
            Vectorizar a SVG
          </button>
        </div>

        {!uploadedFile && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg text-gray-600 mb-2">
              {isDragActive
                ? 'Suelta la imagen aquí'
                : isVectorize
                ? 'Arrastra una imagen para vectorizar a SVG'
                : 'Arrastra una imagen para eliminar el fondo'}
            </p>
            <p className="text-sm text-gray-500">
              Formatos: JPG, PNG, WEBP (máx. 100MB)
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {uploadedFile && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">
                {isVectorize ? 'Vectorizando imagen...' : 'Eliminando fondo...'}
              </h2>
              <button
                onClick={handleReset}
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {status && status !== 'SUCCESS' && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                  <span className="text-sm text-gray-600">
                    {status === 'PENDING' && 'En cola...'}
                    {status === 'PROCESSING' && `Procesando... ${progress}%`}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {originalImage && processedImage && (
              <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">Resultado</h3>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Descargar {isVectorize ? 'SVG' : 'PNG'}
                  </button>
                </div>
                {isVectorize ? (
                  <div className="border rounded-lg overflow-hidden bg-white">
                    <img
                      src={processedImage}
                      alt="SVG Result"
                      className="w-full h-auto"
                    />
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden bg-white">
                    <ImageCompare
                      leftImage={originalImage}
                      rightImage={processedImage}
                      sliderLineWidth={2}
                      sliderLineColor="#3b82f6"
                    />
                  </div>
                )}
              </div>
            )}

            {originalImage && !processedImage && (
              <div className="mt-8">
                <h3 className="text-xl font-semibold mb-4">Imagen original</h3>
                <div className="border rounded-lg overflow-hidden bg-white">
                  <img
                    src={originalImage}
                    alt="Original"
                    className="w-full h-auto"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
