
'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { Palette, Settings2 } from 'lucide-react'
import { useMemo, useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { HexColorPicker } from "react-colorful";


const GRADIENT_DIRECTIONS = [
  { value: 'to top left', label: 'To Top Left' },
  { value: 'to top', label: 'To Top' },
  { value: 'to top right', label: 'To Top Right' },
  { value: 'to left', label: 'To Left' },
  { value: 'to right', label: 'To Right' },
  { value: 'to bottom left', label: 'To Bottom Left' },
  { value: 'to bottom', label: 'To Bottom' },
  { value: 'to bottom right', label: 'To Bottom Right' },
] as const;

type GradientDirection = typeof GRADIENT_DIRECTIONS[number]['value'];

// New CustomColorPicker component
const CustomColorPicker = ({
  color,
  setColor,
}: {
  color: string
  setColor: (color: string) => void
}) => {
  return (
    <div className="space-y-2 p-2 w-full flex flex-col items-center">
      <HexColorPicker color={color} onChange={setColor} />
      <Input
        id="custom-color-input"
        value={color}
        className="h-8 mt-2"
        onChange={(e) => setColor(e.currentTarget.value)}
        placeholder="#RRGGBB"
      />
    </div>
  )
}

function parseGradient(gradient: string): { direction: GradientDirection, color1: string, color2: string } | null {
  if (!gradient.startsWith('linear-gradient')) return null;

  try {
    const parts = gradient.match(/linear-gradient\((.+?),\s*([^,]+),\s*([^,)]+)\)/);
    if (!parts || parts.length < 4) return null;
    
    const direction = parts[1].trim() as GradientDirection;
    const color1 = parts[2].trim();
    const color2 = parts[3].trim();
    
    if (!GRADIENT_DIRECTIONS.some(d => d.value === direction)) return null;

    return { direction, color1, color2 };
  } catch (e) {
    return null;
  }
}

