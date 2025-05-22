import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility function to generate avatar initials and a background color
export function getAvatarData(name: string | undefined | null): { initials: string; bgColor: string } {
  if (!name || name.trim() === "") {
    return { initials: '?', bgColor: 'bg-gray-500' };
  }

  const words = name.split(' ').filter(Boolean);
  let initials = words[0][0].toUpperCase();
  if (words.length > 1) {
    initials += words[words.length - 1][0].toUpperCase();
  } else if (name.length > 1) {
    initials += name[1].toUpperCase();
  }
   if (initials.length === 1 && name.length > 1) { // Ensure two letters if possible for single word names
    initials = name.substring(0,2).toUpperCase();
  }
   if (initials.length === 0 && name.length > 0) { // Fallback if splitting fails but name exists
    initials = name.substring(0, Math.min(2, name.length)).toUpperCase();
  }
   if (initials.length === 0) initials = "?";


  // Simple hash function to get a somewhat consistent color
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32bit integer
  }

  const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 
    'bg-yellow-500', 'bg-lime-500', 'bg-green-500', 
    'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 
    'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 
    'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 
    'bg-pink-500', 'bg-rose-500'
  ];
  const bgColor = colors[Math.abs(hash) % colors.length];

  return { initials, bgColor };
}
