'use client'

import { useState, useTransition, useRef } from 'react'
import Image from 'next/image'
import {
  Upload, Trash2, Image as ImageIcon, X, FileText,
  ChevronDown, ChevronUp, Save, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  uploadCaseImageAction, deleteCaseImageAction, updateImageFindingsAction,
} from '@/app/(dashboard)/[workspace]/cases/actions'
import { INVESTIGATION_CATEGORIES, IMAGING_MODALITIES } from '@/config/app'
import type { CaseImagingRow, WorkspaceRole } from '@/types/database'

interface ImagingGalleryProps {
  images: CaseImagingRow[]
  caseId: string
  workspaceId: string
  workspaceSlug: string
  role: WorkspaceRole
  authorId: string
  currentUserId: string
}

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  INVESTIGATION_CATEGORIES.map((c) => [c.value, c.label])
)

function isPdf(fileName: string) {
  return fileName.toLowerCase().endsWith('.pdf')
}

export function ImagingGallery({
  images: initialImages,
  caseId,
  workspaceId,
  workspaceSlug,
  role,
  authorId,
  currentUserId,
}: ImagingGalleryProps) {
  const [images, setImages] = useState(initialImages)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [caption, setCaption] = useState('')
  const [modality, setModality] = useState('')
  const [category, setCategory] = useState('radiology')
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  // Findings editing
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [findingsText, setFindingsText] = useState('')
  const [savingFindings, setSavingFindings] = useState(false)

  const canEdit =
    role === 'admin' || role === 'editor' ||
    (role === 'contributor' && authorId === currentUserId)

  const filteredImages = activeCategory === 'all'
    ? images
    : images.filter((img) => img.category === activeCategory)

  const categoryCounts = images.reduce<Record<string, number>>((acc, img) => {
    acc[img.category] = (acc[img.category] || 0) + 1
    return acc
  }, {})

  const handleUpload = () => {
    if (!selectedFile) return
    startTransition(async () => {
      const fd = new FormData()
      fd.set('file', selectedFile)
      if (caption) fd.set('caption', caption)
      if (modality) fd.set('modality', modality)
      fd.set('category', category)

      const result = await uploadCaseImageAction(caseId, workspaceId, workspaceSlug, fd)
      if (result.error) { toast.error(result.error); return }
      toast.success('File uploaded')
      setUploadOpen(false)
      setSelectedFile(null)
      setCaption('')
      setModality('')
      setCategory('radiology')
      window.location.reload()
    })
  }

  const handleDelete = (image: CaseImagingRow) => {
    if (!confirm('Delete this file?')) return
    startTransition(async () => {
      const result = await deleteCaseImageAction(image.id, image.storage_path, workspaceId, caseId, workspaceSlug)
      if (result.error) { toast.error(result.error); return }
      setImages((prev) => prev.filter((img) => img.id !== image.id))
      toast.success('File deleted')
    })
  }

  const toggleFindings = (image: CaseImagingRow) => {
    if (expandedId === image.id) {
      setExpandedId(null)
    } else {
      setExpandedId(image.id)
      setFindingsText(image.findings ?? '')
    }
  }

  const handleSaveFindings = async (imageId: string) => {
    setSavingFindings(true)
    const result = await updateImageFindingsAction(imageId, workspaceId, caseId, workspaceSlug, findingsText)
    setSavingFindings(false)
    if (result.error) { toast.error(result.error); return }
    setImages((prev) =>
      prev.map((img) => img.id === imageId ? { ...img, findings: findingsText || null } : img)
    )
    toast.success('Findings saved')
  }

  return (
    <div className="space-y-4">
      {/* Category filters + upload */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant={activeCategory === 'all' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setActiveCategory('all')}
        >
          All ({images.length})
        </Badge>
        {INVESTIGATION_CATEGORIES.map((cat) => (
          <Badge
            key={cat.value}
            variant={activeCategory === cat.value ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setActiveCategory(cat.value)}
          >
            {cat.label} ({categoryCounts[cat.value] ?? 0})
          </Badge>
        ))}

        {canEdit && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-7 ml-auto"
            onClick={() => setUploadOpen(true)}
          >
            <Upload className="h-3.5 w-3.5" />
            Upload
          </Button>
        )}
      </div>

      {/* Gallery */}
      {filteredImages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center rounded-lg border border-dashed border-border">
          <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {activeCategory === 'all'
              ? 'No investigations uploaded yet'
              : `No ${CATEGORY_LABELS[activeCategory]?.toLowerCase() ?? 'files'} uploaded`}
          </p>
          {canEdit && (
            <Button variant="link" size="sm" className="mt-1 text-xs" onClick={() => setUploadOpen(true)}>
              Upload your first file
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredImages.map((img) => {
            const pdf = isPdf(img.file_name)
            const isExpanded = expandedId === img.id
            return (
              <div key={img.id} className="group rounded-lg border border-border bg-card overflow-hidden">
                {/* Thumbnail / File preview */}
                <div className="relative">
                  {pdf ? (
                    <a
                      href={img.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center h-36 bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="text-center">
                        <FileText className="h-10 w-10 text-red-500 mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground truncate max-w-[160px] px-2">{img.file_name}</p>
                      </div>
                    </a>
                  ) : (
                    <div className="aspect-[4/3] relative bg-muted/20">
                      <Image
                        src={img.file_url}
                        alt={img.caption ?? img.file_name}
                        fill
                        className="object-cover"
                        sizes="300px"
                      />
                    </div>
                  )}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleDelete(img)}
                      className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-background/80 border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:border-destructive hover:text-white"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Info bar */}
                <div className="px-3 py-2 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {img.modality && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{img.modality}</Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {CATEGORY_LABELS[img.category] ?? img.category}
                    </Badge>
                  </div>
                  {img.caption && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{img.caption}</p>
                  )}

                  {/* Findings toggle */}
                  <button
                    type="button"
                    onClick={() => toggleFindings(img)}
                    className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                  >
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {img.findings ? 'Findings' : (canEdit ? 'Add findings' : 'No findings')}
                  </button>
                </div>

                {/* Expanded findings */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
                    {canEdit ? (
                      <>
                        <Textarea
                          value={findingsText}
                          onChange={(e) => setFindingsText(e.target.value)}
                          placeholder="Describe findings for this investigation..."
                          className="min-h-[60px] text-xs resize-y"
                        />
                        <Button
                          size="sm"
                          className="h-6 text-xs gap-1"
                          onClick={() => handleSaveFindings(img.id)}
                          disabled={savingFindings}
                        >
                          {savingFindings ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                          Save
                        </Button>
                      </>
                    ) : (
                      <p className="text-xs text-foreground/80 whitespace-pre-wrap">
                        {img.findings || 'No findings recorded.'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Investigation File</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div
              className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {selectedFile ? (
                <div className="flex items-center gap-2 text-sm">
                  {selectedFile.type === 'application/pdf'
                    ? <FileText className="h-4 w-4 text-red-500" />
                    : <ImageIcon className="h-4 w-4 text-primary" />}
                  <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null) }}
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click to select file</p>
                  <p className="text-xs text-muted-foreground mt-1">Images (JPEG, PNG, WebP) or PDF · Max 10MB</p>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVESTIGATION_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Modality</Label>
                <Select value={modality} onValueChange={setModality}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGING_MODALITIES.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Caption</Label>
                <Input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Describe the file"
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleUpload} disabled={!selectedFile || isPending}>
              {isPending ? 'Uploading…' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