export function GradientPicker({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (background: string) => void
  className?: string
}) {
  const solids = [
    '#FFFFFF',
    '#000000',
    '#E2E2E2',
    '#ff75c3',
    '#ffa647',
    '#ffe83f',
    '#9fff5b',
    '#70e2ff',
    '#cd93ff',
  ]

  const gradients = [
    'linear-gradient(to top left,#accbee,#e7f0fd)',
    'linear-gradient(to top left,#d5d4d0,#d5d4d0,#eeeeec)',
    'linear-gradient(to top left,#000000,#434343)',
    'linear-gradient(to top left,#09203f,#537895)',
    'linear-gradient(to top left,#AC32E4,#7918F2,#4801FF)',
    'linear-gradient(to top left,#f953c6,#b91d73)',
    'linear-gradient(to top left,#ee0979,#ff6a00)',
    'linear-gradient(to top left,#F00000,#DC281E)',
    'linear-gradient(to top left,#00c6ff,#0072ff)',
    'linear-gradient(to top left,#4facfe,#00f2fe)',
    'linear-gradient(to top left,#0ba360,#3cba92)',
    'linear-gradient(to top left,#FDFC47,#24FE41)',
  ]

  const defaultTab = useMemo(() => {
    if (value && value.includes('gradient')) return 'gradient'
    return 'solid'
  }, [value])
  
  // State for the custom gradient modal
  const [isGradientModalOpen, setIsGradientModalOpen] = useState(false);
  const [gradientDirection, setGradientDirection] = useState<GradientDirection>('to top left');
  const [gradientColor1, setGradientColor1] = useState('#ffffff');
  const [gradientColor2, setGradientColor2] = useState('#000000');

  // When the modal opens, initialize its state from the current editor value
  useEffect(() => {
    if (isGradientModalOpen) {
      if (value && value.includes('gradient')) {
        const parsed = parseGradient(value);
        if (parsed) {
          setGradientDirection(parsed.direction);
          setGradientColor1(parsed.color1);
          setGradientColor2(parsed.color2);
        }
      } else {
        // Default values if current value is not a gradient
        setGradientDirection('to top left');
        setGradientColor1('#ffffff');
        setGradientColor2('#000000');
      }
    }
  }, [isGradientModalOpen, value]);
  
  const handleApplyCustomGradient = () => {
    const newGradient = `linear-gradient(${gradientDirection},${gradientColor1},${gradientColor2})`;
    onChange(newGradient);
    setIsGradientModalOpen(false);
  }

  const solidColorValue = useMemo(() => {
    return value && !value.includes('gradient') ? value : '#FFFFFF';
  }, [value]);

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={'ghost'}
            size="icon"
            className={cn('h-8 w-8 p-1.5 relative', className)}
          >
            <Palette className="h-4 w-4"/>
             <div
                className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border border-card !bg-center !bg-cover transition-all"
                style={{ background: value }}
              ></div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="w-full mb-2">
              <TabsTrigger className="flex-1" value="solid">
                Solid
              </TabsTrigger>
              <TabsTrigger className="flex-1" value="gradient">
                Gradient
              </TabsTrigger>
            </TabsList>

            <TabsContent value="solid" className="flex flex-col gap-3 mt-0 p-1">
                <CustomColorPicker color={solidColorValue} setColor={onChange} />
            </TabsContent>

            <TabsContent value="gradient" className="mt-0 p-1 space-y-2">
              <div className="flex flex-wrap gap-1">
                {gradients.map((s) => (
                  <div
                    key={s}
                    style={{ background: s }}
                    className="rounded-md h-6 w-6 cursor-pointer active:scale-105"
                    onClick={() => onChange(s)}
                  />
                ))}
              </div>
               <Button variant="outline" size="sm" className="w-full" onClick={() => setIsGradientModalOpen(true)}>
                  <Settings2 className="w-4 h-4 mr-2" /> Custom Gradient
              </Button>
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>
      
      {/* Custom Gradient Modal */}
      <Dialog open={isGradientModalOpen} onOpenChange={setIsGradientModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Create Custom Gradient</DialogTitle>
                <DialogDescription>
                    Choose two colors and a direction to create your custom gradient.
                </DialogDescription>
            </DialogHeader>
             <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="gradient-direction">Direction</Label>
                <Select value={gradientDirection} onValueChange={(dir: GradientDirection) => setGradientDirection(dir)}>
                  <SelectTrigger id="gradient-direction" className="mt-1">
                    <SelectValue placeholder="Direction" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADIENT_DIRECTIONS.map(dir => (
                        <SelectItem key={dir.value} value={dir.value}>{dir.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <Label htmlFor="gradient-color-1">Color 1</Label>
                      <div className="flex items-center gap-2 mt-1">
                          <Popover>
                              <PopoverTrigger asChild>
                                  <Button variant="ghost" className="h-10 w-12 p-1 border">
                                      <div className="w-full h-full rounded-sm" style={{ background: gradientColor1 }} />
                                  </Button>
                              </PopoverTrigger>
                              <PopoverContent className="p-0 w-auto">
                                  <CustomColorPicker color={gradientColor1} setColor={setGradientColor1} />
                              </PopoverContent>
                          </Popover>
                          <Input id="gradient-color-1-text" className="h-10" value={gradientColor1} onChange={(e) => setGradientColor1(e.target.value)} />
                      </div>
                  </div>
                   <div>
                      <Label htmlFor="gradient-color-2">Color 2</Label>
                      <div className="flex items-center gap-2 mt-1">
                          <Popover>
                              <PopoverTrigger asChild>
                                  <Button variant="ghost" className="h-10 w-12 p-1 border">
                                      <div className="w-full h-full rounded-sm" style={{ background: gradientColor2 }} />
                                  </Button>
                              </PopoverTrigger>
                              <PopoverContent className="p-0 w-auto">
                                  <CustomColorPicker color={gradientColor2} setColor={setGradientColor2} />
                              </PopoverContent>
                          </Popover>
                          <Input id="gradient-color-2-text" className="h-10" value={gradientColor2} onChange={(e) => setGradientColor2(e.target.value)} />
                      </div>
                  </div>
              </div>
               <div>
                  <Label>Preview</Label>
                   <div 
                      className="w-full h-16 rounded-md mt-1 border" 
                      style={{ background: `linear-gradient(${gradientDirection}, ${gradientColor1}, ${gradientColor2})` }}
                   />
               </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="button" onClick={handleApplyCustomGradient}>Apply Gradient</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
