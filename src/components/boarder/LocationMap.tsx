import { ExternalLink, Map as MapIcon, MapPin, Navigation, PersonStanding } from 'lucide-react'
import { useState } from 'react'
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
 * Street View, the keyless way.
 *
 * A panorama needs real coordinates — there is no way to look one up from an
 * address alone — so this returns null instead of guessing. The URL uses the
 * Google Maps URLs `map_action=pano` action, which needs no API key and opens
 * the interactive panorama in Google Maps.
 */
export function googleStreetViewUrl(loc: MapLocation): string | null {
  if (!hasCoordinates(loc)) return null
  const viewpoint = encodeURIComponent(`${loc.lat},${loc.lng}`)
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${viewpoint}`
}

/**
 * Panorama for the *inline* Street View tab.
 *
 * The Google Maps Embed API is the only supported way to iframe a panorama and
 * it requires a billed API key, so this returns null unless the app is
 * configured with `VITE_GOOGLE_MAPS_API_KEY`. Without a key the UI falls back
 * to the keyless external link above — the app must keep working with no key.
 */
export function googleStreetViewEmbedUrl(loc: MapLocation): string | null {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined
  if (!key || !hasCoordinates(loc)) return null
  const params = new URLSearchParams({
    key,
    location: `${loc.lat},${loc.lng}`,
    heading: '0',
    pitch: '0',
    fov: '90',
  })
  return `https://www.google.com/maps/embed/v1/streetview?${params.toString()}`
}

/**
 * Location preview for a boarding house.
 *
 * Uses the OpenStreetMap embed that the public house-details page already
 * relied on, so no Google Maps API key is required and the page never breaks
 * when one is missing. Street View is offered alongside it so boarders can
 * recognise the street before travelling. Distances / travel times are
 * deliberately NOT shown — we do not fabricate them. "Open in Google Maps"
 * hands navigation off externally.
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
  const [view, setView] = useState<'map' | 'street'>('map')
  const mapped = hasCoordinates(location)
  const streetViewUrl = googleStreetViewUrl(location)
  const streetViewEmbed = googleStreetViewEmbedUrl(location)

  return (
    <div className={cn('overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-card', className)}>
      {/* Street View is only offered for houses that published coordinates. */}
      {mapped && streetViewUrl && (
        <div className="flex items-center gap-1 border-b border-slate-100 bg-surface p-2">
          <button
            type="button"
            onClick={() => setView('map')}
            aria-pressed={view === 'map'}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
              view === 'map' ? 'bg-white text-navy-800 shadow-sm ring-1 ring-slate-200' : 'text-mut hover:text-navy-800',
            )}
          >
            <MapIcon size={13} /> Map
          </button>
          <button
            type="button"
            onClick={() => setView('street')}
            aria-pressed={view === 'street'}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
              view === 'street' ? 'bg-white text-navy-800 shadow-sm ring-1 ring-slate-200' : 'text-mut hover:text-navy-800',
            )}
          >
            <PersonStanding size={13} /> Street View
          </button>
        </div>
      )}

      {!mapped ? (
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
      ) : view === 'map' ? (
        <iframe
          title={`Map of ${location.name}`}
          className="w-full"
          style={{ height }}
          loading="lazy"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.lng! - 0.012}%2C${location.lat! - 0.008}%2C${location.lng! + 0.012}%2C${location.lat! + 0.008}&layer=mapnik&marker=${location.lat}%2C${location.lng}`}
        />
      ) : streetViewEmbed ? (
        <iframe
          title={`Street View of ${location.name}`}
          className="w-full"
          style={{ height }}
          loading="lazy"
          allowFullScreen
          src={streetViewEmbed}
        />
      ) : (
        streetViewUrl && (
          <div className="flex flex-col items-center justify-center px-6 py-10 text-center" style={{ minHeight: height }}>
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-50 text-navy-500">
              <PersonStanding size={22} />
            </span>
            <p className="font-semibold text-navy-800">Look around before you visit</p>
            <p className="mt-1 max-w-md text-sm text-ink">
              Street View opens in Google Maps at this boarding house&apos;s exact coordinates, so you can see the street,
              the entrance, and nearby landmarks.
            </p>
            <a
              href={streetViewUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-600"
            >
              <PersonStanding size={14} /> Open Street View
            </a>
            <p className="mt-3 max-w-sm text-[11px] text-mut">
              Google only photographs roads it has covered, so some streets may not have imagery yet.
            </p>
          </div>
        )
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
        <p className="flex min-w-0 items-center gap-1.5 text-xs text-ink">
          <MapPin size={13} className="shrink-0 text-brand-500" />
          <span className="truncate">{location.address || location.name}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {streetViewUrl && (
            <a
              href={streetViewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy-700 transition hover:border-brand-300 hover:text-brand-500"
            >
              <PersonStanding size={12} /> Street View
            </a>
          )}
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
