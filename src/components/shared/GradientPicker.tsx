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
import { Palette, Pipette } from 'lucide-react'
import { useMemo, useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

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

  const [gradientDirection, setGradientDirection] = useState<GradientDirection>('to top left');
  const [gradientColor1, setGradientColor1] = useState('#ffffff');
  const [gradientColor2, setGradientColor2] = useState('#000000');

  useEffect(() => {
    if (value && value.includes('gradient')) {
      const parsed = parseGradient(value);
      if (parsed) {
        setGradientDirection(parsed.direction);
        setGradientColor1(parsed.color1);
        setGradientColor2(parsed.color2);
      }
    }
  }, [value]);

  const handleCustomGradientChange = (dir: GradientDirection, c1: string, c2: string) => {
    const newGradient = `linear-gradient(${dir},${c1},${c2})`;
    onChange(newGradient);
  }

  return (
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
      <PopoverContent className="w-72">
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger className="flex-1" value="solid">
              Solid
            </TabsTrigger>
            <TabsTrigger className="flex-1" value="gradient">
              Gradient
            </TabsTrigger>
          </TabsList>

          <TabsContent value="solid" className="flex flex-col gap-3 mt-0">
            <div className="flex flex-wrap gap-1">
              {solids.map((s) => (
                <div
                  key={s}
                  style={{ background: s }}
                  className="rounded-md h-6 w-6 cursor-pointer active:scale-105 border"
                  onClick={() => onChange(s)}
                />
              ))}
            </div>
            <div className='flex items-center gap-2'>
              <div className="relative">
                <Pipette className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="custom-solid"
                  type="color"
                  className="w-12 h-8 p-1 cursor-pointer"
                  value={value && !value.includes('gradient') ? value : '#000000'}
                  onChange={(e) => onChange(e.currentTarget.value)}
                />
              </div>
              <Input
                  id="custom-solid-text"
                  value={value && !value.includes('gradient') ? value : ''}
                  className="col-span-2 h-8"
                  onChange={(e) => onChange(e.currentTarget.value)}
                  placeholder="#RRGGBB"
              />
            </div>
          </TabsContent>

          <TabsContent value="gradient" className="mt-0">
            <div className="flex flex-wrap gap-1 mb-3">
              {gradients.map((s) => (
                <div
                  key={s}
                  style={{ background: s }}
                  className="rounded-md h-6 w-6 cursor-pointer active:scale-105"
                  onClick={() => onChange(s)}
                />
              ))}
            </div>
            <div className="space-y-3 p-1">
              <div>
                <Label htmlFor="gradient-direction" className="text-xs">Direction</Label>
                <Select value={gradientDirection} onValueChange={(dir: GradientDirection) => {
                    setGradientDirection(dir);
                    handleCustomGradientChange(dir, gradientColor1, gradientColor2);
                }}>
                  <SelectTrigger id="gradient-direction" className="h-8 text-xs mt-1">
                    <SelectValue placeholder="Direction" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADIENT_DIRECTIONS.map(dir => (
                        <SelectItem key={dir.value} value={dir.value} className="text-xs">{dir.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                  <div>
                      <Label htmlFor="gradient-color-1" className="text-xs">Color 1</Label>
                      <Input id="gradient-color-1" type="color" className="h-8 p-1 w-full mt-1" value={gradientColor1} onChange={(e) => {
                          setGradientColor1(e.target.value);
                          handleCustomGradientChange(gradientDirection, e.target.value, gradientColor2);
                      }} />
                  </div>
                   <div>
                      <Label htmlFor="gradient-color-2" className="text-xs">Color 2</Label>
                      <Input id="gradient-color-2" type="color" className="h-8 p-1 w-full mt-1" value={gradientColor2} onChange={(e) => {
                          setGradientColor2(e.target.value);
                          handleCustomGradientChange(gradientDirection, gradientColor1, e.target.value);
                      }}/>
                  </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}
