
"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface PasswordStrengthMeterProps {
  strength: number; // 0 (none) to 4 (very strong)
}

const strengthLevels = [
  { label: 'Muy Débil', color: 'bg-destructive', width: 'w-1/5' },
  { label: 'Débil', color: 'bg-orange-500', width: 'w-2/5' },
  { label: 'Media', color: 'bg-yellow-500', width: 'w-3/5' },
  { label: 'Fuerte', color: 'bg-sky-500', width: 'w-4/5' },
  { label: 'Muy Fuerte', color: 'bg-green-500', width: 'w-full' },
];

export function PasswordStrengthMeter({ strength }: PasswordStrengthMeterProps) {
  const currentLevel = strengthLevels[Math.max(0, Math.min(strength, strengthLevels.length - 1))];

  return (
    <div className="w-full mt-1">
      <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300 ease-in-out",
            currentLevel.color,
            currentLevel.width
          )}
        />
      </div>
      <p className={cn("text-xs mt-1 transition-colors duration-300", 
        strength === 0 && 'text-muted-foreground',
        strength === 1 && 'text-destructive',
        strength === 2 && 'text-orange-500',
        strength === 3 && 'text-yellow-500',
        strength === 4 && 'text-sky-500',
        strength === 5 && 'text-green-500',
      )}>
        {strength > 0 ? `Fortaleza: ${currentLevel.label}` : 'La contraseña debe tener al menos 6 caracteres.'}
      </p>
    </div>
  );
}
