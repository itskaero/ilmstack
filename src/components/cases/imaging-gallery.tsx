'use client'

import { useState, useTransition, useRef } from 'react'
import Image from 'next/image'
import { Upload, Trash2, Image as ImageIcon, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { uploadCaseImageAction, deleteCaseImageAction } from '@/app/(dashboard)/[workspace]/cases/actions'
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
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [caption, setCaption] = useState('')
  const [modality, setModality] = useState('')
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  const canEdit =
    role === 'admin' ||
    role === 'editor' ||
    (role === 'contributor' && authorId === currentUserId)

  const handleUpload = () => {
    if (!selectedFile) return
    startTransition(async () => {
      const fd = new FormData()
      fd.set('file', selectedFile)
      if (caption) fd.set('caption', caption)
      if (modality) fd.set('modality', modality)

      const result = await uploadCaseImageAction(caseId, workspaceId, workspaceSlug, fd)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Image uploaded')
      setUploadOpen(false)
      setSelectedFile(null)
      setCaption('')
      setModality('')
    })
  }

  const handleDelete = (image: CaseImagingRow) => {
    if (!confirm('Delete this image?')) return
    startTransition(async () => {
      const result = await deleteCaseImageAction(
        image.id,
        image.storage_path,
        workspaceId,
        caseId,
        workspaceSlug
      )
      if (result.error) {
        toast.error(result.error)
        return
      }
      setImages((prev) => prev.filter((img) => img.id !== image.id))
      toast.success('Image deleted')
    })
  }

  return (
    <div className="space-y-4">
      {/* Upload button */}
      {canEdit && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs h-8"
          onClick={() => setUploadOpen(true)}
        >
          <Upload className="h-3.5 w-3.5" />
          Upload Image
        </Button>
      )}

      {/* Gallery grid */}
      {images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center rounded-lg border border-dashed border-border">
          <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No imaging uploaded yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((img) => (
            <div key={img.id} className="group relative rounded-lg overflow-hidden border border-border bg-muted/30">
              <div className="aspect-square relative">
                <Image
                  src={img.file_url}
                  alt={img.caption ?? img.file_name}
                  fill
                  className="object-cover"
                  sizes="200px"
                />
              </div>
              {(img.caption || img.modality) && (
                <div className="px-2 py-1.5 bg-background/90 text-xs">
                  {img.modality && (
                    <span className="font-medium text-primary mr-1">{img.modality}</span>
                  )}
                  {img.caption && (
                    <span className="text-muted-foreground line-clamp-1">{img.caption}</span>
                  )}
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
          ))}
        </div>
      )}

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Upload Case Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div
              className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {selectedFile ? (
                <div className="flex items-center gap-2 text-sm">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  <span className="truncate max-w-[180px]">{selectedFile.name}</span>
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
                  <p className="text-sm text-muted-foreground">Click to select image</p>
                  <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WebP · Max 10MB</p>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Modality (optional)</Label>
                <Input
                  value={modality}
                  onChange={(e) => setModality(e.target.value)}
                  placeholder="e.g. CT, MRI, X-ray"
                  className="h-7 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Caption (optional)</Label>
                <Input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Describe the image"
                  className="h-7 text-xs"
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
