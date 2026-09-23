export type PixelAccessUser = {
  role?: string;
  pixelAccess?: boolean;
  pixel_access?: boolean;
};

export function canAccessPixel(user: PixelAccessUser | null | undefined): boolean {
  return user?.role === "admin" || user?.pixelAccess === true || user?.pixel_access === true;
}
