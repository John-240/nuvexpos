import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-9 h-9" />;

  const cycle = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const label = theme === 'dark' ? 'Oscuro' : theme === 'light' ? 'Claro' : 'Sistema';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycle}
      title={`Tema: ${label} (clic para cambiar)`}
      className="text-slate-300 hover:bg-slate-800 hover:text-white"
    >
      <Icon className="w-4 h-4" />
    </Button>
  );
}