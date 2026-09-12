import { ExternalLink, MapPin, Navigation } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface MapLocation {
  name: string
  address?: string
  lat?: number
  lng?: number
}

/** A house is only mapped when it has real, non-zero coordinates. */
export function hasCoordinates(loc: MapLocation): boolean {
  return typeof loc.lat === 'number' && typeof loc.lng === 'number' && loc.lat !== 0 && loc.lng !== 0
}

export function googleMapsSearchUrl(loc: MapLocation): string {
  const query = hasCoordinates(loc) ? `${loc.lat},${loc.lng}` : (loc.address || loc.name)
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export function googleMapsDirectionsUrl(loc: MapLocation): string {
  const destination = hasCoordinates(loc) ? `${loc.lat},${loc.lng}` : (loc.address || loc.name)
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
}

/**
 * Location preview for a boarding house.
 *
 * Uses the OpenStreetMap embed that the public house-details page already
 * relied on, so no Google Maps API key is required and the page never breaks
 * when one is missing. Distances / travel times are deliberately NOT shown —
 * we do not fabricate them. "Open in Google Maps" hands navigation off
 * externally.
 */
export default function LocationMap({
  location,
  className,
  height = 320,
}: {
  location: MapLocation
  className?: string
  height?: number
}) {
  const mapped = hasCoordinates(location)

  return (
    <div className={cn('overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-card', className)}>
      {mapped ? (
        <iframe
          title={`Map of ${location.name}`}
          className="w-full"
          style={{ height }}
          loading="lazy"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.lng! - 0.012}%2C${location.lat! - 0.008}%2C${location.lng! + 0.012}%2C${location.lat! + 0.008}&layer=mapnik&marker=${location.lat}%2C${location.lng}`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center px-6 py-12 text-center" style={{ minHeight: height }}>
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-50 text-navy-400">
            <MapPin size={22} />
          </span>
          <p className="font-semibold text-navy-800">Map location not available</p>
          <p className="mt-1 max-w-sm text-sm text-ink">
            {location.address
              ? `This boarding house has not published exact coordinates yet. Address: ${location.address}`
              : 'This boarding house has not published coordinates yet.'}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
        <p className="flex min-w-0 items-center gap-1.5 text-xs text-ink">
          <MapPin size={13} className="shrink-0 text-brand-500" />
          <span className="truncate">{location.address || location.name}</span>
        </p>
        <div className="flex items-center gap-2">
          <a
            href={googleMapsSearchUrl(location)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy-700 transition hover:border-brand-300 hover:text-brand-500"
          >
            <ExternalLink size={12} /> Open in Google Maps
          </a>
          <a
            href={googleMapsDirectionsUrl(location)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600"
          >
            <Navigation size={12} /> Get directions
          </a>
        </div>
      </div>
    </div>
  )
}
