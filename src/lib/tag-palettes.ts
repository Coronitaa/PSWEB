
export interface TagColorDefinition {
  background?: string;
  text?: string;
  border?: string;
}

export interface TagColorPalette {
  name: string;
  base: TagColorDefinition;
  hover: TagColorDefinition;
}

// HSL values from globals.css for consistency
const primaryColor = "hsl(var(--primary))";
const primaryForegroundColor = "hsl(var(--primary-foreground))";
const accentColor = "hsl(var(--accent))";
const accentForegroundColor = "hsl(var(--accent-foreground))";
const secondaryColor = "hsl(var(--secondary))";
const secondaryForegroundColor = "hsl(var(--secondary-foreground))";
const mutedColor = "hsl(var(--muted))";
const mutedForegroundColor = "hsl(var(--muted-foreground))";
const destructiveColor = "hsl(var(--destructive))";
const destructiveForegroundColor = "hsl(var(--destructive-foreground))";
const cardColor = "hsl(var(--card))";
const cardForegroundColor = "hsl(var(--card-foreground))";
const borderColor = "hsl(var(--border))";


export const TAG_PALETTES: TagColorPalette[] = [
  {
    name: "Default (Muted)",
    base: { background: mutedColor, text: mutedForegroundColor, border: mutedColor },
    hover: { background: secondaryColor, text: primaryForegroundColor, border: secondaryColor },
  },
  {
    name: "Primary",
    base: { background: primaryColor, text: primaryForegroundColor, border: primaryColor },
    hover: { background: `hsl(var(--primary) / 0.8)`, text: primaryForegroundColor, border: `hsl(var(--primary) / 0.8)` },
  },
  {
    name: "Accent",
    base: { background: accentColor, text: accentForegroundColor, border: accentColor },
    hover: { background: `hsl(var(--accent) / 0.8)`, text: accentForegroundColor, border: `hsl(var(--accent) / 0.8)` },
  },
  {
    name: "Destructive",
    base: { background: destructiveColor, text: destructiveForegroundColor, border: destructiveColor },
    hover: { background: `hsl(var(--destructive) / 0.8)`, text: destructiveForegroundColor, border: `hsl(var(--destructive) / 0.8)` },
  },
  {
    name: "Subtle Pink",
    base: { background: "hsl(330, 80%, 96%)", text: "hsl(330, 70%, 40%)", border: "hsl(330, 80%, 90%)" },
    hover: { background: "hsl(330, 80%, 90%)", text: "hsl(330, 70%, 30%)", border: "hsl(330, 70%, 40%)" },
  },
  {
    name: "Crema",
    base: { background: "#FFF7D4", text: "#A27B5C", border: "#EBD9B4" },
    hover: { background: "#EBD9B4", text: "#65451F", border: "#A27B5C" },
  },
  {
    name: "Durazno (Peach)",
    base: { background: "#FFDAB9", text: "#A0522D", border: "#FFA07A" },
    hover: { background: "#FFA07A", text: "#FFFFFF", border: "#A0522D" },
  },
  {
    name: "Menta (Mint)",
    base: { background: "#C1E1C1", text: "#2E8B57", border: "#8FBC8F" },
    hover: { background: "#8FBC8F", text: "#FFFFFF", border: "#2E8B57" },
  },
  {
    name: "Lavanda (Lavender)",
    base: { background: "#E6E6FA", text: "#6A5ACD", border: "#B0C4DE" },
    hover: { background: "#B0C4DE", text: "#FFFFFF", border: "#6A5ACD" },
  },
  {
    name: "Sky Blue",
    base: { background: "#ADD8E6", text: "#00008B", border: "#87CEEB" },
    hover: { background: "#87CEEB", text: "#FFFFFF", border: "#00008B" },
  },
  {
    name: "Forest Green",
    base: { background: "#228B22", text: "#FFFFFF", border: "#006400" },
    hover: { background: "#006400", text: "#FFFFFF", border: "#006400" },
  },
  {
    name: "Slate Gray",
    base: { background: "#708090", text: "#FFFFFF", border: "#2F4F4F" },
    hover: { background: "#2F4F4F", text: "#FFFFFF", border: "#2F4F4F" },
  },
  {
    name: "Gold",
    base: { background: "#FFD700", text: "#8B4513", border: "#DAA520" },
    hover: { background: "#DAA520", text: "#FFFFFF", border: "#8B4513" },
  },
   {
    name: "Transparent (Text Only)",
    base: { background: "transparent", text: primaryColor, border: "transparent" },
    hover: { background: "hsl(var(--primary) / 0.1)", text: primaryColor, border: "transparent" },
  },
];
