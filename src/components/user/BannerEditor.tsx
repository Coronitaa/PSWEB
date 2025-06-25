
"use client";

import React, { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import type { Point, Area } from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { getCroppedImg } from './cropImage';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BannerEditorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string | null;
  onSave: (croppedImage: string) => void;
}

export function BannerEditor({ isOpen, onOpenChange, imageSrc: originalImageSrc, onSave }: BannerEditorProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const [proxiedImageSrc, setProxiedImageSrc] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      if (originalImageSrc) {
        if (originalImageSrc.startsWith('http')) {
          setProxiedImageSrc(`/api/image-proxy?imageUrl=${encodeURIComponent(originalImageSrc)}`);
        } else {
          setProxiedImageSrc(originalImageSrc);
        }
      } else {
        setProxiedImageSrc(null);
      }
    } else {
      setProxiedImageSrc(null);
    }
  }, [isOpen, originalImageSrc]);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels || !proxiedImageSrc) return;
    setIsSaving(true);
    try {
      const croppedImage = await getCroppedImg(proxiedImageSrc, croppedAreaPixels);
      if (croppedImage) {
        onSave(croppedImage);
        onOpenChange(false);
      }
    } catch (e: any) {
      toast({
        title: "Cannot Process Image",
        description: "The image could not be loaded, even through our proxy. The source might be blocking automated requests or the URL is invalid.",
        variant: "destructive",
        duration: 8000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Edit Banner</DialogTitle>
        </DialogHeader>
        <div className="relative h-64 w-full bg-muted">
          {proxiedImageSrc ? (
            <Cropper
              image={proxiedImageSrc}
              crop={crop}
              zoom={zoom}
              aspect={4 / 1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              cropShape="rect"
              showGrid={false}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </div>
        <div className="p-6 pt-2">
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.1}
            onValueChange={(value) => setZoom(value[0])}
            disabled={!proxiedImageSrc}
          />
        </div>
        <DialogFooter className="p-6 pt-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !proxiedImageSrc}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
    