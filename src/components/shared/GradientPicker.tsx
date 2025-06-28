
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
import { Palette, Settings2, History } from 'lucide-react'
import { useMemo, useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { HexColorPicker } from "react-colorful";
import { Separator } from '@/components/ui/separator'


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

const CustomColorPicker = ({
  color,
  onColorChange,
  onCancel,
}: {
  color: string
  onColorChange: (color: string) => void
  onCancel: () => void
}) => {
  const [stagedColor, setStagedColor] = useState(color);

  useEffect(() => {
    setStagedColor(color);
  }, [color]);

  return (
    <div className="space-y-3 p-4 w-full flex flex-col items-center">
      <HexColorPicker color={stagedColor} onChange={setStagedColor} />
      <Input
        id="custom-color-input"
        value={stagedColor}
        className="h-8 mt-2"
        onChange={(e) => setStagedColor(e.currentTarget.value)}
        placeholder="#RRGGBB"
      />
      <div className="flex justify-end gap-2 w-full mt-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={() => onColorChange(stagedColor)}>Confirm</Button>
      </div>
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
    // Grays & White/Black
    '#FFFFFF', '#E5E7EB', '#D1D5DB', '#9CA3AF', '#6B7280', '#4B5563', '#374151', '#1F2937', '#111827', '#000000',
    // Pinks
    '#FCE7F3', '#FBCFE8', '#F9A8D4', '#F472B6', '#EC4899', '#DB2777', '#FFD6EC', '#FFCCE5',
    // Reds
    '#FEE2E2', '#FECACA', '#F87171', '#EF4444', '#DC2626', '#B91C1C', '#FFCCCC', '#FF9999',
    // Oranges
    '#FFF7ED', '#FFEDD5', '#FDBA74', '#FB923C', '#F97316', '#EA580C', '#FFD8B1', '#FFB380',
    // Yellows/Ambers
    '#FEFCE8', '#FEF08A', '#FDE047', '#FACC15', '#EAB308', '#CA8A04', '#FFFACD', '#FFF0AA',
    // Greens
    '#F0FDF4', '#BBF7D0', '#86EFAC', '#4ADE80', '#22C55E', '#16A34A', '#C1F0C1', '#A8E6A1',
    // Blues
    '#EFF6FF', '#BFDBFE', '#93C5FD', '#60A5FA', '#3B82F6', '#2563EB', '#CFE8FF', '#A0CFFF',
    // Purples
    '#F5F3FF', '#DDD6FE', '#C4B5FD', '#A78BFA', '#8B5CF6', '#7C3AED', '#E6CCFF', '#D1B3FF',
    // Teals & Pastel Additions
    '#CCF5F5', '#B2EBF2', '#A7F3D0', '#D1FAE5', '#F3E8FF', '#E0F7FA', '#FCE4EC', '#F8BBD0'
  ];
  
  const gradients = [
    // == Light & Soft ==
    'linear-gradient(to top left, #accbee, #e7f0fd)',
    'linear-gradient(to top left, #d5d4d0, #eeeeec)',
    'linear-gradient(to right, #ffdde1, #ee9ca7)',
    'linear-gradient(to right, #ffecd2, #fcb69f)',
    'linear-gradient(to right, #a1c4fd, #c2e9fb)',
    'linear-gradient(to right, #d4fc79, #96e6a1)',
    'linear-gradient(to right, #e0c3fc, #8ec5fc)',
    'linear-gradient(to top left, #fbc2eb, #a6c1ee)',
    'linear-gradient(to right, #fdfbfb, #ebedee)',
    'linear-gradient(to right, #e0eafc, #cfdef3)',
  
    // == Pastel Inspired ==
    'linear-gradient(to right, #ffd6ec, #e0c3fc)',
    'linear-gradient(to right, #ffe9e9, #fff5e1)',
    'linear-gradient(to right, #d4fc79, #ffe29f)',
    'linear-gradient(to right, #fcb69f, #ffdde1)',
    'linear-gradient(to right, #a0cfff, #cfcfff)',
  
    // == Vibrant & Colorful ==
    'linear-gradient(to right, #fa709a, #fee140)',
    'linear-gradient(to right, #43e97b, #38f9d7)',
    'linear-gradient(to top left, #f953c6, #b91d73)',
    'linear-gradient(to top left, #ee0979, #ff6a00)',
    'linear-gradient(to top left, #F00000, #DC281E)',
    'linear-gradient(to top left, #00c6ff, #0072ff)',
    'linear-gradient(to top left, #4facfe, #00f2fe)',
    'linear-gradient(to top left, #0ba360, #3cba92)',
    'linear-gradient(to top left, #FDFC47, #24FE41)',
    
    // == Dark & Moody ==
    'linear-gradient(to top left, #000000, #434343)',
    'linear-gradient(to right, #0f2027, #2c5364)',
    'linear-gradient(to right, #2c3e50, #4ca1af)',
    'linear-gradient(to right, #614385, #516395)',
    'linear-gradient(to right, #485563, #29323c)',
    'linear-gradient(to right, #232526, #414345)',
    'linear-gradient(to right, #3C3B3F, #605C3C)',
    'linear-gradient(to right, #20002c, #cbb4d4)',
  
    // == Others (Complex/Multi-stop) ==
    'linear-gradient(to top left,#accbee,#e7f0fd)',
    'linear-gradient(to top left,#d5d4d0,#d5d4d0,#eeeeec)',
    'linear-gradient(to top left,#09203f,#537895)',
    'linear-gradient(to top left,#AC32E4,#7918F2,#4801FF)',
    'linear-gradient(to top left,#8a2be2,#0000cd,#228b22,#ccff00)',
    'linear-gradient(to top left,#40E0D0,#FF8C00,#FF0080)',
    'linear-gradient(to top left,#fcc5e4,#fda34b,#ff7882,#c8699e,#7046aa,#0c1db8,#020f75)',
    'linear-gradient(to top left,#ff75c3,#ffa647,#ffe83f,#9fff5b,#70e2ff,#cd93ff)'
  ];

  const defaultTab = useMemo(() => {
    if (value && value.includes('gradient')) return 'gradient'
    return 'solid'
  }, [value])
  
  const [isGradientModalOpen, setIsGradientModalOpen] = useState(false);
  const [gradientDirection, setGradientDirection] = useState<GradientDirection>('to top left');
  const [gradientColor1, setGradientColor1] = useState('#ffffff');
  const [gradientColor2, setGradientColor2] = useState('#000000');
  
  const [recentSolids, setRecentSolids] = useState<string[]>([]);
  const [recentGradients, setRecentGradients] = useState<string[]>([]);
  
  useEffect(() => {
    const storedSolids = localStorage.getItem('pinkstar-recent-solid-colors');
    if (storedSolids) {
        try {
            setRecentSolids(JSON.parse(storedSolids));
        } catch (e) {
            console.error("Failed to parse recent solid colors", e);
        }
    }
    const storedGradients = localStorage.getItem('pinkstar-recent-gradient-colors');
    if (storedGradients) {
         try {
            setRecentGradients(JSON.parse(storedGradients));
        } catch (e) {
            console.error("Failed to parse recent gradient colors", e);
        }
    }
  }, []);

  const addRecent = (color: string, type: 'solid' | 'gradient') => {
    if (type === 'solid') {
        const updatedRecents = [color, ...recentSolids.filter(c => c !== color)].slice(0, 10);
        setRecentSolids(updatedRecents);
        localStorage.setItem('pinkstar-recent-solid-colors', JSON.stringify(updatedRecents));
    } else {
        const updatedRecents = [color, ...recentGradients.filter(g => g !== color)].slice(0, 10);
        setRecentGradients(updatedRecents);
        localStorage.setItem('pinkstar-recent-gradient-colors', JSON.stringify(updatedRecents));
    }
  };

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
        setGradientDirection('to top left');
        setGradientColor1('#ffffff');
        setGradientColor2('#000000');
      }
    }
  }, [isGradientModalOpen, value]);
  
  const handleApplyCustomGradient = () => {
    const newGradient = `linear-gradient(${gradientDirection},${gradientColor1},${gradientColor2})`;
    onChange(newGradient);
    addRecent(newGradient, 'gradient');
    setIsGradientModalOpen(false);
  }

  const solidColorValue = useMemo(() => {
    return value && !value.includes('gradient') ? value : '#FFFFFF';
  }, [value]);
  
  const [solidPickerOpen, setSolidPickerOpen] = useState(false);
  const [gradientPicker1Open, setGradientPicker1Open] = useState(false);
  const [gradientPicker2Open, setGradientPicker2Open] = useState(false);

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

            <TabsContent value="solid" className="mt-0 space-y-2">
                {recentSolids.length > 0 && (
                    <>
                        <div className="flex items-center text-xs text-muted-foreground"><History className="w-3 h-3 mr-1.5" /> Recent Colors</div>
                        <div className="grid grid-cols-10 gap-1">
                            {recentSolids.map((s) => (
                                <div
                                key={s}
                                style={{ background: s }}
                                className="rounded-md h-6 w-6 cursor-pointer active:scale-105 border border-border/20"
                                onClick={() => onChange(s)}
                                />
                            ))}
                        </div>
                        <Separator />
                    </>
                )}
               <div className="grid grid-cols-10 gap-1">
                  <Popover open={solidPickerOpen} onOpenChange={setSolidPickerOpen}>
                    <PopoverTrigger asChild>
                      <button
                        className="w-6 h-6 flex items-center justify-center rounded-md border border-dashed hover:border-primary"
                        title="Custom Color"
                      >
                        <Palette className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0">
                      <CustomColorPicker
                        color={solidColorValue}
                        onColorChange={(newColor) => {
                          onChange(newColor);
                          addRecent(newColor, 'solid');
                          setSolidPickerOpen(false);
                        }}
                        onCancel={() => setSolidPickerOpen(false)}
                      />
                    </PopoverContent>
                  </Popover>

                  {solids.map((s) => (
                    <div
                      key={s}
                      style={{ background: s }}
                      className="rounded-md h-6 w-6 cursor-pointer active:scale-105 border border-border/20"
                      onClick={() => {
                        onChange(s);
                        addRecent(s, 'solid');
                      }}
                    />
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="gradient" className="mt-0 space-y-2">
              {recentGradients.length > 0 && (
                  <>
                      <div className="flex items-center text-xs text-muted-foreground"><History className="w-3 h-3 mr-1.5" /> Recent Gradients</div>
                      <div className="grid grid-cols-10 gap-1">
                          {recentGradients.map((g) => (
                              <div
                                key={g}
                                style={{ background: g }}
                                className="rounded-md h-6 w-6 cursor-pointer active:scale-105"
                                onClick={() => onChange(g)}
                              />
                          ))}
                      </div>
                      <Separator />
                  </>
              )}
              <div className="grid grid-cols-10 gap-1">
                <button
                  className="w-6 h-6 flex items-center justify-center rounded-md border border-dashed hover:border-primary"
                  title="Custom Gradient"
                  onClick={() => setIsGradientModalOpen(true)}
                >
                  <Settings2 className="w-4 h-4 text-muted-foreground" />
                </button>
                {gradients.map((s) => (
                  <div
                    key={s}
                    style={{ background: s }}
                    className="rounded-md h-6 w-6 cursor-pointer active:scale-105"
                    onClick={() => {
                        onChange(s);
                        addRecent(s, 'gradient');
                    }}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>
      
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
                          <Popover open={gradientPicker1Open} onOpenChange={setGradientPicker1Open}>
                              <PopoverTrigger asChild>
                                  <Button variant="ghost" className="h-10 w-12 p-1 border">
                                      <div className="w-full h-full rounded-sm" style={{ background: gradientColor1 }} />
                                  </Button>
                              </PopoverTrigger>
                              <PopoverContent className="p-0 w-auto">
                                  <CustomColorPicker
                                    color={gradientColor1}
                                    onColorChange={(newColor) => {
                                      setGradientColor1(newColor);
                                    }}
                                    onCancel={() => setGradientPicker1Open(false)}
                                  />
                              </PopoverContent>
                          </Popover>
                          <Input id="gradient-color-1-text" className="h-10" value={gradientColor1} onChange={(e) => setGradientColor1(e.target.value)} />
                      </div>
                  </div>
                   <div>
                      <Label htmlFor="gradient-color-2">Color 2</Label>
                      <div className="flex items-center gap-2 mt-1">
                          <Popover open={gradientPicker2Open} onOpenChange={setGradientPicker2Open}>
                              <PopoverTrigger asChild>
                                  <Button variant="ghost" className="h-10 w-12 p-1 border">
                                      <div className="w-full h-full rounded-sm" style={{ background: gradientColor2 }} />
                                  </Button>
                              </PopoverTrigger>
                              <PopoverContent className="p-0 w-auto">
                                  <CustomColorPicker
                                    color={gradientColor2}
                                    onColorChange={(newColor) => {
                                      setGradientColor2(newColor);
                                    }}
                                    onCancel={() => setGradientPicker2Open(false)}
                                  />
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
